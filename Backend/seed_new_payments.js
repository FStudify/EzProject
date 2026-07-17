'use strict';

require('./config');
const mongoose = require('mongoose');
const { User, Plan, Subscription, Payment } = require('./models');

const USER_EMAILS = [
  'nguyenvanan@gmail.com',
  'tranthibinh@gmail.com',
  'lehoangcuong@gmail.com',
  'phamthidung@gmail.com'
];

const PAID_DATE = new Date('2026-07-16T12:00:00.000Z');

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ezproject');
    console.info('[seed_new_payments] connected to MongoDB');

    for (const email of USER_EMAILS) {
      const user = await User.findOne({ email });
      if (!user) {
        console.warn(`[seed_new_payments] user not found: ${email}`);
        continue;
      }

      const subscription = await Subscription.findOne({ userId: user._id, status: 'ACTIVE' });
      if (!subscription) {
        console.warn(`[seed_new_payments] active subscription not found for: ${email}`);
        continue;
      }

      if (subscription.paymentId) {
        console.info(`[seed_new_payments] payment already exists for: ${email}`);
        continue;
      }

      const plan = await Plan.findById(subscription.planId);
      if (!plan) {
        console.warn(`[seed_new_payments] plan not found for: ${email}`);
        continue;
      }

      // Generate a random order code
      const orderCode = Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000).toString();

      const payment = new Payment({
        orderCode,
        userId: user._id,
        planId: plan._id,
        planKey: plan.key,
        planName: plan.name,
        amount: plan.priceVnd,
        originalPrice: plan.priceVnd,
        status: 'PAID',
        provider: 'MANUAL',
        action: 'NEW',
        paidAt: PAID_DATE,
        createdAt: PAID_DATE,
        updatedAt: PAID_DATE
      });

      await payment.save();

      // Update subscription to link the payment
      subscription.paymentId = payment._id;
      await subscription.save();

      console.info(`[seed_new_payments] created payment for: ${email} -> ${plan.priceVnd} VND`);
    }

    console.info('[seed_new_payments] done');
    process.exitCode = 0;
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();
