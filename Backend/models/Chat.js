'use strict';

const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  name: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ['GENERAL', 'CHANNEL', 'DIRECT'],
    default: 'CHANNEL',
  },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  settings: {
    inviteLocked: { type: Boolean, default: false },
  },
}, { timestamps: true });

const chatMessageSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatRoom',
    required: true,
  },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  content: { type: String, required: true },
  channel: {
    type: String,
    enum: ['GROUP', 'TASK', 'DOCUMENT', 'AI'],
    default: 'GROUP',
  },
  targetId: { type: mongoose.Schema.Types.ObjectId, default: null },
  timestamp: { type: Date, default: Date.now },
});

chatRoomSchema.index({ projectId: 1 });
chatRoomSchema.index({ members: 1 });
chatMessageSchema.index({ roomId: 1, timestamp: -1 });

const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);
const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

module.exports = { ChatRoom, ChatMessage };
