'use strict';

/**
 * ============================================================
 * Database Seed Script — Tao du lieu mau de test API
 * Run: node seed/seed.js
 * ============================================================
 */

require('dotenv/config');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Meeting = require('../models/Meeting');
const { ChatRoom, ChatMessage } = require('../models/Chat');
const { Notification, Activity } = require('../models/Activity');

const ObjectId = mongoose.Types.ObjectId;

async function dropCollections() {
  await Promise.all([
    User.deleteMany({}),
    Project.deleteMany({}),
    Task.deleteMany({}),
    Meeting.deleteMany({}),
    ChatRoom.deleteMany({}),
    ChatMessage.deleteMany({}),
    Notification.deleteMany({}),
    Activity.deleteMany({}),
  ]);
  console.log('[Seed] All collections cleared');
}

async function seedUsers() {
  const passwordHash = await bcrypt.hash('123456', 10);

  const users = await User.insertMany([
    {
      email: 'admin@ezproject.com',
      username: 'admin',
      passwordHash,
      fullName: 'Nguyen Van Admin',
      department: 'IT',
      position: 'Project Manager',
      bio: 'System administrator with 5 years experience',
    },
    {
      email: 'leader@ezproject.com',
      username: 'leader1',
      passwordHash,
      fullName: 'Tran Thi Leader',
      department: 'Engineering',
      position: 'Team Leader',
    },
    {
      email: 'member1@ezproject.com',
      username: 'member1',
      passwordHash,
      fullName: 'Le Van Member 1',
      department: 'Engineering',
      position: 'Developer',
    },
    {
      email: 'member2@ezproject.com',
      username: 'member2',
      passwordHash,
      fullName: 'Pham Thi Member 2',
      department: 'Design',
      position: 'UI/UX Designer',
    },
    {
      email: 'supervisor@ezproject.com',
      username: 'supervisor1',
      passwordHash,
      fullName: 'Hoang Van Supervisor',
      department: 'QA',
      position: 'QA Supervisor',
    },
  ]);

  console.log(`[Seed] Created ${users.length} users`);
  return users;
}

async function seedProjects(users) {
  const [admin, leader, member1, member2, supervisor] = users;

  const mainProject = await Project.create({
    name: 'EZProject Platform',
    description: 'Unified workspace platform cho sinh vien - tasks, documents, chat, meetings, performance tracking',
    subject: 'Capstone Project',
    status: 'ACTIVE',
    progress: 35,
    ownerId: admin._id,
    deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    members: [
      { userId: admin._id, role: 'LEADER', isOwner: true, joinedAt: new Date() },
      { userId: leader._id, role: 'LEADER', isOwner: false, joinedAt: new Date() },
      { userId: member1._id, role: 'MEMBER', isOwner: false, joinedAt: new Date() },
      { userId: member2._id, role: 'MEMBER', isOwner: false, joinedAt: new Date() },
      { userId: supervisor._id, role: 'SUPERVISOR', isOwner: false, joinedAt: new Date() },
    ],
  });

  const mobileProject = await Project.create({
    name: 'Mobile App - Student Helper',
    description: 'Ung dung di dong ho tro hoc tap',
    subject: 'Mobile Development',
    status: 'ACTIVE',
    progress: 10,
    ownerId: leader._id,
    deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    members: [
      { userId: leader._id, role: 'LEADER', isOwner: true, joinedAt: new Date() },
      { userId: member1._id, role: 'MEMBER', isOwner: false, joinedAt: new Date() },
    ],
  });

  console.log('[Seed] Created 2 projects');
  return [mainProject, mobileProject];
}

async function seedTasks(projects) {
  const [mainProject] = projects;
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const tasks = await Task.insertMany([
    {
      projectId: mainProject._id,
      title: 'Thiet ke Database Schema',
      description: 'Thiet ke schema cho User, Project, Task, Meeting, Chat, Document',
      status: 'DONE',
      priority: 'HIGH',
      creatorId: mainProject.members[0].userId,
      assigneeId: mainProject.members[1].userId,
      deadline: new Date(now - 10 * day),
      comments: [
        {
          authorId: mainProject.members[0].userId,
          content: 'Da hoan thanh thiet ke schema',
          mentions: [],
        },
        {
          authorId: mainProject.members[1].userId,
          content: 'Schema nhin tot, approved!',
          mentions: [],
        },
      ],
    },
    {
      projectId: mainProject._id,
      title: 'Implement Backend REST API',
      description: 'Xay dung REST API cho toan bo modules',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      creatorId: mainProject.members[0].userId,
      assigneeId: mainProject.members[2].userId,
      deadline: new Date(now + 5 * day),
    },
    {
      projectId: mainProject._id,
      title: 'Implement Auth System (JWT)',
      description: 'Login, register, refresh token, password change',
      status: 'DONE',
      priority: 'HIGH',
      creatorId: mainProject.members[0].userId,
      assigneeId: mainProject.members[2].userId,
      deadline: new Date(now - 5 * day),
    },
    {
      projectId: mainProject._id,
      title: 'Frontend Dashboard UI',
      description: 'Thiet ke va implement Dashboard',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      creatorId: mainProject.members[1].userId,
      assigneeId: mainProject.members[3].userId,
      deadline: new Date(now + 10 * day),
    },
    {
      projectId: mainProject._id,
      title: 'Task Management Module',
      description: 'CRUD tasks, comments, priority, deadline',
      status: 'REVIEW',
      priority: 'MEDIUM',
      creatorId: mainProject.members[0].userId,
      assigneeId: mainProject.members[2].userId,
      deadline: new Date(now + 2 * day),
    },
    {
      projectId: mainProject._id,
      title: 'Chat Real-time System',
      description: 'Implement chat voi Socket.io',
      status: 'BACKLOG',
      priority: 'LOW',
      creatorId: mainProject.members[1].userId,
      assigneeId: null,
      deadline: new Date(now + 20 * day),
    },
    {
      projectId: mainProject._id,
      title: 'Meeting Scheduler',
      description: 'Lich hop, RSVP, thong bao',
      status: 'BACKLOG',
      priority: 'MEDIUM',
      creatorId: mainProject.members[0].userId,
      assigneeId: mainProject.members[3].userId,
      deadline: new Date(now + 15 * day),
    },
  ]);

  console.log(`[Seed] Created ${tasks.length} tasks`);
  return tasks;
}

async function seedMeetings(projects) {
  const [mainProject] = projects;
  const now = Date.now();
  const hour = 60 * 60 * 1000;

  const meetings = await Meeting.insertMany([
    {
      projectId: mainProject._id,
      title: 'Sprint Planning',
      description: 'Ke hoach sprint tiep theo, phan cong cong viec',
      type: 'ONLINE',
      startTime: new Date(now + 2 * hour),
      endTime: new Date(now + 3.5 * hour),
      meetingLink: 'https://meet.ezproject.com/sprint-3',
      status: 'SCHEDULED',
      organizerId: mainProject.members[0].userId,
      attendees: mainProject.members.map((m) => ({ userId: m.userId })),
    },
    {
      projectId: mainProject._id,
      title: 'Weekly Standup',
      description: 'Daily standup meeting',
      type: 'ONLINE',
      startTime: new Date(now + 26 * hour),
      endTime: new Date(now + 27 * hour),
      meetingLink: 'https://meet.ezproject.com/weekly',
      status: 'SCHEDULED',
      organizerId: mainProject.members[1].userId,
      attendees: mainProject.members.map((m) => ({ userId: m.userId })),
    },
    {
      projectId: mainProject._id,
      title: 'Design Review',
      description: 'Review UI/UX设计方案',
      type: 'OFFLINE',
      startTime: new Date(now + 3 * 24 * hour),
      endTime: new Date(now + 3 * 24 * hour + 2 * hour),
      location: 'Phong hoc 301, Toa nha A',
      status: 'SCHEDULED',
      organizerId: mainProject.members[1].userId,
      attendees: [
        { userId: mainProject.members[1].userId },
        { userId: mainProject.members[3].userId },
      ],
    },
  ]);

  console.log(`[Seed] Created ${meetings.length} meetings`);
  return meetings;
}

async function seedChat(projects) {
  const [mainProject] = projects;

  const generalRoom = await ChatRoom.create({
    projectId: mainProject._id,
    name: 'General',
    type: 'GENERAL',
    members: mainProject.members.map((m) => m.userId),
    createdBy: mainProject.members[0].userId,
  });

  const devChannel = await ChatRoom.create({
    projectId: mainProject._id,
    name: 'dev-team',
    type: 'CHANNEL',
    members: mainProject.members.map((m) => m.userId),
    createdBy: mainProject.members[0].userId,
  });

  const now = Date.now();

  await ChatMessage.insertMany([
    {
      roomId: generalRoom._id,
      senderId: mainProject.members[0].userId,
      content: 'Chao moi nguoi! Day la general room.',
      channel: 'GROUP',
      timestamp: new Date(now - 2 * 60 * 60 * 1000),
    },
    {
      roomId: generalRoom._id,
      senderId: mainProject.members[1].userId,
      content: 'Xin chao! Rat vui duoc lam viec cung moi nguoi.',
      channel: 'GROUP',
      timestamp: new Date(now - 1.5 * 60 * 60 * 1000),
    },
    {
      roomId: generalRoom._id,
      senderId: mainProject.members[2].userId,
      content: 'Backend API da xong 80% roi.',
      channel: 'GROUP',
      timestamp: new Date(now - 30 * 60 * 1000),
    },
    {
      roomId: devChannel._id,
      senderId: mainProject.members[2].userId,
      content: 'Co ai can review code khong?',
      channel: 'GROUP',
      timestamp: new Date(now - 20 * 60 * 1000),
    },
  ]);

  console.log('[Seed] Created 2 chat rooms + messages');
}

async function seedActivities(projects, users) {
  const [mainProject] = projects;
  const [admin, leader, member1] = users;
  const now = Date.now();

  await Activity.insertMany([
    {
      projectId: mainProject._id,
      userId: admin._id,
      action: 'created',
      target: 'EZProject Platform',
      targetType: 'PROJECT',
      targetId: mainProject._id,
      timestamp: new Date(now - 7 * 24 * 60 * 60 * 1000),
    },
    {
      projectId: mainProject._id,
      userId: admin._id,
      action: 'invited',
      target: 'Tran Thi Leader',
      targetType: 'MEMBER',
      timestamp: new Date(now - 6 * 24 * 60 * 60 * 1000),
    },
    {
      projectId: mainProject._id,
      userId: leader._id,
      action: 'created',
      target: 'Thiet ke Database Schema',
      targetType: 'TASK',
      timestamp: new Date(now - 5 * 24 * 60 * 60 * 1000),
    },
    {
      projectId: mainProject._id,
      userId: member1._id,
      action: 'completed',
      target: 'Implement Auth System (JWT)',
      targetType: 'TASK',
      timestamp: new Date(now - 3 * 24 * 60 * 60 * 1000),
    },
  ]);

  console.log('[Seed] Created activity log');
}

async function seedNotifications(users) {
  const [admin, leader, member1] = users;

  await Notification.insertMany([
    {
      userId: admin._id,
      type: 'TASK',
      title: 'New task assigned',
      body: 'Implement Backend REST API da duoc gan cho ban',
      link: '/tasks/2',
      read: false,
    },
    {
      userId: leader._id,
      type: 'MEETING',
      title: 'Reminder: Sprint Planning',
      body: 'Cuoc hop Sprint Planning bat dau trong 2 gio',
      link: '/meetings/1',
      read: false,
    },
    {
      userId: member1._id,
      type: 'CHAT',
      title: 'New message in #dev-team',
      body: 'Co ai can review code khong?',
      link: '/chat/dev-team',
      read: true,
    },
  ]);

  console.log('[Seed] Created notifications');
}

async function main() {
  try {
    console.log('\n========================================');
    console.log('  EZProject — Database Seed');
    console.log('========================================\n');

    await mongoose.connect(process.env.MONGO_URI);
    console.log('[MongoDB] Connected');

    console.log('\n[Seed] Dropping existing data...');
    await dropCollections();

    const users = await seedUsers();
    const projects = await seedProjects(users);
    await seedTasks(projects);
    await seedMeetings(projects);
    await seedChat(projects);
    await seedActivities(projects, users);
    await seedNotifications(users);

    console.log('\n========================================');
    console.log('  Seed completed successfully!');
    console.log('========================================');
    console.log('\nTest accounts:');
    console.log('  Username: admin / leader1 / member1 / member2 / supervisor1');
    console.log('  Password: 123456');
    console.log('\n  Login: POST /api/v1/auth/login');
    console.log('  Body: { "username": "admin", "password": "123456" }');
    console.log('\n========================================\n');
  } catch (err) {
    console.error('[Seed] Error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main();
