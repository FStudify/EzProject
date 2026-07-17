const mongoose = require('mongoose');

async function fixSubscriptionFields() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect('mongodb+srv://EzProject:FstudifyEzProject204@ezproject.12ddmyt.mongodb.net/?appName=EzProject');
  const db = mongoose.connection.db;

  const subscriptions = await db.collection('subscriptions').find({}).toArray();
  let updatedCount = 0;

  for (const sub of subscriptions) {
    let planName = 'Free';
    let priceVnd = 0;
    if (sub.planKey === 'pro') {
      planName = 'Pro';
      priceVnd = 69300;
    } else if (sub.planKey === 'ultra') {
      planName = 'Ultra';
      priceVnd = 109500;
    }

    await db.collection('subscriptions').updateOne(
      { _id: sub._id },
      { $set: { planName: planName, priceVnd: priceVnd } }
    );
    updatedCount++;
  }

  console.log(`Updated ${updatedCount} subscriptions with planName and priceVnd!`);
  process.exit(0);
}

fixSubscriptionFields().catch(console.error);
