'use strict';
require('./config');
const mongoose = require('mongoose');
const { User, Subscription, Payment } = require('./models');

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ezproject');
    
    const user = await User.findOne({ 
      $or: [
        { username: 'khanhhvbde180098' },
        { email: { $regex: 'khanhhvbde180098', $options: 'i' } }
      ]
    });

    if (user) {
      console.log(`Found user: ${user.username} (${user.email})`);
      
      const deletedSubs = await Subscription.deleteMany({ userId: user._id });
      console.log(`Deleted ${deletedSubs.deletedCount} subscriptions for ${user.username}`);
      
      const deletedPayments = await Payment.deleteMany({ userId: user._id });
      console.log(`Deleted ${deletedPayments.deletedCount} payments for ${user.username}`);
    } else {
      console.log('User khanhhvbde180098 not found.');
    }

    process.exitCode = 0;
  } catch(err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
run();
