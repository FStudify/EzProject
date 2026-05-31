'use strict';

const express = require('express');
const memberController = require('../controllers/memberController');
const invitationController = require('../controllers/invitationController');
const { requireAuth } = require('../middlewares/auth');
const { validate, validators } = require('../validators');

const router = express.Router({ mergeParams: true });

router.get('/', requireAuth, memberController.list);
router.put(
  '/:userId/role',
  requireAuth,
  validate(validators.updateRole),
  memberController.updateRole,
);
router.delete('/:userId', requireAuth, memberController.remove);
router.post('/invite', requireAuth, memberController.createInvite);
router.post('/leave', requireAuth, memberController.leaveProject);
router.post('/transfer-ownership', requireAuth, memberController.transferOwnership);

// ── Invitations ─────────────────────────────────────────────────
router.get('/invitations', requireAuth, invitationController.listInvitations);
router.post('/invitations', requireAuth, invitationController.createInvitation);
router.post('/invitations/:invitationId/accept', requireAuth, invitationController.acceptInvitation);
router.post('/invitations/:invitationId/decline', requireAuth, invitationController.declineInvitation);
router.delete('/invitations/:invitationId', requireAuth, invitationController.revokeInvitation);

module.exports = router;
