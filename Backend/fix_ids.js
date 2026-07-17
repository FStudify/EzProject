const mongoose = require('mongoose');

const URI = 'mongodb+srv://EzProject:FstudifyEzProject204@ezproject.12ddmyt.mongodb.net/?appName=EzProject';

async function fixIds() {
  await mongoose.connect(URI);
  const db = mongoose.connection.db;

  const projects = await db.collection('projects').find({}).toArray();

  for (const p of projects) {
    let needsUpdate = false;
    
    // Fix ownerId
    if (typeof p.ownerId === 'string') {
      p.ownerId = new mongoose.Types.ObjectId(p.ownerId);
      needsUpdate = true;
    }
    
    // Fix members.userId
    if (p.members && Array.isArray(p.members)) {
      for (const m of p.members) {
        if (typeof m.userId === 'string') {
          m.userId = new mongoose.Types.ObjectId(m.userId);
          needsUpdate = true;
        }
      }
    }
    
    if (needsUpdate) {
      await db.collection('projects').updateOne(
        { _id: p._id },
        { $set: { ownerId: p.ownerId, members: p.members } }
      );
      console.log(`Fixed Project ${p.name}`);
    }
  }

  console.log('Finished fixing IDs!');
  process.exit(0);
}

fixIds();
