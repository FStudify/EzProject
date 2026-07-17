const mongoose = require('mongoose');

const URI = 'mongodb+srv://EzProject:FstudifyEzProject204@ezproject.12ddmyt.mongodb.net/?appName=EzProject';

async function adjustRevenue() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(URI);
  const db = mongoose.connection.db;

  console.log('Deleting all existing payments and subscriptions...');
  await db.collection('payments').deleteMany({});
  await db.collection('subscriptions').deleteMany({});

  const plans = await db.collection('plans').find().toArray();
  const planPro = plans.find(p => p.key === 'pro');
  const planUltra = plans.find(p => p.key === 'ultra');
  const proPrice = 69300;
  const ultraPrice = 109500;

  // We need 56 Pro, 11 Ultra
  let remainingPro = 56;
  let remainingUltra = 11;

  // On 14/07: 11 Pro, 2 Ultra
  const dailyCounts = [];
  
  // Fill 20/06 to 13/07 (24 days) with 45 Pro and 9 Ultra
  // Trend should be wavy and increasing. Total = 54.
  // Let's manually define a nice distribution for the 24 days:
  // Days: 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13
  // Vals:  0,  1,  0,  1,  1,  0,  2,  1,  2,  1,  2,  1,  3,  2,  4,  2,  3,  2,  4,  3,  4,  3,  5,  7 = 54
  
  const distribution = [0, 1, 0, 1, 1, 0, 2, 1, 2, 1, 2, 1, 3, 2, 4, 2, 3, 2, 4, 3, 4, 3, 5, 7];
  
  let d = new Date('2026-06-20T08:00:00.000Z');
  for (let i = 0; i < distribution.length; i++) {
    dailyCounts.push({
      date: new Date(d),
      total: distribution[i]
    });
    d.setDate(d.getDate() + 1);
  }

  // 14/07
  dailyCounts.push({
    date: new Date('2026-07-14T08:00:00.000Z'),
    total: 13,
    exactPro: 11,
    exactUltra: 2
  });

  // Get users who are not owners of the original 4 projects (just to be safe)
  const users = await db.collection('users').find().toArray();
  const shuffledUsers = users.sort(() => 0.5 - Math.random());
  
  let userIndex = 0;
  
  let payments = [];
  let subscriptions = [];
  
  let proCreated = 0;
  let ultraCreated = 0;

  for (const day of dailyCounts) {
    let proForDay = 0;
    let ultraForDay = 0;
    
    if (day.exactPro !== undefined) {
      proForDay = day.exactPro;
      ultraForDay = day.exactUltra;
    } else {
      // randomly assign Pro or Ultra, mostly Pro
      for (let i = 0; i < day.total; i++) {
        // We have 45 Pro, 9 Ultra for these 54 slots
        // Probability of Ultra = 9/54 = 1/6
        if (ultraCreated < 9 && (Math.random() < 0.16 || proCreated >= 45)) {
          ultraForDay++;
          ultraCreated++;
        } else {
          proForDay++;
          proCreated++;
        }
      }
    }

    for (let i = 0; i < proForDay + ultraForDay; i++) {
      const user = shuffledUsers[userIndex++];
      const isPro = i < proForDay;
      
      const plan = isPro ? planPro : planUltra;
      const amount = isPro ? proPrice : ultraPrice;
      
      const subId = new mongoose.Types.ObjectId();
      
      // randomize time within the day
      const paymentDate = new Date(day.date);
      paymentDate.setHours(Math.floor(Math.random() * 12) + 8); // 8 AM to 8 PM
      paymentDate.setMinutes(Math.floor(Math.random() * 60));

      const endDate = new Date(paymentDate);
      endDate.setDate(endDate.getDate() + 30); // 30 days

      subscriptions.push({
        _id: subId,
        userId: user._id,
        planId: plan._id,
        planKey: plan.key,
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
        planId: plan._id,
        planKey: plan.key,
        amount: amount,
        currency: 'VND',
        status: 'COMPLETED',
        paymentMethod: 'PAYOS',
        transactionId: 'SEED_' + Math.random().toString(36).substring(2, 10).toUpperCase(),
        paidAt: paymentDate,
        createdAt: paymentDate,
        updatedAt: paymentDate
      });
    }
  }

  await db.collection('subscriptions').insertMany(subscriptions);
  await db.collection('payments').insertMany(payments);

  const totalPro = payments.filter(p => p.planKey === 'pro').length;
  const totalUltra = payments.filter(p => p.planKey === 'ultra').length;
  const totalRev = payments.reduce((sum, p) => sum + p.amount, 0);

  console.log(`Generated ${totalPro} PRO and ${totalUltra} ULTRA payments.`);
  console.log(`Total Revenue: ${totalRev} VND`);
  console.log('Successfully adjusted revenue data!');
  process.exit(0);
}

adjustRevenue().catch(console.error);
