'use strict';

/**
 * Seed default subscription plans.
 *
 * Idempotent — chạy nhiều lần vẫn an toàn (upsert theo `key`).
 *
 * Usage: `node seed/seedPlans.js`
 */

require('../config');
const mongoose = require('mongoose');
const config = require('../config');
const { Plan } = require('../models');

const DEFAULT_PLANS = [
  {
    key: 'free',
    name: 'Free',
    description: 'Gói miễn phí cho cá nhân muốn trải nghiệm EZProject.',
    priceVnd: 0,
    currency: 'VND',
    durationDays: null,
    popular: false,
    sortOrder: 0,
    isActive: true,
  },
  {
    key: 'pro',
    name: 'Pro',
    description: 'Phù hợp nhóm dự án nhỏ cần AI suggestions và timeline.',
    priceVnd: 99000,
    currency: 'VND',
    durationDays: 30,
    popular: true,
    sortOrder: 1,
    isActive: true,
  },
  {
    key: 'ultra',
    name: 'Ultra',
    description: 'Đầy đủ tính năng Premium cho đội lớn và doanh nghiệp.',
    priceVnd: 219000,
    currency: 'VND',
    durationDays: 30,
    popular: false,
    sortOrder: 2,
    isActive: true,
  },
];

async function run() {
  try {
    await mongoose.connect(config.db.uri);
    console.info('[seedPlans] connected to MongoDB');

    for (const plan of DEFAULT_PLANS) {
      await Plan.updateOne({ key: plan.key }, { $set: plan }, { upsert: true });
      console.info(`[seedPlans] upserted plan "${plan.key}" (${plan.priceVnd.toLocaleString('vi-VN')}đ)`);
    }

    console.info('[seedPlans] done');
  } catch (err) {
    console.error('[seedPlans] failed:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  run();
}

module.exports = { run, DEFAULT_PLANS };
