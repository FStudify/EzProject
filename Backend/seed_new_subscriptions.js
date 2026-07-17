'use strict';

/**
 * Seed subscriptions for the newly created Pro and Ultra users.
 * Links each user to the corresponding plan (pro1, pro2, pro3, ultra).
 * Subscriptions start on 2026-07-16 and expire according to plan.durationDays.
 */

require('./config/index.js'); // loads environment variables
const mongoose = require('mongoose');
const { User, Plan, Subscription } = require('./models');

const USER_PLAN_MAP = [
  { email: 'nguyenvanan@gmail.com', planKey: 'pro' },
  { email: 'tranthibinh@gmail.com', planKey: 'pro' },
  { email: 'lehoangcuong@gmail.com', planKey: 'pro' },
  { email: 'phamthidung@gmail.com', planKey: 'ultra' },
];

const START_DATE = new Date('2026-07-16');

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ezproject');
    console.info('[seed_new_subscriptions] connected to MongoDB');

    for (const mapping of USER_PLAN_MAP) {
      const user = await User.findOne({ email: mapping.email });
      if (!user) {
        console.warn(`[seed_new_subscriptions] user not found for ${mapping.email}, skipping`);
        continue;
      }
      const plan = await Plan.findOne({ key: mapping.planKey });
      if (!plan) {
        console.warn(`[seed_new_subscriptions] plan not found for key ${mapping.planKey}, skipping`);
        continue;
      }
      const existing = await Subscription.findOne({ userId: user._id, status: 'ACTIVE' });
      if (existing) {
        console.info(`[seed_new_subscriptions] active subscription already exists for ${mapping.email}, skipping`);
        continue;
      }
      const expiresAt = plan.durationDays ? new Date(START_DATE.getTime() + plan.durationDays * 24 * 60 * 60 * 1000) : null;
      const sub = new Subscription({
        userId: user._id,
        planId: plan._id,
        planKey: plan.key,
        planName: plan.name,
        priceVnd: plan.priceVnd,
        status: 'ACTIVE',
        startedAt: START_DATE,
        expiresAt,
        endedAt: null,
        paymentId: null,
      });
      await sub.save();
      console.info(`[seed_new_subscriptions] created subscription for ${mapping.email} -> ${plan.key}`);
    }
  } catch (err) {
    console.error('[seed_new_subscriptions] failed:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.info('[seed_new_subscriptions] disconnected');
  }
}

if (require.main === module) {
  run();
}

module.exports = { run };
