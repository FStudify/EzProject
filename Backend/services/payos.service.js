'use strict';

const crypto = require('crypto');
const config = require('../config');
const { errors: errorFactory } = require('../middlewares/errorHandler');

/**
 * PayOS service — tương tác với PayOS Merchant API.
 *
 * Tài liệu: https://payos.vn/docs/api/
 *
 * Flow:
 *   createPaymentLink() → POST /v2/payment-requests → trả { checkoutUrl, orderCode, ... }
 *   getPaymentLinkInfo() → GET /v2/payment-requests/:orderCode
 *   cancelPaymentLink()  → POST /v2/payment-requests/:orderCode/cancel
 *   verifyWebhookData()  → verify HMAC SHA-256 của payload
 *
 * Signature:
 *   - Tạo query string từ object theo thứ tự key alphabetic, value dạng string.
 *     Sort các cặp `key=value` rồi nối `&`. HMAC với checksumKey.
 *   - Khi verify: so khớp chuỗi `signature` trong payload với HMAC tự tính.
 */
function sortObj(obj) {
  if (!obj || typeof obj !== 'object') return {};
  const sorted = {};
  Object.keys(obj).sort().forEach((key) => {
    sorted[key] = obj[key];
  });
  return sorted;
}

function toQueryString(obj) {
  // PayOS spec: sort keys alphabetically, build "key=value&..." với value
  // RAW (không encode). Các ký tự đặc biệt (&, ?, =, space) trong value sẽ
  // xuất hiện raw trong chuỗi — PayOS dùng cách parse riêng khi verify.
  return Object.keys(obj)
    .filter((k) => obj[k] !== undefined && obj[k] !== null && obj[k] !== '')
    .sort()
    .map((k) => `${k}=${String(obj[k])}`)
    .join('&');
}

/**
 * Tạo signature theo PayOS spec.
 * @param {Record<string, unknown>} data — object fields cần ký (loại bỏ 'signature' trước khi truyền vào)
 * @param {string} [key] — checksum key override (test only)
 * @returns {string} hex HMAC SHA-256
 */
function signData(data, key) {
  const checksumKey = key || config.payos.checksumKey;
  if (!checksumKey) throw errorFactory.BadRequest('PayOS checksum key not configured');
  const sorted = sortObj(data);
  const qs = toQueryString(sorted);
  return crypto.createHmac('sha256', checksumKey).update(qs).digest('hex');
}

/**
 * Verify webhook payload — tính signature từ các trường không phải `signature`
 * rồi so sánh với `data.signature` (constant-time).
 *
 * @param {Record<string, unknown>} data — raw payload từ PayOS
 * @returns {boolean}
 */
function verifyWebhookData(data) {
  try {
    if (!data || typeof data !== 'object') return false;
    const expected = data.signature;
    if (typeof expected !== 'string' || !expected) return false;
    const copy = { ...data };
    delete copy.signature;
    const computed = signData(copy);
    if (computed.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(expected, 'hex'));
  } catch (err) {
    console.error('[PayOS] verifyWebhookData failed:', err.message);
    return false;
  }
}

/**
 * Internal fetch helper — gọi PayOS API với auth header.
 *
 * @param {string} path — e.g. '/v2/payment-requests'
 * @param {object} [opts]
 * @param {string} [opts.method='POST']
 * @param {object} [opts.body]
 * @param {object} [opts.query]
 * @returns {Promise<object>}
 */
async function callPayos(path, opts = {}) {
  if (!config.payos.configured) {
    throw errorFactory.BadRequest('PayOS chưa được cấu hình trên server');
  }
  const method = opts.method || 'POST';
  let url = `${config.payos.baseUrl}${path}`;
  if (opts.query) {
    const qs = toQueryString(opts.query);
    if (qs) url += `?${qs}`;
  }
  const headers = {
    'Content-Type': 'application/json',
    'x-client-id': config.payos.clientId,
    'x-api-key': config.payos.apiKey,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, {
      method,
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
    const text = await response.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { raw: text };
    }
    if (!response.ok) {
      const msg = body?.message || body?.desc || `PayOS API error ${response.status}`;
      console.error('[PayOS] call failed:', { path, status: response.status, body });
      throw errorFactory.BadRequest(msg);
    }
    // PayOS trả về { code: '00', desc: 'success', data: {...} }.
    // Một số trường hợp PayOS trả HTTP 200 nhưng business code != '00'
    // (vd signature không hợp lệ, orderCode trùng, amount không hợp lệ...).
    // Phải check code === '00' trước khi return data, không thì controller
    // nhận null và crash ở dòng payosResult.checkoutUrl.
    if (body && typeof body === 'object' && 'code' in body && body.code !== '00') {
      const msg = body.desc || body.message || `PayOS error code ${body.code}`;
      console.error('[PayOS] business error:', { path, body });
      throw errorFactory.BadRequest(msg);
    }
    // PayOS trả về { code: '00', desc: 'success', data: {...} } — chỉ return data.
    if (body && typeof body === 'object' && 'data' in body) return body.data;
    return body;
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error('[PayOS] request timeout:', path);
      throw errorFactory.BadRequest('PayOS request timeout');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Tạo payment link.
 *
 * @param {object} params
 * @param {number} params.orderCode — số nguyên dương, unique
 * @param {number} params.amount — VND
 * @param {string} params.description — mô tả hiển thị trên PayOS
 * @param {string} params.returnUrl
 * @param {string} params.cancelUrl
 * @param {string} [params.buyerName]
 * @param {string} [params.buyerEmail]
 * @param {string} [params.buyerPhone]
 * @returns {Promise<{checkoutUrl: string, paymentLinkId: string, qrCode: string, orderCode: number}>}
 */
async function createPaymentLink(params) {
  // Guard sớm: nếu PayOS chưa configured, throw BadRequest với message
  // thân thiện thay vì để signData tính signature với key rỗng rồi gửi request.
  if (!config.payos.configured) {
    throw errorFactory.BadRequest('PayOS chưa được cấu hình trên server');
  }
  // Theo PayOS spec (https://payos.vn/docs/api/#tag/Tao-lien-ket-thanh-toan):
  // signature CHỈ được tính trên 5 trường BẮT BUỘC, sorted alphabetically.
  // KHÔNG bao gồm buyerName, buyerEmail, buyerPhone, expiredAt, items, signature.
  // Nếu include các field optional vào signature, PayOS sẽ trả code=201
  // "Mã kiểm tra(signature) không hợp lệ".
  const requiredForSig = {
    amount: params.amount,
    cancelUrl: params.cancelUrl,
    description: params.description,
    orderCode: params.orderCode,
    returnUrl: params.returnUrl,
  };
  const signature = signData(requiredForSig);

  // Body gửi đi bao gồm cả optional fields (không bị ảnh hưởng bởi signature).
  const data = {
    ...requiredForSig,
    signature,
    ...(params.buyerName ? { buyerName: params.buyerName } : {}),
    ...(params.buyerEmail ? { buyerEmail: params.buyerEmail } : {}),
    ...(params.buyerPhone ? { buyerPhone: params.buyerPhone } : {}),
  };
  return callPayos('/v2/payment-requests', { method: 'POST', body: data });
}

async function getPaymentLinkInfo(orderCode) {
  return callPayos(`/v2/payment-requests/${orderCode}`, { method: 'GET' });
}

async function cancelPaymentLink(orderCode, reason) {
  const body = reason ? { cancellationReason: reason } : undefined;
  return callPayos(`/v2/payment-requests/${orderCode}/cancel`, { method: 'POST', body });
}

/**
 * Tạo orderCode ngẫu nhiên & duy nhất — số nguyên 6 chữ số an toàn cho PayOS.
 *
 * PayOS spec: orderCode là số nguyên dương. Tránh trùng bằng Date.now() (millisecond)
 * cuối + random đuôi.
 */
function generateOrderCode() {
  const now = Date.now();
  const tail = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  // Lấy 12 chữ số cuối của timestamp + 3 random = 15 chữ số.
  return Number(`${String(now).slice(-12)}${tail}`);
}

module.exports = {
  signData,
  verifyWebhookData,
  createPaymentLink,
  getPaymentLinkInfo,
  cancelPaymentLink,
  generateOrderCode,
};
