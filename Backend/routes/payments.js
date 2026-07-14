'use strict';

const express = require('express');
const paymentController = require('../controllers/paymentController');
const { requireAuth } = require('../middlewares/auth');
const { validators, validate } = require('../validators');

const router = express.Router();

// ── Public ────────────────────────────────────────────────
router.get('/plans', paymentController.listPlans);

// ── PayOS webhook (public — verify by signature in handler)
// Mounted BEFORE json body parse so we can verify raw body easily.
// Kept here for documentation; actual mount is wired in app.js
// with raw-body capture.
// router.post('/webhook/payos', ... )  → see app.js

// ── Authenticated user endpoints ──────────────────────────
router.get(
  '/me/current',
  requireAuth,
  paymentController.getMyCurrentSubscription,
);

router.post(
  '/voucher/validate',
  requireAuth,
  paymentController.validateVoucher,
);

router.post(
  '/create',
  requireAuth,
  validate(validators.createPayment),
  paymentController.createPayment,
);

router.get(
  '/me/history',
  requireAuth,
  validate(validators.paymentListQuery, 'query'),
  paymentController.getMyPaymentHistory,
);

router.get(
  '/me/status/:orderCode',
  requireAuth,
  paymentController.getMyPaymentStatus,
);

router.post(
  '/me/cancel/:orderCode',
  requireAuth,
  paymentController.cancelMyPayment,
);

module.exports = router;
