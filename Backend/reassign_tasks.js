require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');
const Task = require('./models/Task');
const User = require('./models/User');
const Project = require('./models/Project');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ezproject';
const PROJECT_ID = '6a44ccd2098654a645b7fd09';

async function reassignTasks() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const khanh = await User.findOne({ email: 'baokhanh652210@gmail.com' });
  const tran = await User.findOne({ email: 'huyentran1234.dn@gmail.com' });
  const hung = await User.findOne({ email: 'managehosphoto1@gmail.com' });
  const thanh = await User.findOne({ email: 'quangthanh0825@gmail.com' });

  if (!khanh || !tran || !hung || !thanh) {
    throw new Error('One or more users not found');
  }

  // Find 10 tasks assigned to Khánh in EZProject
  const khanhTasks = await Task.find({
    projectId: PROJECT_ID,
    assigneeId: khanh._id
  }).limit(10);

  if (khanhTasks.length < 10) {
    console.log(`Only found ${khanhTasks.length} tasks for Khanh, but 10 requested.`);
  }

  // Re-assign logic
  // 5 to Trân, 2 to Hưng, 2 to Thành, 1 delete
  let tranCount = 0;
  let hungCount = 0;
  let thanhCount = 0;
  let deletedCount = 0;

  for (let i = 0; i < khanhTasks.length; i++) {
    const task = khanhTasks[i];
    if (i < 5) {
      task.assigneeId = tran._id;
      await task.save();
      tranCount++;
    } else if (i < 7) {
      task.assigneeId = hung._id;
      await task.save();
      hungCount++;
    } else if (i < 9) {
      task.assigneeId = thanh._id;
      await task.save();
      thanhCount++;
    } else {
      await Task.findByIdAndDelete(task._id);
      deletedCount++;
    }
  }

  console.log(`Reassigned: ${tranCount} to Tran, ${hungCount} to Hung, ${thanhCount} to Thanh. Deleted: ${deletedCount}`);
  process.exit(0);
}

reassignTasks().catch(err => {
  console.error(err);
  process.exit(1);
});
