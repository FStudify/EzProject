'use strict';

const express = require('express');
const invitationController = require('../controllers/invitationController');
const { requireAuth } = require('../middlewares/auth');
const { validate, validators } = require('../validators');

const router = express.Router({ mergeParams: true });

// ── OWNER: Create email invite (with role) ────────────────────
router.post(
  '/projects/:projectId/invite',
  requireAuth,
  (req, res, next) => {
    console.log(`[InviteRoute] POST /projects/${req.params.projectId}/invite body=${JSON.stringify(req.body)}`);
    next();
  },
  validate(validators.createEmailInvite),
  invitationController.createEmailInvite,
);

// ── PUBLIC: Preview invite by token (used by /invite/:token page) ─
router.get('/invite/:token', invitationController.getInviteByToken);

// ── AUTHED: Accept invite by token (existing user flow) ───────
router.post(
  '/invite/:token/accept',
  requireAuth,
  invitationController.acceptInviteByToken,
);

// ── OWNER: Resend invite email ─────────────────────────────────
router.post(
  '/projects/:projectId/invitations/:invitationId/resend',
  requireAuth,
  invitationController.resendInvite,
);

// ── OWNER: Cancel (revoke) invite ──────────────────────────────
router.delete(
  '/projects/:projectId/invitations/:invitationId',
  requireAuth,
  invitationController.cancelInvite,
);

module.exports = router;
