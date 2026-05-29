'use strict';

/**
 * Seed script: tạo tài khoản ADMIN đầu tiên nếu chưa có.
 * Chạy: node seed/seedAdmin.js
 */

require('dotenv/config');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ezproject');
  console.log('[Seed] Connected to MongoDB');

  // Import sau khi connect để schema đã register
  const User = require('../models/User');

  const email    = process.env.ADMIN_EMAIL    || 'admin@ezproject.dev';
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'Admin@2026!';

  const existing = await User.findOne({ $or: [{ email }, { username }] });
  if (existing) {
    if (existing.role !== 'ADMIN') {
      await User.findByIdAndUpdate(existing._id, { role: 'ADMIN' });
      console.log(`[Seed] Upgraded existing user "${username}" to ADMIN`);
    } else {
      console.log(`[Seed] Admin "${username}" already exists. Skipping.`);
    }
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({
    email,
    username,
    passwordHash,
    fullName: 'System Administrator',
    role: 'ADMIN',
  });

  console.log(`[Seed] ✅ Admin created: ${email} / ${username}`);
  console.log(`[Seed] ⚠️  Remember to change the default password!`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('[Seed] Error:', err);
  process.exit(1);
});
