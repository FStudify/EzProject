'use strict';

const mongoose = require('mongoose');
const idVirtual = require('./plugins/idVirtual');

const promotionUsageSchema = new mongoose.Schema({
  promotionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Promotion', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  orderCode: { type: String, required: true },
  usedAt: { type: Date, default: Date.now },
}, { timestamps: true });

promotionUsageSchema.index({ promotionId: 1, userId: 1 });
promotionUsageSchema.plugin(idVirtual);

module.exports = mongoose.model('PromotionUsage', promotionUsageSchema);
