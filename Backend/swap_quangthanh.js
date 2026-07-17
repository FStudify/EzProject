const mongoose = require('mongoose');

const URI = 'mongodb+srv://EzProject:FstudifyEzProject204@ezproject.12ddmyt.mongodb.net/?appName=EzProject';

async function swapQuangThanh() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(URI);
  const db = mongoose.connection.db;

  const oldUserId = new mongoose.Types.ObjectId('6a450fdfdb9c096f5c821bdc'); // nguyenquangthanh
  const newUserId = new mongoose.Types.ObjectId('6a573d2522959dbe23846040'); // quangthanh0825
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
  console.log(`Updated ${tasksRes.modifiedCount} tasks (assignee).`);

  const tasksRes2 = await db.collection('tasks').updateMany(
    { projectId: projId, creatorId: oldUserId },
    { $set: { creatorId: newUserId } }
  );
  console.log(`Updated ${tasksRes2.modifiedCount} tasks (creator).`);

  console.log('Updating activities...');
  const actsRes = await db.collection('activities').updateMany(
    { projectId: projId, userId: oldUserId },
    { $set: { userId: newUserId } }
  );
  console.log(`Updated ${actsRes.modifiedCount} activities.`);
  
  console.log('Updating chatrooms...');
  const chatrooms = await db.collection('chatrooms').find({ projectId: projId }).toArray();
  for (const room of chatrooms) {
    const updatedMembers = room.members.map(m => m.toString() === oldUserId.toString() ? newUserId : m);
    const updatedRoles = room.memberRoles.map(mr => {
      if (mr.userId.toString() === oldUserId.toString()) {
        mr.userId = newUserId;
      }
      return mr;
    });
    await db.collection('chatrooms').updateOne(
      { _id: room._id },
      { $set: { members: updatedMembers, memberRoles: updatedRoles } }
    );
  }
  console.log(`Updated ${chatrooms.length} chatrooms.`);

  console.log('Updating chatmessages...');
  const msgsRes = await db.collection('chatmessages').updateMany(
    { senderId: oldUserId },
    { $set: { senderId: newUserId } }
  );
  console.log(`Updated ${msgsRes.modifiedCount} chat messages.`);

  // Set the fake user's name to match what the user expects just in case
  await db.collection('users').updateOne(
    { _id: newUserId },
    { $set: { fullName: 'Nguyễn Quang Thanh' } }
  );

  console.log('Swap completed successfully!');
  process.exit(0);
}

swapQuangThanh().catch(console.error);
