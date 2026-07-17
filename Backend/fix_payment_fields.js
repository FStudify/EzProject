const mongoose = require('mongoose');

async function fixPaymentFields() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect('mongodb+srv://EzProject:FstudifyEzProject204@ezproject.12ddmyt.mongodb.net/?appName=EzProject');
  const db = mongoose.connection.db;

  const payments = await db.collection('payments').find({}).toArray();
  let updatedCount = 0;

  for (const payment of payments) {
    let planName = 'Free';
    if (payment.planKey === 'pro') planName = 'Pro';
    if (payment.planKey === 'ultra') planName = 'Ultra';

    // Randomize action slightly, but mostly NEW
    const r = Math.random();
    let action = 'NEW';
    if (r > 0.8) action = 'RENEW';
    if (r > 0.9 && payment.planKey === 'ultra') action = 'UPGRADE';

    await db.collection('payments').updateOne(
      { _id: payment._id },
      { $set: { planName: planName, action: action } }
    );
    updatedCount++;
  }

  console.log(`Updated ${updatedCount} payments with planName and action!`);
  process.exit(0);
}

fixPaymentFields().catch(console.error);
