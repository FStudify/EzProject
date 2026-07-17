const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://EzProject:FstudifyEzProject204@ezproject.12ddmyt.mongodb.net/?appName=EzProject')
  .then(async () => {
    const db = mongoose.connection.db;
    const userIdString = '6a41ecfdba2491bec8005aca';
    const userIdObj = new mongoose.Types.ObjectId(userIdString);
    
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
      
      const memberIds = (proj.members || []).map(m => m.userId);
      const memberIdsObj = memberIds.map(id => {
        try { return new mongoose.Types.ObjectId(id); } catch(e) { return id; }
      });
      const users = await db.collection('users').find({
        $or: [
          { _id: { $in: memberIdsObj } },
          { _id: { $in: memberIds } }
        ]
      }).toArray();
      
      console.log(`  + Thành viên (${memberIds.length}):`);
      for (const mId of memberIds) {
        const u = users.find(u => u._id.toString() === mId.toString());
        if (u) {
          console.log(`    * ${u.fullName} (${u.email})`);
        } else {
          console.log(`    * Không rõ thông tin User (ID: ${mId}) - Tài khoản có thể đã xóa.`);
        }
      }
      console.log('');
    }
    process.exit(0);
  });
