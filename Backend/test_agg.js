const mongoose = require('mongoose');

async function test() {
  await mongoose.connect('mongodb+srv://EzProject:FstudifyEzProject204@ezproject.12ddmyt.mongodb.net/?appName=EzProject');
  const db = mongoose.connection.db;
  const match = { 'members.userId': new mongoose.Types.ObjectId('6a44c4bab6896738e7b06071') };
  
  const projects = await db.collection('projects').aggregate([
      { $match: match },
      { $lookup: { from: 'users', localField: 'ownerId', foreignField: '_id', as: 'owner' } },
      { $unwind: '$owner' }
  ]).toArray();
  
  console.log('Aggregated projects:', projects.length);
  if(projects.length > 0) {
     console.log('First project name:', projects[0].name);
  }
  process.exit(0);
}

test();
