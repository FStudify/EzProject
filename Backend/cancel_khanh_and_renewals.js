'use strict';
require('./config');
const mongoose = require('mongoose');
const { User, Subscription, Payment } = require('./models');

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ezproject');
    
    // 1. Cancel Pro plan of user khanhhvbde180098
    const user = await User.findOne({ 
      $or: [
        { username: 'khanhhvbde180098' },
        { email: { $regex: 'khanhhvbde180098', $options: 'i' } }
      ]
    });

    if (user) {
      console.log(`Found user: ${user.username} (${user.email})`);
      const activeSub = await Subscription.findOne({ userId: user._id, status: 'ACTIVE' });
      if (activeSub) {
        activeSub.status = 'CANCELLED';
        activeSub.endedAt = new Date();
        await activeSub.save();
        console.log(`Cancelled active subscription (${activeSub.planKey}) for ${user.username}`);
      } else {
        console.log(`User ${user.username} does not have an active subscription.`);
      }
    } else {
      console.log('User khanhhvbde180098 not found.');
    }

    // 2. Cancel all renewals today
    // Since we deleted RENEW payments in the previous step, maybe there are still subscriptions that were updated today.
    // Let's check subscriptions that were started today (if renewal creates a new sub)
    // Or just all RENEW payments today if any still exist.
    const startOfToday = new Date('2026-07-17T00:00:00.000+07:00');
    const endOfToday = new Date('2026-07-17T23:59:59.999+07:00');
    
    const renewPayments = await Payment.find({
      action: 'RENEW',
      paidAt: { $gte: startOfToday, $lte: endOfToday }
    });
    console.log(`Found ${renewPayments.length} RENEW payments today.`);
    
    for (const p of renewPayments) {
      p.status = 'CANCELLED';
      p.cancelledAt = new Date();
      await p.save();
      console.log(`Cancelled RENEW payment ${p._id}`);
      
      // Also cancel the subscription linked to this payment if needed
      const sub = await Subscription.findOne({ paymentId: p._id, status: 'ACTIVE' });
      if (sub) {
        sub.status = 'CANCELLED';
        sub.endedAt = new Date();
        await sub.save();
        console.log(`Cancelled subscription ${sub._id} linked to RENEW payment ${p._id}`);
      }
    }

    // Wait, if I deleted the RENEW payments previously using deleteMany, they won't be found here.
    // Are there any subscriptions that started today with planKey 'pro' or 'ultra' that are NOT the 4 new users?
    const newUsersEmails = ['nguyenvanan@gmail.com', 'tranthibinh@gmail.com', 'lehoangcuong@gmail.com', 'phamthidung@gmail.com'];
    const newUsers = await User.find({ email: { $in: newUsersEmails } });
    const newUserIds = newUsers.map(u => u._id.toString());
    
    const subsToday = await Subscription.find({
      startedAt: { $gte: startOfToday, $lte: endOfToday },
      status: 'ACTIVE'
    });
    
    for (const sub of subsToday) {
      if (!newUserIds.includes(sub.userId.toString())) {
        // If it's started today and not one of the 4 new users, maybe it's a renewal?
        console.log(`Found active sub ${sub._id} started today for user ${sub.userId}. Cancelling...`);
        sub.status = 'CANCELLED';
        sub.endedAt = new Date();
        await sub.save();
      }
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
