const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://EzProject:FstudifyEzProject204@ezproject.12ddmyt.mongodb.net/?appName=EzProject')
  .then(async () => {
    const db = mongoose.connection.db;
    const project = await db.collection('projects').findOne({ name: 'EZProject' });
    console.log(JSON.stringify(project, null, 2));
    process.exit(0);
  });
