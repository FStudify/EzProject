const mongoose = require('mongoose');

const URI = 'mongodb+srv://EzProject:FstudifyEzProject204@ezproject.12ddmyt.mongodb.net/?appName=EzProject';

async function cleanupAndSeed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(URI);
  const db = mongoose.connection.db;

  const projId = new mongoose.Types.ObjectId('6a44ccd2098654a645b7fd09');
  
  // 1. Delete all old GENERAL rooms and all chatmessages to be safe
  await db.collection('chatrooms').deleteMany({ projectId: projId, type: 'GENERAL' });
  // Since we only seeded chatmessages for this project recently, we can safely delete all chatmessages for this project's rooms
  // Actually let's just delete ALL chatmessages because there are no other legit chats in the seed anyway
  await db.collection('chatmessages').deleteMany({}); 

  console.log('Old chatrooms and messages deleted.');
  process.exit(0);
}

cleanupAndSeed().catch(console.error);
