'use strict';

const mongoose = require('mongoose');

const inviteLinkSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  token: {
    type: String,
    required: true,
    unique: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
}, { timestamps: true });

// TTL index — MongoDB tự xóa sau khi hết hạn
inviteLinkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
inviteLinkSchema.index({ projectId: 1 });

module.exports = mongoose.model('InviteLink', inviteLinkSchema);
