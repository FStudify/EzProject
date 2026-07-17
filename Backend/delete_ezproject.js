const mongoose = require('mongoose');

const URI = 'mongodb+srv://EzProject:FstudifyEzProject204@ezproject.12ddmyt.mongodb.net/?appName=EzProject';
const PROJECT_ID = new mongoose.Types.ObjectId('6a44ccd2098654a645b7fd09');

async function deleteProject() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(URI);
  const db = mongoose.connection.db;

  console.log('Deleting EZProject...');
  
  const projResult = await db.collection('projects').deleteOne({ _id: PROJECT_ID });
  const tasksResult = await db.collection('tasks').deleteMany({ projectId: PROJECT_ID });
  const activitiesResult = await db.collection('activities').deleteMany({ projectId: PROJECT_ID });
  const docsResult = await db.collection('documents').deleteMany({ projectId: PROJECT_ID });
  const meetingsResult = await db.collection('meetings').deleteMany({ projectId: PROJECT_ID });
  const chatRoomsResult = await db.collection('chatrooms').deleteMany({ projectId: PROJECT_ID });

  console.log(`Deleted project: ${projResult.deletedCount}`);
  console.log(`Deleted tasks: ${tasksResult.deletedCount}`);
  console.log(`Deleted activities: ${activitiesResult.deletedCount}`);
  console.log(`Deleted documents: ${docsResult.deletedCount}`);
  console.log(`Deleted meetings: ${meetingsResult.deletedCount}`);
  console.log(`Deleted chatrooms: ${chatRoomsResult.deletedCount}`);

  console.log('Cleanup completed successfully!');
  process.exit(0);
}

deleteProject().catch(console.error);
