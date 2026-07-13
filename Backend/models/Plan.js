'use strict';

const mongoose = require('mongoose');
const idVirtual = require('./plugins/idVirtual');

/**
 * Plan — định nghĩa gói dịch vụ (Free/Pro/Ultra ...).
 *
 * Plans là global, không thuộc project nào. Pricing & currency lưu server-side
 * để client không thể thao túng. Field `key` là định danh ổn định dùng trong
 * code (Frontend gửi `key` lên server để tạo Payment — server tra cứu lại
 * Plan để xác định amount).
 */
const planSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: null },
  priceVnd: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'VND' },
  /** Số ngày subscription — null = không giới hạn (gói Free). */
  durationDays: { type: Number, default: null },
  /** Đánh dấu gói nổi bật hiển thị badge "Phổ biến" ở landing/pricing. */
  popular: { type: Boolean, default: false },
  /** Sắp xếp hiển thị. */
  sortOrder: { type: Number, default: 0 },
  /** Có đang active cho phép subscribe hay không. */
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

planSchema.plugin(idVirtual);

module.exports = mongoose.model('Plan', planSchema);
