'use strict';

const mongoose = require('mongoose');
const idVirtual = require('./plugins/idVirtual');

/**
 * Payment — đơn thanh toán qua PayOS (hoặc provider khác trong tương lai).
 *
 * Vòng đời:
 *   PENDING  → user vừa tạo order, chưa thanh toán
 *   PENDING  → có thể chuyển sang CANCELLED khi user cancel hoặc expiresAt quá hạn
 *   PAID     → PayOS webhook xác nhận thành công (idempotent — chỉ apply 1 lần)
 *   FAILED   → webhook báo fail hoặc user close trang
 *   REFUNDED → (optional) admin refund
 *
 * Ghi chú bảo mật:
 *   - `amount`, `currency`, `planKey` đều lưu SNAPSHOT từ server lúc tạo payment.
 *     Client KHÔNG được phép gửi giá trị này — server tra Plan/DB để xác định.
 *   - `orderCode` là PayOS order code — duy nhất toàn hệ thống (unique index).
 *     Khi user tạo lần 2 (re-click "Buy") trong khi PENDING, server trả về
 *     bản ghi hiện có thay vì tạo mới.
 *   - `paidAt`, `cancelledAt`, `failedAt` ghi nhận thời điểm chuyển trạng thái.
 */
const paymentSchema = new mongoose.Schema({
  orderCode: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    required: true,
  },
  planKey: { type: String, required: true, lowercase: true, trim: true },
  oldPlanKey: { type: String, lowercase: true, trim: true, default: null },
  action: {
    type: String,
    enum: ['NEW', 'RENEW', 'UPGRADE', 'DOWNGRADE'],
    default: 'NEW',
  },
  planName: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'VND' },
  status: {
    type: String,
    enum: ['PENDING', 'PAID', 'CANCELLED', 'FAILED', 'REFUNDED', 'EXPIRED'],
    default: 'PENDING',
    index: true,
  },
  provider: {
    type: String,
    enum: ['PAYOS', 'MANUAL'],
    default: 'PAYOS',
  },
  /** PayOS transaction id sau khi thanh toán thành công. */
  transactionId: { type: String, default: null },
  /** Checkout URL do PayOS trả về. */
  checkoutUrl: { type: String, default: null },
  /** Lưu raw payload cuối cùng nhận từ PayOS (webhook hoặc return) để debug. */
  rawPayload: { type: mongoose.Schema.Types.Mixed, default: null },
  /** Khi nào đơn hết hạn (PayOS mặc định 15 phút từ lúc tạo). */
  expiresAt: { type: Date, default: null },
  paidAt: { type: Date, default: null },
  cancelledAt: { type: Date, default: null },
  failedAt: { type: Date, default: null },
}, { timestamps: true });

paymentSchema.plugin(idVirtual);

paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ status: 1, expiresAt: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
