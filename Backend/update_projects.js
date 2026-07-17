const mongoose = require('mongoose');

const URI = 'mongodb+srv://EzProject:FstudifyEzProject204@ezproject.12ddmyt.mongodb.net/?appName=EzProject';

async function updateProjects() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(URI);
  const db = mongoose.connection.db;

  const keepProjectIds = [
    new mongoose.Types.ObjectId('6a44c7e8318ef558b4a11011'),
    new mongoose.Types.ObjectId('6a44c7e8318ef558b4a11026'),
    new mongoose.Types.ObjectId('6a44ccd2098654a645b7fd09'),
    new mongoose.Types.ObjectId('6a451077db9c096f5c821c73')
  ];

  console.log('Fetching all users...');
  const users = await db.collection('users').find({}).toArray();
  const userIds = users.map(u => u._id);

  console.log('Fetching seeded projects...');
  const projects = await db.collection('projects').find({ _id: { $nin: keepProjectIds } }).toArray();

  console.log(`Updating ${projects.length} projects...`);
  
  let batch = db.collection('projects').initializeUnorderedBulkOp();
  let count = 0;

  for (const p of projects) {
    const ownerId = p.ownerId;
    // We want 3-6 members total (including owner)
    const numTotalMembers = Math.floor(Math.random() * 4) + 4; // 4 to 7 members
    
    // Pick random users to add
    const currentMembers = p.members.map(m => m.userId.toString());
    const newMembersList = [...p.members];
    
    let attempts = 0;
    while (newMembersList.length < numTotalMembers && attempts < 20) {
      const randUser = userIds[Math.floor(Math.random() * userIds.length)];
      if (!currentMembers.includes(randUser.toString())) {
        currentMembers.push(randUser.toString());
        newMembersList.push({
          userId: randUser,
          role: Math.random() < 0.2 ? 'VICE_LEADER' : 'MEMBER',
          isOwner: false,
          joinedAt: p.createdAt // they joined when project was created
        });
      }
      attempts++;
    }

    batch.find({ _id: p._id }).updateOne({
      $set: {
        status: 'ACTIVE',
        members: newMembersList
      }
    });

    count++;
    if (count % 100 === 0) {
      await batch.execute();
      batch = db.collection('projects').initializeUnorderedBulkOp();
    }
  }

  if (count % 100 !== 0) {
    await batch.execute();
  }

  console.log('Successfully updated projects!');
  process.exit(0);
}

updateProjects().catch(console.error);
