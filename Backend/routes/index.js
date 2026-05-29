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

const router = express.Router();

router.use('/auth', authRouter);
router.use('/users', userRouter);
router.use('/projects', projectRouter);
router.use('/projects/:projectId/tasks', taskRouter);
router.use('/projects/:projectId/documents', documentRouter);
router.use('/projects/:projectId/meetings', meetingRouter);
router.use('/projects/:projectId/chat', chatRouter);
router.use('/projects/:projectId/members', memberRouter);
router.use('/projects/:projectId/performance', performanceRouter);
router.use('/projects/:projectId/activities', activityRouter);

module.exports = router;
