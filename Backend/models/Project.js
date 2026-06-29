'use strict';

const mongoose = require('mongoose');
const idVirtual = require('./plugins/idVirtual');

const projectMemberSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  role: {
    type: String,
    enum: ['LEADER', 'SUPERVISOR', 'MEMBER'],
    default: 'MEMBER',
  },
  isOwner: { type: Boolean, default: false },
  joinedAt: { type: Date, default: Date.now },
}, { _id: false });

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: null },
  subject: { type: String, default: null },
  status: {
    type: String,
    enum: ['ACTIVE', 'COMPLETED', 'ARCHIVED'],
    default: 'ACTIVE',
  },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: { type: [projectMemberSchema], default: [] },
  deadline: { type: Date, default: null },
}, { timestamps: true });

projectSchema.index({ ownerId: 1 });
projectSchema.index({ 'members.userId': 1 });
projectSchema.index({ status: 1 });

projectSchema.plugin(idVirtual);

module.exports = mongoose.model('Project', projectSchema);
