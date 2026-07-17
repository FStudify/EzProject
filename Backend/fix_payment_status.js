const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://EzProject:FstudifyEzProject204@ezproject.12ddmyt.mongodb.net/?appName=EzProject')
  .then(async () => {
    const db = mongoose.connection.db;
    const res = await db.collection('payments').updateMany(
      { status: 'COMPLETED' },
      { $set: { status: 'PAID' } }
    );
    console.log('Updated to PAID:', res.modifiedCount);
    process.exit(0);
  });
