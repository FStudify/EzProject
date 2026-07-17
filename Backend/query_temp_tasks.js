const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://EzProject:FstudifyEzProject204@ezproject.12ddmyt.mongodb.net/?appName=EzProject')
  .then(async () => {
    const db = mongoose.connection.db;
    const userId = new mongoose.Types.ObjectId('6a41ecfdba2491bec8005aca');
    
    // Find tasks where user is assignee
    const tasks = await db.collection('tasks').find({
      'assignees': userId
    }).toArray();

    console.log(`Tìm thấy ${tasks.length} tasks được gán cho ezproject.work43@gmail.com.`);
    
    process.exit(0);
  });
