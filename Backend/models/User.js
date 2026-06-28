'use strict';

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minLength: 3,
    maxLength: 30,
    index: true,
  },
  passwordHash: {
    type: String,
    required: false,   // optional — user đăng nhập qua Google không có password
    select: false,
  },
  // ── OAuth ─────────────────────────────────────────────
  googleId: {
    type: String,
    default: null,
    index: true,
    sparse: true,      // chỉ index các doc có giá trị (không null)
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
  },
  // ── System-level role ────────────────────────────────
  role: {
    type: String,
    enum: ['ADMIN', 'CUSTOMER'],
    default: 'CUSTOMER',
  },
  // ── Profile ──────────────────────────────────────────
  avatar: { type: String, default: null },
  phone: { type: String, default: null },
  department: { type: String, default: null },
  position: { type: String, default: null },
  bio: { type: String, default: null },
  // ── Preferences ──────────────────────────────────────
  language: { type: String, enum: ['VI', 'EN'], default: 'VI' },
  theme: { type: String, enum: ['LIGHT', 'DARK'], default: 'LIGHT' },
}, { timestamps: true });

userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);
