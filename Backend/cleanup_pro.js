'use strict';
require('./config');
const mongoose = require('mongoose');
const { Plan, Subscription, User } = require('./models');

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ezproject');
    
    // 1. Delete pro1, pro2, pro3 plans
    await Plan.deleteMany({ key: { $in: ['pro1', 'pro2', 'pro3'] } });
    console.info('Deleted pro1, pro2, pro3 plans');

    // 2. Find the newly created users
    const users = await User.find({ email: { $in: [
      'nguyenvanan@gmail.com',
      'tranthibinh@gmail.com',
      'lehoangcuong@gmail.com',
      'phamthidung@gmail.com'
    ]}});

    const userIds = users.map(u => u._id);

    // 3. Delete any subscriptions for these users
    await Subscription.deleteMany({ userId: { $in: userIds } });
    console.info('Deleted old subscriptions for these users');

    process.exitCode = 0;
  } catch(err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
run();
