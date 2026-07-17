const mongoose = require('mongoose');

async function fixSubscriptionDates() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect('mongodb+srv://EzProject:FstudifyEzProject204@ezproject.12ddmyt.mongodb.net/?appName=EzProject');
  const db = mongoose.connection.db;

  const subscriptions = await db.collection('subscriptions').find({}).toArray();
  let updatedCount = 0;

  for (const sub of subscriptions) {
    if (sub.startDate || sub.endDate) {
      await db.collection('subscriptions').updateOne(
        { _id: sub._id },
        { 
          $set: { 
            startedAt: sub.startDate || sub.createdAt, 
            expiresAt: sub.endDate || sub.createdAt
          },
          $unset: { startDate: '', endDate: '' }
        }
      );
      updatedCount++;
    }
  }

  console.log(`Updated ${updatedCount} subscriptions with correct date fields!`);
  process.exit(0);
}

fixSubscriptionDates().catch(console.error);
