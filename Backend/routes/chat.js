'use strict';

const express = require('express');
const chatController = require('../controllers/chatController');
const { requireAuth } = require('../middlewares/auth');
const { validate, validators } = require('../validators');

const router = express.Router({ mergeParams: true });

router.get('/rooms', requireAuth, chatController.getRooms);
router.get('/rooms/:roomId/messages', requireAuth, chatController.getMessages);
router.post(
  '/rooms',
  requireAuth,
  validate(validators.createRoom),
  chatController.createRoom,
);
router.put('/rooms/:roomId', requireAuth, chatController.renameRoom);
router.delete('/rooms/:roomId', requireAuth, chatController.deleteRoom);
router.post(
  '/rooms/:roomId/messages',
  requireAuth,
  validate(validators.sendMessage),
  chatController.sendMessage,
);

module.exports = router;
