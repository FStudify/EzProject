const mongoose = require('mongoose');

const URI = 'mongodb+srv://EzProject:FstudifyEzProject204@ezproject.12ddmyt.mongodb.net/?appName=EzProject';

async function updatePayments() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(URI);
  const db = mongoose.connection.db;

  const plans = await db.collection('plans').find().toArray();
  const planPro = plans.find(p => p.key === 'pro');
  const planUltra = plans.find(p => p.key === 'ultra');

  const proDiscounted = Math.round(planPro.priceVnd * (100 - (planPro.saleValue || 0)) / 100);
  const ultraDiscounted = Math.round(planUltra.priceVnd * (100 - (planUltra.saleValue || 0)) / 100);

  console.log(`Setting PRO price to ${proDiscounted}, ULTRA price to ${ultraDiscounted}`);

  const proResult = await db.collection('payments').updateMany(
    { planKey: 'pro' },
    { $set: { amount: proDiscounted } }
  );

  const ultraResult = await db.collection('payments').updateMany(
    { planKey: 'ultra' },
    { $set: { amount: ultraDiscounted } }
  );

  console.log(`Updated ${proResult.modifiedCount} PRO payments and ${ultraResult.modifiedCount} ULTRA payments.`);
  
  process.exit(0);
}

updatePayments().catch(console.error);
