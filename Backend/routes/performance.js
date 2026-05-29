'use strict';

const express = require('express');
const performanceController = require('../controllers/performanceController');
const { requireAuth } = require('../middlewares/auth');
const { validate, validators } = require('../validators');

const router = express.Router({ mergeParams: true });

router.get('/', requireAuth, performanceController.getPerformance);
router.post(
  '/evaluate',
  requireAuth,
  validate(validators.evaluate),
  performanceController.evaluate,
);

module.exports = router;
