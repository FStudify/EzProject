const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://EzProject:FstudifyEzProject204@ezproject.12ddmyt.mongodb.net/?appName=EzProject')
  .then(async () => {
    const db = mongoose.connection.db;
    
    const keepProjectIds = [
      '6a44c7e8318ef558b4a11011',
      '6a44c7e8318ef558b4a11026',
      '6a44ccd2098654a645b7fd09',
      '6a451077db9c096f5c821c73'
    ];
    const keepProjectIdsObj = keepProjectIds.map(id => new mongoose.Types.ObjectId(id));

    const keptProjects = await db.collection('projects').find({
      $or: [
        { _id: { $in: keepProjectIdsObj } },
        { _id: { $in: keepProjectIds } }
      ]
    }).toArray();

    console.log("Found projects:", keptProjects.length);
    for (const p of keptProjects) {
       console.log(`- Project: ${p.name}`);
       console.log(`  Members raw:`, JSON.stringify(p.members));
    }
    
    const users = await db.collection('users').find({}).toArray();
    console.log(`\nCurrent total users in DB: ${users.length}`);
    for(const u of users) {
       console.log(`- ${u.email} (${u._id})`);
    }
    process.exit(0);
  });
