'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const Project = require('./models/Project');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const p = await Project.findById('6a44ccd2098654a645b7fd09');
  if (!p) { console.log('Project not found'); process.exit(0); }
  const userIds = p.members.map(m => m.userId);
  const users = await User.find({ _id: { $in: userIds } });
  const userMap = {};
  users.forEach(u => userMap[u._id.toString()] = u);
  p.members.forEach(m => {
    const u = userMap[m.userId.toString()];
    if (u) console.log(m.userId.toString() + ' | ' + u.username + ' | ' + u.fullName + ' | ' + m.role);
  });
  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
