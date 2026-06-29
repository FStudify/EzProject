'use strict';

const mongoose = require('mongoose');
const idVirtual = require('./plugins/idVirtual');

const activitySchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  target: { type: String, required: true },
  targetType: { type: String, default: null },
  targetId: { type: mongoose.Schema.Types.ObjectId, default: null },
  timestamp: { type: Date, default: Date.now },
}, { timestamps: false });

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['TASK', 'MEETING', 'CHAT', 'DOCUMENT'],
    required: true,
  },
  title: { type: String, required: true },
  body: { type: String, required: true },
  link: { type: String, default: null },
  read: { type: Boolean, default: false },
}, { timestamps: true });

const memberEvaluationSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  evaluatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  rating: { type: Number, required: true, min: 1, max: 5 },
  feedback: { type: String, default: null },
  evaluatedAt: { type: Date, default: Date.now },
});

activitySchema.index({ projectId: 1, timestamp: -1 });
notificationSchema.index({ userId: 1, read: 1 });
memberEvaluationSchema.index({ projectId: 1, memberId: 1 });

activitySchema.plugin(idVirtual);
notificationSchema.plugin(idVirtual);
memberEvaluationSchema.plugin(idVirtual);

const Activity = mongoose.model('Activity', activitySchema);
const Notification = mongoose.model('Notification', notificationSchema);
const MemberEvaluation = mongoose.model('MemberEvaluation', memberEvaluationSchema);

module.exports = { Activity, Notification, MemberEvaluation };
