const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://EzProject:FstudifyEzProject204@ezproject.12ddmyt.mongodb.net/?appName=EzProject')
  .then(async () => {
    const db = mongoose.connection.db;
    const task = await db.collection('tasks').findOne({});
    console.log('Task sample:', JSON.stringify(task, null, 2));
    process.exit(0);
  });
