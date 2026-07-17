'use strict';
require('./config');
const mongoose = require('mongoose');
const { Payment } = require('./models');

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ezproject');
    const startOfToday = new Date('2026-07-17T00:00:00.000+07:00');
    const endOfToday = new Date('2026-07-17T23:59:59.999+07:00');
    
    console.log(`Deleting RENEW payments from ${startOfToday.toISOString()} to ${endOfToday.toISOString()}`);

    const result = await Payment.deleteMany({
      action: 'RENEW',
      paidAt: { $gte: startOfToday, $lte: endOfToday }
    });

    console.log(`Deleted ${result.deletedCount} RENEW payments today.`);
    process.exitCode = 0;
  } catch(err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
run();
