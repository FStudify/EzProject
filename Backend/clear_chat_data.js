require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');
const Project = require('./models/Project');
const { ChatRoom, ChatMessage } = require('./models/Chat');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ezproject';
const PROJECT_NAME = 'EZProject';

(async () => {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const project = await Project.findOne({ name: PROJECT_NAME });
  if (!project) throw new Error('Project not found');

  // Find all chatrooms for the project (including GENERAL)
  const rooms = await ChatRoom.find({ projectId: project._id }, { _id: 1 });
  const roomIds = rooms.map(r => r._id);

  if (roomIds.length === 0) {
    console.log('No chatrooms found for the project. Nothing to delete.');
    process.exit(0);
  }

  const delResult = await ChatMessage.deleteMany({ roomId: { $in: roomIds } });
  console.log(`🧹 Deleted ${delResult.deletedCount} chat messages from all rooms of project ${PROJECT_NAME}.`);

  process.exit(0);
})();
