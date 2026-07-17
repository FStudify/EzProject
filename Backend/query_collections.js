const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://EzProject:FstudifyEzProject204@ezproject.12ddmyt.mongodb.net/?appName=EzProject')
  .then(async () => {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    console.log('--- DANH SÁCH COLLECTIONS VÀ SỐ LƯỢNG DOCUMENT ---');
    for (const c of collections) {
      const count = await db.collection(c.name).countDocuments();
      console.log(`${c.name}: ${count}`);
    }
    process.exit(0);
  });
