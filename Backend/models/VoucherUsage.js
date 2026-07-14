'use strict';

const mongoose = require('mongoose');
const idVirtual = require('./plugins/idVirtual');

const voucherUsageSchema = new mongoose.Schema({
  voucherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  orderCode: { type: String, required: true },
  usedAt: { type: Date, default: Date.now },
}, { timestamps: true });

voucherUsageSchema.index({ voucherId: 1, userId: 1 });
voucherUsageSchema.plugin(idVirtual);

module.exports = mongoose.model('VoucherUsage', voucherUsageSchema);
