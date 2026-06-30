'use strict';

const express = require('express');
const taskController = require('../controllers/taskController');
const { requireAuth } = require('../middlewares/auth');
const { validate, validators } = require('../validators');

const router = express.Router({ mergeParams: true });

router.get('/', requireAuth, taskController.list);
router.get('/:taskId', requireAuth, taskController.getById);
router.post(
  '/',
  requireAuth,
  validate(validators.createTask),
  taskController.create,
);
router.post('/:taskId/approve', requireAuth, taskController.approveTask);
router.post(
  '/:taskId/reject',
  requireAuth,
  validate(validators.rejectTask),
  taskController.rejectTask,
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
