'use strict';

const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  invitedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  invitedEmail: {
    type: String,
    default: null,
    lowercase: true,
    trim: true,
  },
  invitedUsername: {
    type: String,
    default: null,
  },
  token: {
    type: String,
    unique: true,
    sparse: true,
  },
  role: {
    type: String,
    enum: ['LEADER', 'SUPERVISOR', 'MEMBER'],
    default: 'MEMBER',
  },
  status: {
    type: String,
    enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'REVOKED'],
    default: 'PENDING',
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  acceptedAt: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

invitationSchema.index({ projectId: 1, status: 1 });
invitationSchema.index({ invitedUserId: 1, status: 1 });
invitationSchema.index({ invitedEmail: 1 });

module.exports = mongoose.model('Invitation', invitationSchema);
