'use strict';

const express = require('express');
const meetingController = require('../controllers/meetingController');
const { requireAuth } = require('../middlewares/auth');
const { validate, validators } = require('../validators');

const router = express.Router({ mergeParams: true });

router.get('/', requireAuth, meetingController.list);
router.get('/:meetingId', requireAuth, meetingController.getById);
router.post(
  '/',
  requireAuth,
  validate(validators.createMeeting),
  meetingController.create,
);
router.put(
  '/:meetingId',
  requireAuth,
  validate(validators.updateMeeting),
  meetingController.update,
);
router.delete('/:meetingId', requireAuth, meetingController.delete);
router.put(
  '/:meetingId/rsvp',
  requireAuth,
  validate(validators.rsvp),
  meetingController.rsvp,
);
router.post(
  '/:meetingId/attendees',
  requireAuth,
  validate(validators.addAttendees),
  meetingController.addAttendees,
);
router.delete(
  '/:meetingId/attendees/:userId',
  requireAuth,
  meetingController.removeAttendee,
);
router.put(
  '/:meetingId/summary',
  requireAuth,
  validate(validators.updateSummary),
  meetingController.updateSummary,
);

module.exports = router;
