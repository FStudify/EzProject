const mongoose = require('mongoose');

async function fixProvider() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect('mongodb+srv://EzProject:FstudifyEzProject204@ezproject.12ddmyt.mongodb.net/?appName=EzProject');
  const db = mongoose.connection.db;

  const res = await db.collection('payments').updateMany(
    {},
    { 
      $set: { provider: 'PAYOS' },
      $unset: { paymentMethod: '' }
    }
  );

  console.log(`Fixed provider for ${res.modifiedCount} payments!`);
  process.exit(0);
}

fixProvider().catch(console.error);
