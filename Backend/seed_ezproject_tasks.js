require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');
const Task = require('./models/Task');
const { Document } = require('./models/Document');
const User = require('./models/User');
const Project = require('./models/Project');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ezproject';
const PROJECT_ID = '6a44ccd2098654a645b7fd09';

const tasksData = {
  'ezproject.work43@gmail.com': { // Hiệu - 13 tasks IT -> score 104 ~ 100
    tasks: [
      { t: 'Setup repo and environments', tag: 'it', date: '2026-04-16' },
      { t: 'Initialize Express and MongoDB', tag: 'it', date: '2026-04-18' },
      { t: 'Create Project Schema', tag: 'it', date: '2026-04-20' },
      { t: 'Implement Authentication JWT', tag: 'it', date: '2026-04-25' },
      { t: 'Setup Socket.io for Realtime chat', tag: 'it', date: '2026-05-02' },
      { t: 'Deploy backend to production', tag: 'it', date: '2026-05-08' },
      { t: 'Develop Module 2 APIs', tag: 'it', date: '2026-05-20' },
      { t: 'Review code and optimize DB queries', tag: 'it', date: '2026-05-30' },
      { t: 'Refactor Meeting Controller', tag: 'it', date: '2026-06-06' },
      { t: 'Integrate Email Notifications', tag: 'it', date: '2026-06-15' },
      { t: 'Fix Checkpoint 2 bugs', tag: 'it', date: '2026-06-23' },
      { t: 'Implement Dashboard Revenue Charts', tag: 'it', date: '2026-07-10' },
      { t: 'Finalize Deployment and SSL', tag: 'it', date: '2026-07-15' },
    ],
    comments: 0, docs: 0
  },
  'baokhanh652210@gmail.com': { // Khánh - 13 tasks IT -> score 104 ~ 100
    tasks: [
      { t: 'Setup React Frontend', tag: 'it', date: '2026-04-16' },
      { t: 'Design System & UI Components', tag: 'it', date: '2026-04-18' },
      { t: 'Implement Login & Register UI', tag: 'it', date: '2026-04-22' },
      { t: 'Integrate Redux/Context for State', tag: 'it', date: '2026-04-28' },
      { t: 'Build Chat UI', tag: 'it', date: '2026-05-04' },
      { t: 'Deploy Frontend to Vercel', tag: 'it', date: '2026-05-08' },
      { t: 'Implement Meeting Calendar View', tag: 'it', date: '2026-05-25' },
      { t: 'Fix layout bugs for mobile', tag: 'it', date: '2026-05-31' },
      { t: 'Implement Admin Overview UI', tag: 'it', date: '2026-06-08' },
      { t: 'Build Payment Integration UI', tag: 'it', date: '2026-06-18' },
      { t: 'Prepare UI for Checkpoint 2', tag: 'it', date: '2026-06-23' },
      { t: 'Fix Revenue Chart Display', tag: 'it', date: '2026-07-12' },
      { t: 'Final UI Polish', tag: 'it', date: '2026-07-15' },
    ],
    comments: 0, docs: 0
  },
  'huyentran1234.dn@gmail.com': { // Trân - 11 tasks (88) + 1 comment (2) = 90. 50/50 IT BIZ (6 IT, 5 BIZ)
    tasks: [
      { t: 'Gather initial product requirements', tag: 'biz', date: '2026-04-15' },
      { t: 'Write SRS Documentation', tag: 'biz', date: '2026-04-20' },
      { t: 'QA Testing Module 1', tag: 'it', date: '2026-05-07' },
      { t: 'Prepare slide for Checkpoint 1', tag: 'biz', date: '2026-06-02' },
      { t: 'Update Marketing Plan Document', tag: 'biz', date: '2026-06-06' },
      { t: 'QA Testing Module 2', tag: 'it', date: '2026-06-10' },
      { t: 'Test Payment Gateway Sandbox', tag: 'it', date: '2026-06-15' },
      { t: 'Prepare Checkpoint 2 Slides', tag: 'biz', date: '2026-06-23' },
      { t: 'Write User Manual', tag: 'it', date: '2026-06-30' },
      { t: 'Report Revenue Data', tag: 'it', date: '2026-07-15' },
      { t: 'Final System Testing', tag: 'it', date: '2026-07-18' },
    ],
    comments: 1, docs: 0
  },
  'managehosphoto1@gmail.com': { // Hưng - 8 tasks (64) + 3 comments (6) = 70. 40% IT, 60% BIZ (3 IT, 5 BIZ)
    tasks: [
      { t: 'Competitor Analysis', tag: 'biz', date: '2026-04-18' },
      { t: 'Define core features checklist', tag: 'biz', date: '2026-04-20' },
      { t: 'Review DB Schema', tag: 'it', date: '2026-04-25' },
      { t: 'Draft Initial Pitch Deck', tag: 'biz', date: '2026-05-15' },
      { t: 'Write Test Cases for Chat', tag: 'it', date: '2026-05-20' },
      { t: 'Review Module 2 Features', tag: 'it', date: '2026-05-31' },
      { t: 'Prepare meeting minutes with mentor', tag: 'biz', date: '2026-06-05' },
      { t: 'Update business model canvas', tag: 'biz', date: '2026-06-25' },
    ],
    comments: 3, docs: 0
  },
  'quangthanh0825@gmail.com': { // Thanh - 8 tasks (64) + 1 doc (5) + 3 comments (6) = 75. 3 IT, 5 BIZ
    tasks: [
      { t: 'Market Research', tag: 'biz', date: '2026-04-17' },
      { t: 'Create User Personas', tag: 'biz', date: '2026-04-19' },
      { t: 'Test initial APIs', tag: 'it', date: '2026-04-26' },
      { t: 'Plan Social Media Strategy', tag: 'biz', date: '2026-05-10' },
      { t: 'Test Notification System', tag: 'it', date: '2026-05-22' },
      { t: 'Contact 10 beta testers', tag: 'biz', date: '2026-06-07' },
      { t: 'Gather beta tester feedback', tag: 'biz', date: '2026-06-15' },
      { t: 'Write automation scripts', tag: 'it', date: '2026-07-05' },
    ],
    comments: 3, docs: 1
  }
};

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const project = await mongoose.model('Project').findById(PROJECT_ID).populate('members.userId');
  if (!project) throw new Error('Project not found');

  const userMap = {};
  for (const m of project.members) {
    if (m.userId && m.userId.email) {
      userMap[m.userId.email.toLowerCase()] = m.userId._id;
    }
  }

  const hieuId = userMap['ezproject.work43@gmail.com'];
  if (!hieuId) throw new Error("Could not find Hieu");
  
  let totalTasks = 0;
  const emails = Object.keys(tasksData);
  for (const email of emails) {
    const data = tasksData[email];
    const assigneeId = userMap[email];
    if (!assigneeId) {
      console.log('User not found:', email);
      continue;
    }

    const taskIds = [];
    for (const t of data.tasks) {
      const start = new Date(t.date);
      start.setHours(9, 0, 0, 0);
      const end = new Date(t.date);
      end.setHours(17, 0, 0, 0);
      
      const task = await Task.create({
        projectId: PROJECT_ID,
        title: t.t,
        description: `Description for ${t.t}`,
        status: 'DONE',
        priority: 'MEDIUM',
        assigneeId: assigneeId,
        creatorId: hieuId, // Hiệu tạo hết
        startDate: start,
        deadline: end,
        hashtags: [t.tag],
        comments: []
      });
      taskIds.push(task._id);
      totalTasks++;
    }

    // Insert comments
    if (data.comments > 0 && taskIds.length > 0) {
      const taskToComment = await Task.findById(taskIds[0]);
      for (let i = 0; i < data.comments; i++) {
        taskToComment.comments.push({
          authorId: assigneeId,
          content: 'This is a task comment for points'
        });
      }
      await taskToComment.save();
    }

    // Insert docs
    if (data.docs > 0) {
      for (let i = 0; i < data.docs; i++) {
        await Document.create({
          projectId: PROJECT_ID,
          title: `Document ${email} ${i}`,
          type: 'google_doc',
          url: 'https://docs.google.com/document/d/example',
          createdBy: assigneeId
        });
      }
    }
  }

  console.log(`Inserted ${totalTasks} tasks, plus required docs and comments.`);
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
