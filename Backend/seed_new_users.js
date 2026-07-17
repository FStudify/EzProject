'use strict';

/**
 * Seed new user accounts for Pro and Ultra subscription plans.
 * Creates four users (three Pro, one Ultra) with a fixed password.
 * Date: 2026-07-16 (creation date is set via createdAt timestamp automatically by mongoose).
 */

require('./config'); // loads environment variables
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { User } = require('./models');

const USERS = [
  { email: 'nguyenvanan@gmail.com', username: 'nguyenvanan', fullName: 'Nguyễn Văn An', role: 'CUSTOMER' },
  { email: 'tranthibinh@gmail.com', username: 'tranthibinh', fullName: 'Trần Thị Bình', role: 'CUSTOMER' },
  { email: 'lehoangcuong@gmail.com', username: 'lehoangcuong', fullName: 'Lê Hoàng Cường', role: 'CUSTOMER' },
  { email: 'phamthidung@gmail.com', username: 'phamthidung', fullName: 'Phạm Thị Dung', role: 'CUSTOMER' },
];

const DEFAULT_PASSWORD = 'Password123!'; // simple placeholder password

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ezproject');
    console.info('[seed_new_users] connected to MongoDB');

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(DEFAULT_PASSWORD, salt);

    for (const u of USERS) {
      const existing = await User.findOne({ $or: [{ email: u.email }, { username: u.username }] });
      if (existing) {
        console.info(`[seed_new_users] skipping existing user ${u.email}`);
        continue;
      }
      const newUser = new User({
        email: u.email,
        username: u.username,
        passwordHash: hash,
        fullName: u.fullName,
        role: u.role,
      });
      await newUser.save();
      console.info(`[seed_new_users] created ${u.email}`);
    }
  } catch (err) {
    console.error('[seed_new_users] failed:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.info('[seed_new_users] disconnected');
  }
}

if (require.main === module) {
  run();
}

module.exports = { run };
