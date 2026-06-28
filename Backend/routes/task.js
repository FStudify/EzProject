'use strict';

const express = require('express');
const taskController = require('../controllers/taskController');
const { requireAuth } = require('../middlewares/auth');
const { validate, validators } = require('../validators');

const router = express.Router({ mergeParams: true });

router.get('/', requireAuth, taskController.list);
router.post(
  '/ai/generate',
  requireAuth,
  validate(validators.generateAiTasks),
  taskController.generateAiTasks,
);
router.post(
  '/bulk',
  requireAuth,
  validate(validators.bulkCreateTasks),
  taskController.bulkCreate,
);
router.get('/:taskId', requireAuth, taskController.getById);
router.post(
  '/',
  requireAuth,
  validate(validators.createTask),
  taskController.create,
);
router.put(
  '/:taskId',
  requireAuth,
  validate(validators.updateTask),
  taskController.update,
);
router.delete('/:taskId', requireAuth, taskController.delete);
router.put(
  '/:taskId/comments',
  requireAuth,
  validate(validators.addComment),
  taskController.addComment,
);

module.exports = router;
