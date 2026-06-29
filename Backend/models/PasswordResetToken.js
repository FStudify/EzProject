'use strict';

const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Token dùng để đặt lại mật khẩu qua email.
 *
 * - `tokenHash` chỉ lưu SHA-256 của token (token thô chỉ gửi qua email 1 lần).
 *   → Nếu DB bị lộ, attacker không dùng được token đã hash để reset.
 * - `expiresAt` có TTL index → Mongo tự xoá document khi hết hạn.
 * - `usedAt`  đánh dấu token đã dùng (single-use).
 */
const passwordResetTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  tokenHash: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  usedAt: {
    type: Date,
    default: null,
  },
  // IP + UA ghi lại cho mục đích audit (không bắt buộc)
  ipAddress: { type: String, default: null },
  userAgent: { type: String, default: null },
}, { timestamps: true });

// TTL index — Mongo tự xoá khi expiresAt < now
passwordResetTokenSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 },
);

passwordResetTokenSchema.statics.hashToken = function hashToken(raw) {
  return crypto.createHash('sha256').update(String(raw)).digest('hex');
};

module.exports = mongoose.model('PasswordResetToken', passwordResetTokenSchema);