const mongoose = require('mongoose');

async function test() {
  await mongoose.connect('mongodb+srv://EzProject:FstudifyEzProject204@ezproject.12ddmyt.mongodb.net/?appName=EzProject');
  const db = mongoose.connection.db;

  const testIdStr = '6a44c7e8318ef558b4a11011';
  const testIdObj = new mongoose.Types.ObjectId(testIdStr);

  await db.collection('test_coll').insertOne({ _id: testIdObj, name: 'test' });

  const keepProjectIds = [ testIdStr ];
  const keepProjectIdsObj = [ testIdObj ];

  const res = await db.collection('test_coll').deleteMany({
    $and: [
      { _id: { $nin: keepProjectIdsObj } },
      { _id: { $nin: keepProjectIds } }
    ]
  });

  console.log('Deleted count:', res.deletedCount);
  const left = await db.collection('test_coll').find().toArray();
  console.log('Left:', left.length);
  
  await db.collection('test_coll').drop();
  process.exit(0);
}

test();
