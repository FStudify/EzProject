const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://EzProject:FstudifyEzProject204@ezproject.12ddmyt.mongodb.net/?appName=EzProject')
  .then(async () => {
    const db = mongoose.connection.db;
    const userId = new mongoose.Types.ObjectId('6a41ecfdba2491bec8005aca');
    
    // Find projects where user is owner or member
    const projects = await db.collection('projects').find({
      $or: [
        { owner: userId },
        { 'members.user': userId }
      ]
    }).toArray();

    console.log(`Tìm thấy ${projects.length} dự án liên quan đến ezproject.work43@gmail.com:\n`);
    
    for (const proj of projects) {
      console.log(`- Project: ${proj.name} (ID: ${proj._id})`);
      console.log(`  + Owner: ${proj.owner}`);
      
      const memberIds = proj.members ? proj.members.map(m => m.user) : [];
      if (memberIds.length > 0) {
        const users = await db.collection('users').find({ _id: { $in: memberIds } }).toArray();
        console.log(`  + Thành viên (${memberIds.length}):`);
        for (const member of users) {
          console.log(`    * ${member.fullName} (${member.email}) - ID: ${member._id}`);
        }
      } else {
        console.log(`  + Không có thành viên nào.`);
      }
      console.log('');
    }
    process.exit(0);
  });
