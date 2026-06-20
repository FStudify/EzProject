'use strict';

const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const config = require('./config');
const User = require('./models/User');
const { ChatRoom, ChatMessage } = require('./models/Chat');
const Project = require('./models/Project');

const ObjectId = mongoose.Types.ObjectId;

/**
 * Initialize Socket.io handlers.
 * @param {import('socket.io').Server} io
 */
function initSocket(io) {

  // ── JWT Auth middleware for socket ──────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) return next(new Error('UNAUTHORIZED: missing token'));

      const payload = jwt.verify(token, config.jwt.secret);
      const user = await User.findById(payload.sub).lean();
      if (!user) return next(new Error('UNAUTHORIZED: user not found'));

      socket.user = { id: payload.sub, fullName: user.fullName, avatar: user.avatar };
      next();
    } catch {
      next(new Error('UNAUTHORIZED: invalid token'));
    }
  });

  // ── Helper: check if user belongs to project ────────────────────────────
  async function isMember(projectId, userId) {
    const project = await Project.findOne({
      _id: new ObjectId(projectId),
      'members.userId': new ObjectId(userId),
    }).lean();
    return !!project;
  }

  io.on('connection', (socket) => {
    console.log(`[Socket] connected: ${socket.user.id} (${socket.user.fullName})`);

    // ── join personal room so server can push user-targeted events
    //    (invitations, friend requests, etc.) without client polling.
    socket.join(`user:${socket.user.id}`);

    // ── join_project ────────────────────────────────────────────────────────
    // Client joins project room to receive all project-level events (chat, meetings, etc.)
    socket.on('join_project', async ({ projectId }) => {
      try {
        if (!await isMember(projectId, socket.user.id)) {
          return socket.emit('error', { message: 'Not a project member' });
        }
        socket.join(`project:${projectId}`);
        socket.emit('project_joined', { projectId });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // ── leave_project ────────────────────────────────────────────────────
    socket.on('leave_project', ({ projectId }) => {
      socket.leave(`project:${projectId}`);
    });

    // ── join_room (chat) ─────────────────────────────────────────────────
    socket.on('join_room', async ({ projectId, roomId }) => {
      try {
        if (!await isMember(projectId, socket.user.id)) {
          return socket.emit('error', { message: 'Not a project member' });
        }
        const room = await ChatRoom.findOne({
          _id: new ObjectId(roomId),
          projectId: new ObjectId(projectId),
        }).lean();
        if (!room) return socket.emit('error', { message: 'Room not found' });

        socket.join(roomId);
        socket.emit('room_joined', { roomId, name: room.name });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // ── leave_room ────────────────────────────────────────────────────────
    socket.on('leave_room', ({ roomId }) => {
      socket.leave(roomId);
    });

    // ── send_message ──────────────────────────────────────────────────────
    socket.on('send_message', async ({ roomId, projectId, content, channel, targetId }) => {
      try {
        if (!content?.trim()) return socket.emit('error', { message: 'Message cannot be empty' });
        if (!await isMember(projectId, socket.user.id)) {
          return socket.emit('error', { message: 'Not a project member' });
        }

        const room = await ChatRoom.findOne({
          _id: new ObjectId(roomId),
          projectId: new ObjectId(projectId),
        }).lean();
        if (!room) return socket.emit('error', { message: 'Room not found' });

        const msg = await ChatMessage.create({
          roomId: new ObjectId(roomId),
          senderId: new ObjectId(socket.user.id),
          content: content.trim(),
          channel: channel || 'GROUP',
          targetId: targetId ? new ObjectId(targetId) : undefined,
        });

        await msg.populate('senderId', 'id fullName avatar');

        io.to(roomId).emit('new_message', {
          _id: msg._id,
          roomId,
          sender: msg.senderId,
          content: msg.content,
          channel: msg.channel,
          targetId: msg.targetId,
          timestamp: msg.timestamp,
        });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // ── typing ────────────────────────────────────────────────────────────
    socket.on('typing', ({ roomId, isTyping }) => {
      socket.to(roomId).emit('user_typing', {
        userId: socket.user.id,
        fullName: socket.user.fullName,
        isTyping,
      });
    });

    // ── disconnect ────────────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      console.log(`[Socket] disconnected: ${socket.user.id} — ${reason}`);
    });
  });
}

module.exports = { initSocket };
