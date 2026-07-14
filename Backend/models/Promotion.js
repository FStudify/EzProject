'use strict';

const mongoose = require('mongoose');
const idVirtual = require('./plugins/idVirtual');

const promotionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  applicablePlans: { type: [String], default: [] }, // e.g. ['pro', 'ultra']
  discountType: { type: String, enum: ['PERCENT', 'FIXED'], required: true },
  discountValue: { type: Number, required: true, min: 0 },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  usageLimit: { type: Number, default: 0 }, // 0 = unlimited
  usagePerUser: { type: Number, default: 0 }, // 0 = unlimited
  usedCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

promotionSchema.plugin(idVirtual);

module.exports = mongoose.model('Promotion', promotionSchema);
