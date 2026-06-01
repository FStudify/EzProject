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
  },
  invitedUsername: {
    type: String,
    default: null,
  },
  status: {
    type: String,
    enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED'],
    default: 'PENDING',
  },
  expiresAt: {
    type: Date,
    required: true,
  },
}, { timestamps: true });

invitationSchema.index({ projectId: 1, status: 1 });
invitationSchema.index({ invitedUserId: 1, status: 1 });
invitationSchema.index({ invitedEmail: 1 });

module.exports = mongoose.model('Invitation', invitationSchema);
