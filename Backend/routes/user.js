'use strict';

const express = require('express');
const userController = require('../controllers/userController');
const { requireAuth } = require('../middlewares/auth');
const { validate, validators } = require('../validators');
const { handleUpload, uploadAvatar } = require('../middlewares/upload');

const router = express.Router();

// ── Profile ────────────────────────────────────────────
router.get('/me', requireAuth, userController.getProfile);
router.get('/me/stats', requireAuth, userController.getUserStats);
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

// ── Avatar (Gap 5) ─────────────────────────────────────
router.post('/me/avatar', requireAuth, handleUpload(uploadAvatar), userController.uploadAvatar);
router.delete('/me/avatar', requireAuth, userController.deleteAvatar);

// ── Notifications ──────────────────────────────────────
router.get('/me/notifications', requireAuth, userController.getNotifications);
router.put('/me/notifications/read-all', requireAuth, userController.markAllRead);
router.put('/me/notifications/:id/read', requireAuth, userController.markNotificationRead);

module.exports = router;
