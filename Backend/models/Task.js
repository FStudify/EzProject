'use strict';

const mongoose = require('mongoose');
const idVirtual = require('./plugins/idVirtual');

const taskCommentSchema = new mongoose.Schema({
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: { type: String, required: true },
  mentions: { type: [String], default: [] },
}, { timestamps: true });

const taskSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: null },
  status: {
    type: String,
    enum: ['BACKLOG', 'IN_PROGRESS', 'REVIEW', 'DONE', 'ON_HOLD', 'CANCELLED'],
    default: 'BACKLOG',
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH'],
    default: 'MEDIUM',
  },
  assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deadline: { type: Date, default: null },
  requestType: { type: String, enum: ['REVIEW', 'PAUSE', null], default: null },
  requestNote: { type: String, default: null },
  comments: { type: [taskCommentSchema], default: [] },
}, { timestamps: true });

taskSchema.index({ projectId: 1, status: 1 });
taskSchema.index({ assigneeId: 1 });
taskSchema.index({ deadline: 1 });

taskSchema.plugin(idVirtual);

module.exports = mongoose.model('Task', taskSchema);
