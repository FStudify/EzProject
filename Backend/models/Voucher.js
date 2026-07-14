'use strict';

const mongoose = require('mongoose');
const idVirtual = require('./plugins/idVirtual');

const voucherSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
  description: { type: String, default: null },
  discountType: { type: String, enum: ['PERCENT', 'FIXED'], required: true },
  discountValue: { type: Number, required: true, min: 0 },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  maxUsage: { type: Number, default: 0 }, // 0 = unlimited
  currentUsage: { type: Number, default: 0 },
  usagePerUser: { type: Number, default: 1 }, // 0 = unlimited, default 1
  minAmount: { type: Number, default: 0 },
  applicablePlans: { type: [String], default: [] }, // empty = all
  stackableWithSale: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

voucherSchema.plugin(idVirtual);

module.exports = mongoose.model('Voucher', voucherSchema);
