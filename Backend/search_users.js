const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://EzProject:FstudifyEzProject204@ezproject.12ddmyt.mongodb.net/?appName=EzProject')
  .then(async () => {
    const db = mongoose.connection.db;
    const users = await db.collection('users').find({ $or: [{username: /hoang/i}, {fullName: /Hoàng Võ/i}] }).toArray();
    console.log(users.map(u => ({ email: u.email, id: u._id, username: u.username })));
    process.exit(0);
  });
