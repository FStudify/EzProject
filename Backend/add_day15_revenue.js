const mongoose = require('mongoose');

const URI = 'mongodb+srv://EzProject:FstudifyEzProject204@ezproject.12ddmyt.mongodb.net/?appName=EzProject';

async function addDay15Revenue() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(URI);
  const db = mongoose.connection.db;

  const plans = await db.collection('plans').find().toArray();
  const planPro = plans.find(p => p.key === 'pro');
  const proPrice = 69300;

  // Get 5 users who don't have subscriptions yet
  // We can just grab some random users, it doesn't strictly matter as long as they exist
  const users = await db.collection('users').aggregate([{ $sample: { size: 5 } }]).toArray();
  
  let payments = [];
  let subscriptions = [];
  
  for (let i = 0; i < 5; i++) {
    const user = users[i];
    const subId = new mongoose.Types.ObjectId();
    
    // July 15, randomly between 8 AM and 4 PM
    const paymentDate = new Date('2026-07-15T08:00:00.000Z');
    paymentDate.setHours(Math.floor(Math.random() * 8) + 8);
    paymentDate.setMinutes(Math.floor(Math.random() * 60));

    const endDate = new Date(paymentDate);
    endDate.setDate(endDate.getDate() + 30); // 30 days

    subscriptions.push({
      _id: subId,
      userId: user._id,
      planId: planPro._id,
      planKey: planPro.key,
      status: 'ACTIVE',
      startDate: paymentDate,
      endDate: endDate,
      createdAt: paymentDate,
      updatedAt: paymentDate
    });

    payments.push({
      _id: new mongoose.Types.ObjectId(),
      orderCode: Math.floor(Math.random() * 90000000) + 10000000,
      userId: user._id,
      subscriptionId: subId,
      planId: planPro._id,
      planKey: planPro.key,
      amount: proPrice,
      currency: 'VND',
      status: 'PAID',
      paymentMethod: 'PAYOS',
      transactionId: 'SEED_' + Math.random().toString(36).substring(2, 10).toUpperCase(),
      paidAt: paymentDate,
      createdAt: paymentDate,
      updatedAt: paymentDate
    });
  }

  await db.collection('subscriptions').insertMany(subscriptions);
  await db.collection('payments').insertMany(payments);

  console.log('Added 5 PRO payments for July 15!');
  process.exit(0);
}

addDay15Revenue().catch(console.error);
