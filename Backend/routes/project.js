'use strict';

const express = require('express');
const projectController = require('../controllers/projectController');
const { requireAuth } = require('../middlewares/auth');
const { validate, validators } = require('../validators');

const router = express.Router();

router.get('/', requireAuth, projectController.list);
router.get('/:projectId', requireAuth, projectController.getById);
router.post(
  '/',
  requireAuth,
  validate(validators.createProject),
  projectController.create,
);
router.put(
  '/:projectId',
  requireAuth,
  validate(validators.updateProject),
  projectController.update,
);
router.delete('/:projectId', requireAuth, projectController.delete);
router.put('/:projectId/progress', requireAuth, projectController.updateProgress);

module.exports = router;
