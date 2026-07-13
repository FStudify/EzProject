'use strict';

const mongoose = require('mongoose');
const idVirtual = require('./plugins/idVirtual');

/**
 * Subscription — gói đang active của một user.
 *
 * Mỗi user có **tối đa 1** subscription active tại một thời điểm.
 * Khi user mua gói mới:
 *   - Nếu đã có sub active: set `status: 'CANCELLED'`, `endedAt: now`
 *   - Tạo sub mới với status 'ACTIVE', startedAt = now, expiresAt = now + durationDays
 *
 * Lưu ý: gói FREE (key='free') được coi là "default" — thường không tạo Subscription
 * document; chỉ khi user mua trả phí mới tạo.
 */
const subscriptionSchema = new mongoose.Schema({
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
  /** Snapshot plan key lúc đăng ký (phòng trường hợp Plan sau này bị đổi giá/đổi tên). */
  planKey: { type: String, required: true, lowercase: true, trim: true },
  planName: { type: String, required: true },
  priceVnd: { type: Number, required: true },
  status: {
    type: String,
    enum: ['ACTIVE', 'CANCELLED', 'EXPIRED'],
    default: 'ACTIVE',
    index: true,
  },
  startedAt: { type: Date, required: true },
  expiresAt: { type: Date, default: null },
  endedAt: { type: Date, default: null },
  /** Liên kết payment đã kích hoạt subscription này. */
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    default: null,
  },
}, { timestamps: true });

subscriptionSchema.plugin(idVirtual);

subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);
