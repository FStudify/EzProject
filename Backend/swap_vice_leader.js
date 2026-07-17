const mongoose = require('mongoose');

const URI = 'mongodb+srv://EzProject:FstudifyEzProject204@ezproject.12ddmyt.mongodb.net/?appName=EzProject';

async function replaceViceLeader() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(URI);
  const db = mongoose.connection.db;

  const oldUserId = new mongoose.Types.ObjectId('6a44c4bab6896738e7b06071'); // hoangvokhanh.it
  const newUserId = new mongoose.Types.ObjectId('6a573f7b22959dbe238461c2'); // baokhanh652210
  const projId = new mongoose.Types.ObjectId('6a44ccd2098654a645b7fd09');

  console.log('Updating project members...');
  const proj = await db.collection('projects').findOne({ _id: projId });
  if (proj) {
    const updatedMembers = proj.members.map(m => {
      if (m.userId.toString() === oldUserId.toString()) {
        m.userId = newUserId;
      }
      return m;
    });
    
    await db.collection('projects').updateOne(
      { _id: projId },
      { $set: { members: updatedMembers } }
    );
    console.log('Updated project members.');
  }

  console.log('Updating tasks...');
  const tasksRes = await db.collection('tasks').updateMany(
    { projectId: projId, assigneeId: oldUserId },
    { $set: { assigneeId: newUserId } }
  );
  console.log(`Updated ${tasksRes.modifiedCount} tasks.`);

  // If creatorId was also the old user, update it
  await db.collection('tasks').updateMany(
    { projectId: projId, creatorId: oldUserId },
    { $set: { creatorId: newUserId } }
  );

  console.log('Updating activities...');
  const actsRes = await db.collection('activities').updateMany(
    { projectId: projId, userId: oldUserId },
    { $set: { userId: newUserId } }
  );
  console.log(`Updated ${actsRes.modifiedCount} activities.`);
  
  // Set the fake user's name to match what the user expects just in case
  await db.collection('users').updateOne(
    { _id: newUserId },
    { $set: { fullName: 'Hoàng Võ Bảo Khánh' } }
  );

  console.log('Swap completed successfully!');
  process.exit(0);
}

replaceViceLeader().catch(console.error);
