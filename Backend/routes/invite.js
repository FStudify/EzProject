'use strict';

const express = require('express');
const invitationController = require('../controllers/invitationController');
const { requireAuth } = require('../middlewares/auth');
const { validate, validators } = require('../validators');

const router = express.Router({ mergeParams: true });

router.post(
  '/projects/:projectId/invites/email',
  requireAuth,
  validate(validators.createEmailInvite),
  invitationController.createEmailInvite,
);
router.get('/invites/:token', invitationController.getInviteByToken);
router.post('/invites/:token/accept', requireAuth, invitationController.acceptInviteByToken);

module.exports = router;
