'use strict';

const { Plan, Payment, Subscription, User, Promotion, Voucher } = require('../models');
const payosService = require('../services/payos.service');
const config = require('../config');
const { errors } = require('../middlewares/errorHandler');

/**
 * Trả về frontend URL dùng cho PayOS return/cancel.
 * Cho phép override qua env PAYOS_RETURN_URL / PAYOS_CANCEL_URL, NHƯNG
 * phải đảm bảo URL đó trỏ về FRONTEND — không phải chính backend này.
 *
 * Nếu override trỏ về backend host (loopback) → fallback về
 * FRONTEND_URL + path mặc định. Đây là phòng thủ chống "Route not found"
 * khi dev copy nhầm `http://localhost:3000/...` vào env thay vì FRONTEND_URL.
 */
function frontendUrl(path) {
  const origin = (Array.isArray(config.cors.origin) ? config.cors.origin[0] : config.cors.origin) || '';
  return `${origin}${path}`;
}

/**
 * Trả về true nếu `url` trỏ về chính backend (loopback), tức là URL đó
 * không phải frontend và sẽ gây 404 khi PayOS redirect user về.
 *
 * `backendHint` (optional): req.headers.host của request hiện tại — đây là
 * hostname user (PayOS server) sẽ gọi tới. Nếu target URL cùng host → sai.
 */
function isBackendSelfUrl(url, backendHint) {
  if (!url) return false;
  try {
    const target = new URL(url);
    // Nếu có backendHint (host:port của request hiện tại), dùng để so sánh.
    if (backendHint && target.host === backendHint) return true;
    // Fallback: localhost/127.0.0.1 chắc chắn là dev backend → reject.
    const loopback = ['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(target.hostname);
    return loopback;
  } catch {
    return false;
  }
}

function resolveRedirectUrl(kind, defaultPath, req) {
  const backendHint = req?.headers?.host;
  if (kind === 'return' && config.payos.returnUrl) {
    return isBackendSelfUrl(config.payos.returnUrl, backendHint)
      ? frontendUrl(defaultPath)
      : config.payos.returnUrl;
  }
  if (kind === 'cancel' && config.payos.cancelUrl) {
    return isBackendSelfUrl(config.payos.cancelUrl, backendHint)
      ? frontendUrl(defaultPath)
      : config.payos.cancelUrl;
  }
  return frontendUrl(defaultPath);
}

/**
 * Tạo orderCode ngẫu nhiên và chắc chắn không trùng với payment PENDING hiện có.
 *
 * @returns {Promise<number>} orderCode unique
 */
async function freshOrderCode() {
  // Thử tối đa 6 lần — xác suất trùng cực thấp nhưng vẫn an toàn.
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = payosService.generateOrderCode();
    const exists = await Payment.exists({ orderCode: String(code) });
    if (!exists) return code;
  }
  throw new Error('Cannot generate unique orderCode');
}

/**
 * Chuẩn hoá payment record (ẩn rawPayload, project id fields).
 */
function sanitizePayment(doc) {
  if (!doc) return doc;
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  delete obj.rawPayload;
  obj.id = obj.id || obj._id?.toString();
  return obj;
}

// ── Helper: Get active promotions for plans ────────────────────
async function getActivePromotions() {
  const now = new Date();
  return Promotion.find({
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  }).lean();
}

async function calculateEffectivePrice(plan, user) {
  const now = new Date();
  let basePrice = plan.priceVnd;
  let packageSaleDiscount = 0;
  let packageSaleActive = false;

  // 1. Check Package-level Sale
  if (
    plan.saleIsActive &&
    (!plan.saleStartAt || plan.saleStartAt <= now) &&
    (!plan.saleEndAt || plan.saleEndAt >= now) &&
    (!plan.saleUsageLimit || plan.saleUsedCount < plan.saleUsageLimit)
  ) {
    packageSaleActive = true;
    if (plan.saleType === 'percent') {
      packageSaleDiscount = Math.floor(basePrice * (plan.saleValue / 100));
    } else if (plan.saleType === 'fixed_price') {
      packageSaleDiscount = Math.max(0, basePrice - plan.saleValue);
    }
  }

  let priceAfterPackageSale = Math.max(0, basePrice - packageSaleDiscount);

  // 2. Check Promotion
  const promotions = await getActivePromotions();
  let bestPromoDiscount = 0;
  let bestPromo = null;

  for (const promo of promotions) {
    if (promo.applicablePlans && promo.applicablePlans.length > 0 && !promo.applicablePlans.includes(plan.key)) {
      continue;
    }
    // Check usage limits
    if (promo.usageLimit > 0 && promo.usedCount >= promo.usageLimit) {
      continue;
    }
    if (user && promo.usagePerUser > 0) {
      const { PromotionUsage } = require('../models');
      const userUsage = await PromotionUsage.countDocuments({ promotionId: promo._id, userId: user._id });
      if (userUsage >= promo.usagePerUser) continue;
    }

    let discount = 0;
    if (promo.discountType === 'PERCENT') {
      discount = Math.floor(priceAfterPackageSale * (promo.discountValue / 100));
    } else {
      discount = promo.discountValue;
    }

    if (discount > bestPromoDiscount) {
      bestPromoDiscount = discount;
      bestPromo = promo;
    }
  }

  let finalDiscount = packageSaleDiscount + bestPromoDiscount;
  let currentPrice = Math.max(0, basePrice - finalDiscount);

  return {
    originalPrice: basePrice,
    currentPrice,
    packageSaleActive,
    packageSaleDiscount,
    promoDiscount: bestPromoDiscount,
    promotion: bestPromo,
  };
}

// ── GET /plans — public list of active plans ─────────────────
exports.listPlans = async (req, res, next) => {
  try {
    const plans = await Plan.find({ isActive: true })
      .sort({ sortOrder: 1, priceVnd: 1 })
      .lean();

    const user = req.user ? await User.findById(req.user.id).lean() : null;

    const plansWithPricing = await Promise.all(plans.map(async plan => {
      const pricing = await calculateEffectivePrice(plan, user);
      return {
        ...plan,
        ...pricing,
      };
    }));

    res.json({ success: true, data: { plans: plansWithPricing } });
  } catch (err) {
    next(err);
  }
};

// ── GET /payments/me/current — subscription hiện tại ────────
exports.getMyCurrentSubscription = async (req, res, next) => {
  try {
    const sub = await Subscription.findOne({
      userId: req.user.id,
      status: 'ACTIVE',
    })
      .sort({ startedAt: -1 })
      .populate('planId', 'key name priceVnd currency durationDays')
      .lean();
    res.json({ success: true, data: { subscription: sub } });
  } catch (err) {
    next(err);
  }
};

// ── POST /payments/voucher/validate ───────────────────────────
exports.validateVoucher = async (req, res, next) => {
  try {
    const { planKey, code } = req.body;
    if (!planKey || !code) throw errors.BadRequest('Thiếu planKey hoặc code');

    const plan = await Plan.findOne({ key: planKey.toLowerCase(), isActive: true }).lean();
    if (!plan) throw errors.NotFound('Plan không hợp lệ');

    const voucher = await Voucher.findOne({ code: code.toUpperCase(), isActive: true }).lean();
    if (!voucher) throw errors.BadRequest('Voucher không tồn tại hoặc đã bị khóa');

    const now = new Date();
    if (now < voucher.startDate || now > voucher.endDate) {
      throw errors.BadRequest('Voucher không trong thời gian sử dụng');
    }
    if (voucher.maxUsage > 0 && voucher.currentUsage >= voucher.maxUsage) {
      throw errors.BadRequest('Voucher đã hết lượt sử dụng');
    }
    if (voucher.applicablePlans && voucher.applicablePlans.length > 0 && !voucher.applicablePlans.includes(plan.key)) {
      throw errors.BadRequest('Voucher không áp dụng cho gói này');
    }

    const user = req.user ? await User.findById(req.user.id).lean() : null;

    if (user && voucher.usagePerUser > 0) {
      const { VoucherUsage } = require('../models');
      const userUsageCount = await VoucherUsage.countDocuments({ voucherId: voucher._id, userId: user._id });
      if (userUsageCount >= voucher.usagePerUser) {
        throw errors.BadRequest(`Bạn chỉ được sử dụng voucher này tối đa ${voucher.usagePerUser} lần`);
      }
    }

    // Tính giá sau khuyến mãi tự động trước (nếu có)
    const pricing = await calculateEffectivePrice(plan, user);
    let priceAfterPromo = pricing.currentPrice;

    const hasOtherDiscounts = pricing.packageSaleDiscount > 0 || pricing.promoDiscount > 0;
    if (hasOtherDiscounts && voucher.stackableWithSale === false) {
      throw errors.BadRequest('Voucher này không được sử dụng cùng với các chương trình khuyến mãi khác');
    }

    if (voucher.minAmount > 0 && priceAfterPromo < voucher.minAmount) {
      throw errors.BadRequest(`Voucher chỉ áp dụng cho đơn từ ${voucher.minAmount.toLocaleString('vi-VN')}đ`);
    }

    let voucherDiscount = 0;
    if (voucher.discountType === 'PERCENT') {
      voucherDiscount = Math.floor(priceAfterPromo * (voucher.discountValue / 100));
    } else {
      voucherDiscount = voucher.discountValue;
    }
    voucherDiscount = Math.min(voucherDiscount, priceAfterPromo);

    res.json({
      success: true,
      data: {
        isValid: true,
        discount: voucherDiscount,
        finalPrice: priceAfterPromo - voucherDiscount,
        voucher,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /payments/create ─────────────────────────────────────
exports.createPayment = async (req, res, next) => {
  try {
    const { planKey, voucherCode } = req.body;
    const plan = await Plan.findOne({ key: planKey.toLowerCase(), isActive: true }).lean();
    if (!plan) throw errors.NotFound('Plan');
    if (plan.priceVnd <= 0) {
      throw errors.BadRequest('Gói miễn phí không cần thanh toán');
    }

    const user = await User.findById(req.user.id).lean();
    if (!user) throw errors.NotFound('User');

    // 1. Lấy subscription hiện tại
    const currentSub = await Subscription.findOne({
      userId: req.user.id,
      status: 'ACTIVE',
    }).sort({ startedAt: -1 }).lean();

    const oldPlanKey = currentSub ? currentSub.planKey : 'free';
    const newPlanKey = plan.key;
    let action = 'NEW';

    // 2. Validate Business Logic
    if (oldPlanKey === 'ultra' && newPlanKey === 'pro') {
      throw errors.BadRequest('Bạn đang sử dụng ULTRA. Không thể mua gói thấp hơn.');
    } else if (oldPlanKey === newPlanKey) {
      action = 'RENEW';
    } else if (oldPlanKey !== 'free') {
      action = 'UPGRADE';
    }

    // 3. Xử lý Pending Payments cũ
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const existingPending = await Payment.find({
      userId: req.user.id,
      status: 'PENDING',
      checkoutUrl: { $ne: null },
    }).sort({ createdAt: -1 });

    for (const pending of existingPending) {
      // Nếu là cùng gói và chưa hết hạn (10 phút) -> Reuse
      if (pending.planKey === newPlanKey && pending.createdAt >= tenMinutesAgo && pending.expiresAt && new Date(pending.expiresAt) > new Date()) {
        return res.json({
          success: true,
          data: {
            payment: sanitizePayment(pending),
            checkoutUrl: pending.checkoutUrl,
            reused: true,
          },
        });
      } else {
        // Khác gói hoặc đã quá 10 phút -> Cancel
        pending.status = 'CANCELLED';
        pending.cancelledAt = new Date();
        await pending.save();
        try {
          await payosService.cancelPaymentLink(pending.orderCode, 'System auto cancelled due to new payment');
        } catch (err) {
          console.warn('[Payment] Auto cancel payos link failed (might be already cancelled):', err.message);
        }
      }
    }

    // 4. Calculate Final Price with Promotion and Voucher
    const pricing = await calculateEffectivePrice(plan, user);
    const basePrice = pricing.originalPrice;
    let promoDiscount = pricing.packageSaleDiscount + pricing.promoDiscount;
    let usedPromoId = pricing.promotion ? pricing.promotion._id : null;
    let voucherDiscount = 0;
    let finalVoucherCode = null;

    let currentAmount = pricing.currentPrice;

    // Apply Voucher
    if (voucherCode && currentAmount > 0) {
      const voucher = await Voucher.findOne({ code: voucherCode.toUpperCase(), isActive: true });
      if (voucher) {
        const now = new Date();
        const isValidDate = now >= voucher.startDate && now <= voucher.endDate;
        const isValidUsage = voucher.maxUsage === 0 || voucher.currentUsage < voucher.maxUsage;
        const isValidPlan = !voucher.applicablePlans.length || voucher.applicablePlans.includes(plan.key);
        const isValidMinAmount = currentAmount >= voucher.minAmount;

        let isValidUserLimit = true;
        if (voucher.usagePerUser > 0) {
          const { VoucherUsage } = require('../models');
          const userUsageCount = await VoucherUsage.countDocuments({ voucherId: voucher._id, userId: user._id });
          if (userUsageCount >= voucher.usagePerUser) isValidUserLimit = false;
        }

        const hasOtherDiscounts = promoDiscount > 0;
        const isValidStacking = !hasOtherDiscounts || voucher.stackableWithSale;

        if (isValidDate && isValidUsage && isValidPlan && isValidMinAmount && isValidUserLimit && isValidStacking) {
          if (voucher.discountType === 'PERCENT') {
            voucherDiscount = Math.floor(currentAmount * (voucher.discountValue / 100));
          } else {
            voucherDiscount = voucher.discountValue;
          }
          voucherDiscount = Math.min(voucherDiscount, currentAmount);
          finalVoucherCode = voucher.code;
        } else {
          throw errors.BadRequest('Voucher không hợp lệ hoặc không thể áp dụng');
        }
      }
    }

    const finalAmount = Math.max(0, currentAmount - voucherDiscount);

    if (finalAmount <= 0) {
      throw errors.BadRequest('Sau khi giảm giá, tổng tiền bằng 0. Hệ thống hiện chưa hỗ trợ nâng cấp miễn phí qua PayOS.');
    }

    const orderCode = await freshOrderCode();

    // Note: Voucher and Promotion usages will be recorded in payosWebhook when payment is PAID.
    const totalDiscountAmount = basePrice - finalAmount;

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const returnUrl = resolveRedirectUrl(
      'return',
      `/payment/result?status=success&orderCode=${orderCode}&planKey=${plan.key}`,
      req,
    );
    const cancelUrl = resolveRedirectUrl(
      'cancel',
      `/payment/result?status=cancelled&orderCode=${orderCode}&planKey=${plan.key}`,
      req,
    );

    const description = `EZProject - ${plan.name}`.slice(0, 25);

    const payosResult = await payosService.createPaymentLink({
      orderCode,
      amount: finalAmount,
      description,
      returnUrl,
      cancelUrl,
      buyerName: user.fullName || user.username,
      buyerEmail: user.email,
    });

    // payos.service.createPaymentLink có thể return null/undefined nếu PayOS
    // trả response OK nhưng body rỗng (edge case). Guard để không crash ở dòng sau.
    if (!payosResult || !payosResult.checkoutUrl) {
      console.error('[Payment] payos returned empty result:', payosResult);
      throw errors.BadRequest('PayOS không trả về checkoutUrl. Vui lòng thử lại.');
    }

    const paymentDoc = await Payment.create({
      orderCode: String(payosResult.orderCode ?? orderCode),
      userId: req.user.id,
      planId: plan._id,
      planKey: plan.key,
      oldPlanKey,
      action,
      planName: plan.name,
      amount: finalAmount,
      originalPrice: basePrice,
      discountAmount: totalDiscountAmount,
      voucherCode: finalVoucherCode,
      promotionId: usedPromoId,
      currency: plan.currency || 'VND',
      status: 'PENDING',
      provider: 'PAYOS',
      checkoutUrl: payosResult.checkoutUrl,
      expiresAt,
      rawPayload: payosResult,
    });

    console.info('[Payment] created', {
      orderCode: paymentDoc.orderCode,
      userId: req.user.id,
      planKey: plan.key,
      amount: finalAmount,
    });

    res.json({
      success: true,
      data: {
        payment: sanitizePayment(paymentDoc.toObject()),
        checkoutUrl: payosResult.checkoutUrl,
        reused: false,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /payments/me/history — payment history of current user
exports.getMyPaymentHistory = async (req, res, next) => {
  try {
    const { status, page, limit } = req.query;
    const filter = { userId: req.user.id };
    if (status) filter.status = status;
    const total = await Payment.countDocuments(filter);
    const items = await Payment.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    res.json({
      success: true,
      data: {
        items: items.map((p) => sanitizePayment(p)),
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /payments/me/status/:orderCode — kiểm tra trạng thái
// FALLBACK POLLING: nếu local status = PENDING, gọi thẳng PayOS
// `getPaymentLinkInfo` để lấy status mới nhất, rồi apply tương tự webhook.
// Đây là phòng thủ khi webhook PayOS không tới được backend (vd: dev local
// không có public URL, hoặc webhook chưa đăng ký trên PayOS dashboard).
exports.getMyPaymentStatus = async (req, res, next) => {
  try {
    const payment = await Payment.findOne({
      orderCode: req.params.orderCode,
      userId: req.user.id,
    });
    if (!payment) throw errors.NotFound('Payment');

    // Chỉ poll khi payment còn PENDING và chưa quá expiresAt.
    if (
      payment.status === 'PENDING' &&
      payment.expiresAt &&
      new Date(payment.expiresAt) > new Date()
    ) {
      try {
        const payosData = await payosService.getPaymentLinkInfo(payment.orderCode);
        const remoteStatus = String(payosData?.status || '').toUpperCase();
        if (remoteStatus === 'PAID') {
          payment.status = 'PAID';
          payment.paidAt = new Date();
          payment.transactionId = payosData?.transactions?.[0]?.reference || payment.transactionId;
          payment.rawPayload = payosData;
          await payment.save();
          await applySubscription(payment);
          console.info('[Payment] PAID via polling fallback', { orderCode: payment.orderCode });
        } else if (remoteStatus === 'CANCELLED') {
          payment.status = 'CANCELLED';
          payment.cancelledAt = new Date();
          payment.rawPayload = payosData;
          await payment.save();
          console.info('[Payment] CANCELLED via polling fallback', { orderCode: payment.orderCode });
        } else if (remoteStatus === 'EXPIRED') {
          payment.status = 'FAILED';
          payment.failedAt = new Date();
          payment.rawPayload = payosData;
          await payment.save();
          console.info('[Payment] EXPIRED via polling fallback', { orderCode: payment.orderCode });
        }
        // 'PENDING' / rỗng → giữ nguyên, không update DB.
      } catch (pollErr) {
        // PayOS call fail → không được block trả response cho user.
        // Trả về local status (vẫn là PENDING), user sẽ thử polling lần sau.
        console.warn('[Payment] polling PayOS failed:', pollErr.message);
      }
    }

    const out = typeof payment.toObject === 'function' ? payment.toObject() : payment;
    res.json({ success: true, data: { payment: sanitizePayment(out) } });
  } catch (err) {
    next(err);
  }
};

// ── POST /payments/me/cancel/:orderCode — user huỷ trước khi thanh toán
exports.cancelMyPayment = async (req, res, next) => {
  try {
    const payment = await Payment.findOne({
      orderCode: req.params.orderCode,
      userId: req.user.id,
    });
    if (!payment) throw errors.NotFound('Payment');
    if (payment.status !== 'PENDING') {
      return res.json({ success: true, data: { payment: sanitizePayment(payment.toObject()) } });
    }

    try {
      await payosService.cancelPaymentLink(payment.orderCode, 'User cancelled');
    } catch (err) {
      // Không rollback payment local — webhook vẫn có thể đến trễ.
      console.warn('[Payment] payos cancel returned error but local state updated:', err.message);
    }

    payment.status = 'CANCELLED';
    payment.cancelledAt = new Date();
    await payment.save();

    res.json({ success: true, data: { payment: sanitizePayment(payment.toObject()) } });
  } catch (err) {
    next(err);
  }
};

// ── POST /payments/webhook — PayOS server push ────────────────
// Public endpoint — KHÔNG requireAuth; verify bằng signature.
exports.payOsWebhook = async (req, res) => {
  try {
    const ok = payosService.verifyWebhookData(req.body);
    if (!ok) {
      console.warn('[Payment] webhook signature verification failed');
      return res.status(200).json({ success: false, code: 'INVALID_SIGNATURE' });
    }

    const data = req.body?.data || req.body;
    const orderCode = data?.orderCode ? String(data.orderCode) : null;
    if (!orderCode) {
      console.warn('[Payment] webhook missing orderCode');
      return res.status(200).json({ success: false, code: 'MISSING_ORDER' });
    }

    const payment = await Payment.findOne({ orderCode });
    if (!payment) {
      console.warn('[Payment] webhook orderCode not found:', orderCode);
      return res.status(200).json({ success: false, code: 'UNKNOWN_ORDER' });
    }

    // Idempotency: skip khi payment đã ở trạng thái cuối.
    if (['PAID', 'CANCELLED', 'FAILED'].includes(payment.status)) {
      console.info('[Payment] webhook ignored (already settled):', orderCode, payment.status);
      return res.status(200).json({ success: true });
    }

    const payosStatus = String(data?.desc || '').toLowerCase();
    // PayOS desc examples: "Thanh toán thành công", "Hủy giao dịch", "Expired".
    if (/thanh toán thành công|success|paid/i.test(payosStatus)) {
      payment.status = 'PAID';
      payment.paidAt = new Date();
      payment.transactionId = data.reference || data.transactionId || payment.transactionId;
      payment.rawPayload = data;
      await payment.save();
      
      // Record usages for voucher and promotion now that payment is PAID
      if (payment.voucherCode) {
        const Voucher = require('../models/Voucher');
        const { VoucherUsage } = require('../models');
        const voucher = await Voucher.findOne({ code: payment.voucherCode });
        if (voucher) {
          await VoucherUsage.create({
            voucherId: voucher._id,
            userId: payment.userId,
            orderCode: payment.orderCode
          });
          voucher.currentUsage += 1;
          await voucher.save();
        }
      }
      if (payment.promotionId) {
        const Promotion = require('../models/Promotion');
        const { PromotionUsage } = require('../models');
        const promo = await Promotion.findById(payment.promotionId);
        if (promo) {
          await PromotionUsage.create({
            promotionId: promo._id,
            userId: payment.userId,
            orderCode: payment.orderCode
          });
          promo.usedCount += 1;
          await promo.save();
        }
      }

      await applySubscription(payment);
      console.info('[Payment] PAID via webhook', { orderCode, paymentId: payment._id });
    } else if (/hủy|cancel|cancelled/i.test(payosStatus)) {
      payment.status = 'CANCELLED';
      payment.cancelledAt = new Date();
      payment.rawPayload = data;
      await payment.save();
      console.info('[Payment] CANCELLED via webhook', { orderCode });
    } else if (/failed|thất bại|error/i.test(payosStatus)) {
      payment.status = 'FAILED';
      payment.failedAt = new Date();
      payment.rawPayload = data;
      await payment.save();
      console.info('[Payment] FAILED via webhook', { orderCode });
    } else {
      console.warn('[Payment] webhook unknown desc, kept PENDING:', { orderCode, desc: data?.desc });
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('[Payment] webhook processing error:', err);
    // PayOS yêu cầu trả 200 để không retry liên tục. Log chi tiết để debug.
    res.status(200).json({ success: false });
  }
};

/**
 * Áp dụng subscription mới dựa trên payment đã PAID.
 * - Cancel tất cả sub ACTIVE hiện tại của user.
 * - Tạo sub mới ACTIVE với expiresAt = now + durationDays.
 */
async function applySubscription(payment) {
  const plan = await Plan.findById(payment.planId).lean();
  if (!plan) {
    console.error('[Payment] plan disappeared:', payment.planKey);
    return;
  }

  // Cancel current active subscription(s).
  await Subscription.updateMany(
    { userId: payment.userId, status: 'ACTIVE' },
    {
      $set: {
        status: 'CANCELLED',
        endedAt: new Date(),
      },
    },
  );

  const now = new Date();
  const expiresAt = plan.durationDays
    ? new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000)
    : null;

  await Subscription.create({
    userId: payment.userId,
    planId: payment.planId,
    planKey: payment.planKey,
    planName: payment.planName,
    priceVnd: payment.amount,
    status: 'ACTIVE',
    startedAt: now,
    expiresAt,
    paymentId: payment._id,
  });

  console.info('[Payment] subscription applied', {
    userId: payment.userId,
    planKey: payment.planKey,
    expiresAt,
  });
}

exports.applySubscription = applySubscription; // exported for re-use if needed
