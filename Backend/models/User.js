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
    required: true,
    select: false,
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
  },
  avatar: { type: String, default: null },
  phone: { type: String, default: null },
  department: { type: String, default: null },
  position: { type: String, default: null },
  bio: { type: String, default: null },
  language: { type: String, enum: ['VI', 'EN'], default: 'VI' },
  theme: { type: String, enum: ['LIGHT', 'DARK'], default: 'LIGHT' },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
