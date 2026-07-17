const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://EzProject:FstudifyEzProject204@ezproject.12ddmyt.mongodb.net/?appName=EzProject')
  .then(async () => {
    const db = mongoose.connection.db;
    const userIdString = '6a41ecfdba2491bec8005aca';
    const userIdObj = new mongoose.Types.ObjectId(userIdString);
    
    // Check both string and ObjectId just in case
    const projects = await db.collection('projects').find({
      $or: [
        { ownerId: userIdString },
        { ownerId: userIdObj },
        { 'members.userId': userIdString },
        { 'members.userId': userIdObj }
      ]
    }).toArray();

    console.log(`Tìm thấy ${projects.length} dự án liên quan đến ezproject.work43@gmail.com:\n`);
    
    for (const proj of projects) {
      console.log(`- Project: ${proj.name} (ID: ${proj._id})`);
      console.log(`  + OwnerId: ${proj.ownerId}`);
      
      const memberIds = (proj.members || []).map(m => m.userId);
      console.log(`  + Member IDs: ${memberIds.join(', ')}`);
      console.log('');
    }
    process.exit(0);
  });
