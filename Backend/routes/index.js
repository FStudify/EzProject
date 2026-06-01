'use strict';

const express = require('express');
const authRouter = require('./auth');
const userRouter = require('./user');
const projectRouter = require('./project');
const taskRouter = require('./task');
const documentRouter = require('./document');
const meetingRouter = require('./meeting');
const chatRouter = require('./chat');
const memberRouter = require('./member');
const performanceRouter = require('./performance');
const activityRouter = require('./activity');
const adminRouter = require('./admin');
const memberController = require('../controllers/memberController');
const { requireAuth } = require('../middlewares/auth');
const aiController = require('../controllers/aiController');

const router = express.Router();

// ── Public/Auth ────────────────────────────────────────
router.use('/auth', authRouter);

// ── Join by invite link (Gap 2) ────────────────────────
// POST /api/v1/join  { token: "..." }
router.post('/join', requireAuth, memberController.joinByInvite);

// ── User ───────────────────────────────────────────────
router.use('/users', userRouter);

// ── AI Chat ─────────────────────────────────────────────────
router.post('/ai/chat', requireAuth, aiController.chat);

// ── Admin (Gap 1) ──────────────────────────────────────
router.use('/admin', adminRouter);

// ── Projects & nested resources ────────────────────────
router.use('/projects', projectRouter);
router.use('/projects/:projectId/tasks', taskRouter);
router.use('/projects/:projectId/documents', documentRouter);
router.use('/projects/:projectId/meetings', meetingRouter);
router.use('/projects/:projectId/chat', chatRouter);
router.use('/projects/:projectId/members', memberRouter);
router.use('/projects/:projectId/performance', performanceRouter);
router.use('/projects/:projectId/activities', activityRouter);

module.exports = router;
