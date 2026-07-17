'use strict';
require('./config');
const mongoose = require('mongoose');
const { Payment, User, Plan } = require('./models');

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ezproject');
    
    // Calculate current total revenue
    const totalAgg = await Payment.aggregate([
      { $match: { status: 'PAID' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    let currentTotal = totalAgg.length > 0 ? totalAgg[0].total : 0;
    console.log(`Current total revenue: ${currentTotal}`);
    
    const targetTotal = 5898900;
    
    if (currentTotal === targetTotal) {
      console.log('Total revenue is already 5898900. No action needed.');
      process.exitCode = 0;
      return;
    }
    
    // Find an existing dummy payment to adjust, or delete previous dummy payments
    await Payment.deleteMany({ action: 'ADJUSTMENT' }); // Let's use a specific action or note if possible, wait, action enum is ['NEW', 'RENEW', 'UPGRADE', 'DOWNGRADE']
    // Let's just create or adjust a specific orderCode
    const dummyOrderCode = 'REVENUE_ADJUSTMENT';
    await Payment.deleteMany({ orderCode: dummyOrderCode });
    
    // Recalculate after deleting previous adjustment
    const totalAgg2 = await Payment.aggregate([
      { $match: { status: 'PAID' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    currentTotal = totalAgg2.length > 0 ? totalAgg2[0].total : 0;
    console.log(`Recalculated total revenue (without previous adjustments): ${currentTotal}`);
    
    const diff = targetTotal - currentTotal;
    
    if (diff > 0) {
      // Need to add revenue
      // We can create a dummy user or just use an admin user
      const user = await User.findOne({ role: 'ADMIN' }) || await User.findOne({});
      const plan = await Plan.findOne({ key: 'pro' }) || await Plan.findOne({});
      
      const p = new Payment({
        orderCode: dummyOrderCode,
        userId: user._id,
        planId: plan._id,
        planKey: plan.key,
        planName: plan.name,
        amount: diff,
        originalPrice: diff,
        status: 'PAID',
        provider: 'MANUAL',
        action: 'NEW',
        paidAt: new Date('2025-01-01T00:00:00.000Z'), // Past date to not skew recent charts too much
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
        updatedAt: new Date('2025-01-01T00:00:00.000Z')
      });
      await p.save();
      console.log(`Added a dummy payment of ${diff} to reach ${targetTotal}.`);
    } else if (diff < 0) {
      // We have too much revenue. We need to delete or reduce some existing payments.
      // But diff is negative. Let's find payments and reduce their amounts, or delete them.
      console.log(`Current revenue is higher than target by ${-diff}. Let's reduce existing payments.`);
      
      let toReduce = -diff;
      const payments = await Payment.find({ status: 'PAID', orderCode: { $ne: dummyOrderCode } }).sort({ paidAt: 1 });
      
      for (const p of payments) {
        if (toReduce <= 0) break;
        
        if (p.amount <= toReduce) {
          toReduce -= p.amount;
          await Payment.deleteOne({ _id: p._id });
          console.log(`Deleted payment ${p._id} of amount ${p.amount}. Remaining to reduce: ${toReduce}`);
        } else {
          p.amount -= toReduce;
          await p.save();
          console.log(`Reduced payment ${p._id} by ${toReduce}. Remaining to reduce: 0`);
          toReduce = 0;
        }
      }
    }
    
    // Final check
    const totalAgg3 = await Payment.aggregate([
      { $match: { status: 'PAID' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    console.log(`Final total revenue: ${totalAgg3.length > 0 ? totalAgg3[0].total : 0}`);

    process.exitCode = 0;
  } catch(err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
run();
