'use strict';

const express = require('express');
const chatController = require('../controllers/chatController');
const { requireAuth } = require('../middlewares/auth');
const { validate, validators } = require('../validators');

const router = express.Router({ mergeParams: true });

router.get('/rooms', requireAuth, chatController.getRooms);
router.get('/rooms/:roomId', requireAuth, chatController.getRoomMembers);
router.get('/rooms/:roomId/messages', requireAuth, chatController.getMessages);
router.post(
  '/rooms',
  requireAuth,
  validate(validators.createRoom),
  chatController.createRoom,
);
router.put('/rooms/:roomId', requireAuth, chatController.renameRoom);
router.post('/rooms/:roomId/members', requireAuth, chatController.addMembers);
router.delete('/rooms/:roomId/members/:userId', requireAuth, chatController.removeMember);
router.post('/rooms/:roomId/admins/:userId', requireAuth, chatController.promoteChatAdmin);
router.delete('/rooms/:roomId/admins/:userId', requireAuth, chatController.demoteChatAdmin);
router.post('/rooms/:roomId/owner/:userId', requireAuth, chatController.transferOwner);
router.patch('/rooms/:roomId/settings', requireAuth, chatController.updateRoomSettings);
router.delete('/rooms/:roomId', requireAuth, chatController.deleteRoom);
router.post(
  '/rooms/:roomId/messages',
  requireAuth,
  validate(validators.sendMessage),
  chatController.sendMessage,
);

module.exports = router;
