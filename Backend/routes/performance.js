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

// Leader Evaluation (plan §7.8) — only Project Leader may submit.
router.get(
  '/leader/:memberId',
  requireAuth,
  performanceController.listLeaderEvaluations,
);
router.put(
  '/leader/:memberId',
  requireAuth,
  validate(validators.leaderEvaluation),
  performanceController.upsertLeaderEvaluation,
);

// Supervisor Evaluation (plan §7.9) — only Supervisors may submit.
router.get(
  '/supervisor/:memberId',
  requireAuth,
  performanceController.listSupervisorEvaluations,
);
router.put(
  '/supervisor/:memberId',
  requireAuth,
  validate(validators.supervisorEvaluation),
  performanceController.upsertSupervisorEvaluation,
);

module.exports = router;