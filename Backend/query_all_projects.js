const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://EzProject:FstudifyEzProject204@ezproject.12ddmyt.mongodb.net/?appName=EzProject')
  .then(async () => {
    const db = mongoose.connection.db;
    
    // Lấy tất cả projects
    const projects = await db.collection('projects').find({}).toArray();

    console.log(`Tổng cộng trong Database có ${projects.length} dự án.\n`);
    
    for (const proj of projects) {
      console.log(`- Project: ${proj.name} (ID: ${proj._id})`);
      console.log(`  + Owner: ${proj.owner} (Type: ${typeof proj.owner} / isObjectId: ${mongoose.Types.ObjectId.isValid(proj.owner)})`);
      
      const members = proj.members || [];
      console.log(`  + Thành viên (${members.length}):`);
      for (const m of members) {
        console.log(`    * Member User ID: ${m.user} (Type: ${typeof m.user})`);
      }
      console.log('');
    }
    process.exit(0);
  });
