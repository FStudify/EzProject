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

/**
 * Legacy 1-5 star evaluation kept for backward compatibility with the
 * existing `evaluateMember` endpoint. New evaluations live in
 * LeaderEvaluation / SupervisorEvaluation (plan §7.8 / §7.9).
 */
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

/* ------------------------------------------------------------------ */
/*  LeaderEvaluation — plan-hieusuat.md §7.8                           */
/* ------------------------------------------------------------------ */

const EVALUATION_CRITERIA = ['responsibility', 'communication', 'initiative', 'teamwork', 'qualityOfWork'];
const MAX_CRITERION_SCORE = 20;
const MAX_TOTAL_SCORE = EVALUATION_CRITERIA.length * MAX_CRITERION_SCORE;

const leaderEvaluationSchema = new mongoose.Schema({
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
  responsibility: { type: Number, required: true, min: 0, max: MAX_CRITERION_SCORE },
  communication: { type: Number, required: true, min: 0, max: MAX_CRITERION_SCORE },
  initiative: { type: Number, required: true, min: 0, max: MAX_CRITERION_SCORE },
  teamwork: { type: Number, required: true, min: 0, max: MAX_CRITERION_SCORE },
  qualityOfWork: { type: Number, required: true, min: 0, max: MAX_CRITERION_SCORE },
  totalScore: { type: Number, required: true, min: 0, max: MAX_TOTAL_SCORE },
  comment: { type: String, default: null },
  status: {
    type: String,
    enum: ['PENDING', 'SUBMITTED'],
    default: 'SUBMITTED',
    required: true,
  },
  evaluationDate: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

/* ------------------------------------------------------------------ */
/*  SupervisorEvaluation — plan-hieusuat.md §7.9                       */
/* ------------------------------------------------------------------ */

const supervisorEvaluationSchema = new mongoose.Schema({
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
  responsibility: { type: Number, required: true, min: 0, max: MAX_CRITERION_SCORE },
  communication: { type: Number, required: true, min: 0, max: MAX_CRITERION_SCORE },
  initiative: { type: Number, required: true, min: 0, max: MAX_CRITERION_SCORE },
  teamwork: { type: Number, required: true, min: 0, max: MAX_CRITERION_SCORE },
  qualityOfWork: { type: Number, required: true, min: 0, max: MAX_CRITERION_SCORE },
  totalScore: { type: Number, required: true, min: 0, max: MAX_TOTAL_SCORE },
  comment: { type: String, default: null },
  status: {
    type: String,
    enum: ['PENDING', 'SUBMITTED'],
    default: 'SUBMITTED',
    required: true,
  },
  evaluationDate: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

activitySchema.index({ projectId: 1, timestamp: -1 });
notificationSchema.index({ userId: 1, read: 1 });
memberEvaluationSchema.index({ projectId: 1, memberId: 1 });
leaderEvaluationSchema.index({ projectId: 1, memberId: 1 });
supervisorEvaluationSchema.index({ projectId: 1, memberId: 1 });

activitySchema.plugin(idVirtual);
notificationSchema.plugin(idVirtual);
memberEvaluationSchema.plugin(idVirtual);
leaderEvaluationSchema.plugin(idVirtual);
supervisorEvaluationSchema.plugin(idVirtual);

const Activity = mongoose.model('Activity', activitySchema);
const Notification = mongoose.model('Notification', notificationSchema);
const MemberEvaluation = mongoose.model('MemberEvaluation', memberEvaluationSchema);
const LeaderEvaluation = mongoose.model('LeaderEvaluation', leaderEvaluationSchema);
const SupervisorEvaluation = mongoose.model('SupervisorEvaluation', supervisorEvaluationSchema);

module.exports = {
  Activity,
  Notification,
  MemberEvaluation,
  LeaderEvaluation,
  SupervisorEvaluation,
  EVALUATION_CRITERIA,
  MAX_CRITERION_SCORE,
  MAX_TOTAL_SCORE,
};