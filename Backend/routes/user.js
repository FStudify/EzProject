'use strict';

const express = require('express');
const userController = require('../controllers/userController');
const { requireAuth } = require('../middlewares/auth');
const { validate, validators } = require('../validators');

const router = express.Router();

router.get('/me', requireAuth, userController.getProfile);
router.put('/me', requireAuth, validate(validators.updateProfile), userController.updateProfile);
router.put(
  '/me/preferences',
  requireAuth,
  validate(validators.updatePreferences),
  userController.updatePreferences,
);
router.put(
  '/me/password',
  requireAuth,
  validate(validators.changePassword),
  userController.changePassword,
);

router.get('/me/notifications', requireAuth, userController.getNotifications);
router.put('/me/notifications/:id/read', requireAuth, userController.markNotificationRead);
router.put('/me/notifications/read-all', requireAuth, userController.markAllRead);

module.exports = router;
