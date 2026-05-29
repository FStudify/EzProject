'use strict';

const express = require('express');
const authController = require('../controllers/authController');
const { requireAuth } = require('../middlewares/auth');
const { authLimiter } = require('../middlewares/rateLimit');
const { validate, validators } = require('../validators');

const router = express.Router();

router.post(
  '/login',
  authLimiter,
  validate(validators.login),
  authController.login,
);

router.post(
  '/register',
  authLimiter,
  validate(validators.register),
  authController.register,
);

router.post(
  '/refresh',
  validate(validators.refresh),
  authController.refresh,
);

router.post('/logout', requireAuth, authController.logout);

module.exports = router;
