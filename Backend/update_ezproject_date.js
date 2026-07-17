const mongoose = require('mongoose');

const URI = 'mongodb+srv://EzProject:FstudifyEzProject204@ezproject.12ddmyt.mongodb.net/?appName=EzProject';

async function updateEZProject() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(URI);
  const db = mongoose.connection.db;

  const projId = new mongoose.Types.ObjectId('6a44ccd2098654a645b7fd09');
  
  await db.collection('projects').updateOne(
    { _id: projId },
    { $set: { createdAt: new Date('2026-06-11T08:00:00.000Z') } }
  );

  console.log('Successfully updated EZProject date to 11/06/2026!');
  process.exit(0);
}

updateEZProject().catch(console.error);
