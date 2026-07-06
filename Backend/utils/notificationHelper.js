'use strict';

const { Notification } = require('../models/Activity');

/**
 * Persist a notification document and push it to the user's personal socket
 * room so the bell badge + drawer + popup can refresh in real time.
 *
 * Failures here are logged but never bubble up — notifications are a
 * side-effect of a successful primary action (task assignment, meeting, etc.)
 * and must not break the request flow.
 *
 * @param {import('socket.io').Server | null} io  – Socket.io server instance
 * @param {string} userId       – recipient user id (ObjectId-shaped string)
 * @param {{ type: 'TASK'|'MEETING'|'CHAT'|'DOCUMENT', title: string, body: string, link?: string | null }} payload
 */
async function notifyUser(io, userId, payload) {
  try {
    if (!userId) return null;
    const notif = await Notification.create({
      userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      link: payload.link ?? null,
      read: false,
    });

    if (io) {
      const room = `user:${userId}`;
      console.log(`[notifyUser] emitting to ${room}`);
      io.to(room).emit('new_notification', {
        _id: notif._id,
        type: notif.type,
        title: notif.title,
        body: notif.body,
        link: notif.link,
        read: notif.read,
        createdAt: notif.createdAt,
      });
      // Confirm whether the target room has any connected sockets
      const sockets = await io.in(room).fetchSockets();
      console.log(`[notifyUser] ${room} has ${sockets.length} connected socket(s)`);
    }

    return notif;
  } catch (err) {
    console.error('[notifyUser] failed:', err?.message || err);
    return null;
  }
}

module.exports = { notifyUser };