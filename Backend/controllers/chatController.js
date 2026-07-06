'use strict';

const mongoose = require('mongoose');
const { ChatRoom, ChatMessage } = require('../models/Chat');
const Project = require('../models/Project');
const { errors } = require('../middlewares/errorHandler');

const ObjectId = mongoose.Types.ObjectId;

function emitRoomEvent(io, projectId, event, data) {
  if (!io) return;
  io.to(`project:${projectId}`).emit(event, data);
}

async function checkMember(projectId, userId) {
  const project = await Project.findOne({
    _id: new ObjectId(projectId),
    'members.userId': new ObjectId(userId),
  }).lean();
  if (!project) throw errors.Forbidden('You are not a member of this project');
  return project.members.find((m) => m.userId.toString() === userId);
}

async function checkRoomMember(room, userId) {
  return room.members.map((m) => m.toString()).includes(userId);
}

function getMemberRole(room, userId) {
  const entry = room.memberRoles?.find((r) => r.userId.toString() === userId);
  return entry?.role ?? 'MEMBER';
}

function getOwnerId(room) {
  return room.memberRoles?.find((r) => r.role === 'OWNER')?.userId?.toString()
    ?? room.createdBy?._id?.toString?.()
    ?? room.createdBy?.toString?.()
    ?? null;
}

async function populateMembers(room) {
  await room.populate('members', 'id fullName avatar');
  await room.populate('createdBy', 'id fullName avatar');
}

// ─── GET ROOMS ───────────────────────────────────────────────────

exports.getRooms = async (req, res, next) => {
  try {
    await checkMember(req.params.projectId, req.user.id);
    let rooms = await ChatRoom.find({
      projectId: new ObjectId(req.params.projectId),
      members: req.user.id,
    })
      .populate('members', 'id fullName avatar')
      .populate('createdBy', 'id fullName avatar')
      .lean();
      
    const hasGeneral = rooms.some(r => r.type === 'GENERAL');
    if (!hasGeneral) {
      const project = await Project.findById(req.params.projectId).lean();
      if (project) {
        const memberIds = project.members.map(m => new ObjectId(m.userId));
        if (!memberIds.some(id => id.toString() === req.user.id)) {
          memberIds.push(new ObjectId(req.user.id));
        }
        const generalRoom = await ChatRoom.create({
          projectId: new ObjectId(req.params.projectId),
          name: 'General',
          type: 'GENERAL',
          createdBy: new ObjectId(project.ownerId || req.user.id),
          members: memberIds,
          chatAdmins: [],
          memberRoles: memberIds.map(id => ({ userId: id, role: 'MEMBER', joinedAt: new Date() })),
        });
        await generalRoom.populate('members', 'id fullName avatar');
        await generalRoom.populate('createdBy', 'id fullName avatar');
        rooms.unshift(generalRoom.toObject());
      }
    }

    const enriched = await Promise.all(rooms.map(async (r) => {
      let unreadCount = 0;
      let mutedUntil = null;
      const role = r.memberRoles?.find(mr => mr.userId.toString() === req.user.id);
      if (role) {
        mutedUntil = role.mutedUntil || null;
        const lastRead = role.lastRead || new Date(0);
        unreadCount = await ChatMessage.countDocuments({
          roomId: r._id,
          timestamp: { $gt: lastRead },
          senderId: { $ne: new ObjectId(req.user.id) }
        });
      }
      return {
        ...r,
        unreadCount,
        mutedUntil,
        memberRoles: r.memberRoles ?? [],
      };
    }));

    res.json({
      success: true,
      data: {
        general: enriched.filter((r) => r.type === 'GENERAL'),
        channels: enriched.filter((r) => r.type === 'CHANNEL'),
        direct: enriched.filter((r) => r.type === 'DIRECT'),
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getMessages = async (req, res, next) => {
  try {
    await checkMember(req.params.projectId, req.user.id);
    const room = await ChatRoom.findOne({
      _id: new ObjectId(req.params.roomId),
      projectId: new ObjectId(req.params.projectId),
    });
    if (!room) throw errors.NotFound('Room');

    const limit = parseInt(req.query.limit || '50', 10);
    const query = { roomId: new ObjectId(req.params.roomId) };
    if (req.query.cursor) {
      query._id = { $lt: new ObjectId(req.query.cursor) };
    }

    const messages = await ChatMessage.find(query)
      .populate('senderId', 'id fullName avatar')
      .sort({ timestamp: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, -1) : messages;

    res.json({
      success: true,
      data: {
        messages: items.reverse(),
        hasMore,
        nextCursor: hasMore ? items.at(-1)?._id.toString() || null : null,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getRoomMembers = async (req, res, next) => {
  try {
    await checkMember(req.params.projectId, req.user.id);
    const room = await ChatRoom.findOne({
      _id: new ObjectId(req.params.roomId),
      projectId: new ObjectId(req.params.projectId),
    })
      .populate('members', 'id fullName avatar')
      .populate('createdBy', 'id fullName avatar')
      .lean();
    if (!room) throw errors.NotFound('Room');

    res.json({ success: true, data: { ...room, memberRoles: room.memberRoles ?? [] } });
  } catch (err) {
    next(err);
  }
};

// ─── CREATE ROOM ─────────────────────────────────────────────────

exports.createRoom = async (req, res, next) => {
  try {
    await checkMember(req.params.projectId, req.user.id);
    const rawType = (req.body.type ?? 'CHANNEL').toUpperCase();
    const validTypes = ['GENERAL', 'CHANNEL', 'DIRECT'];
    if (!validTypes.includes(rawType)) {
      return res.status(400).json({ success: false, message: 'Loại phòng chat không hợp lệ' });
    }

    const userId = req.user.id;
    const memberIds = (req.body.memberIds || []).map((id) => new ObjectId(id));

    // For DIRECT rooms: find existing or create new
    if (rawType === 'DIRECT' && memberIds.length === 1) {
      const targetId = memberIds[0].toString();
      const existing = await ChatRoom.findOne({
        projectId: new ObjectId(req.params.projectId),
        type: 'DIRECT',
        members: { $all: [new ObjectId(userId), new ObjectId(targetId)], $size: 2 },
      }).lean();
      if (existing) {
        const populated = await ChatRoom.findById(existing._id)
          .populate('members', 'id fullName avatar')
          .populate('createdBy', 'id fullName avatar');
        return res.json({ success: true, data: populated });
      }
      const room = await ChatRoom.create({
        projectId: new ObjectId(req.params.projectId),
        name: req.body.name || 'Direct Message',
        type: 'DIRECT',
        members: [new ObjectId(userId), new ObjectId(targetId)],
        createdBy: new ObjectId(userId),
        chatAdmins: [],
        memberRoles: [
          { userId: new ObjectId(userId), role: 'MEMBER', joinedAt: new Date() },
          { userId: new ObjectId(targetId), role: 'MEMBER', joinedAt: new Date() },
        ],
      });
      await room.populate('members', 'id fullName avatar');
      await room.populate('createdBy', 'id fullName avatar');
      const io = req.app.get('io');
      emitRoomEvent(io, req.params.projectId, 'group.created', room);
      emitRoomEvent(io, req.params.projectId, 'group.member.joined', { _id: room._id, memberId: new ObjectId(targetId) });
      return res.status(201).json({ success: true, data: room });
    }

    // GENERAL room: do not allow via API
    if (rawType === 'GENERAL') {
      return res.status(400).json({ success: false, message: 'Không thể tạo phòng chung bằng API' });
    }

    // CHANNEL: validate unique name within project
    const duplicate = await ChatRoom.findOne({
      projectId: new ObjectId(req.params.projectId),
      type: 'CHANNEL',
      name: req.body.name,
    }).lean();
    if (duplicate) {
      return res.status(400).json({ success: false, message: 'Tên kênh đã tồn tại trong dự án này' });
    }

    const room = await ChatRoom.create({
      projectId: new ObjectId(req.params.projectId),
      name: req.body.name,
      type: 'CHANNEL',
      createdBy: new ObjectId(userId),
      members: [new ObjectId(userId), ...memberIds],
      chatAdmins: [],
      memberRoles: [
        { userId: new ObjectId(userId), role: 'OWNER', joinedAt: new Date() },
        ...memberIds.map((id) => ({ userId: id, role: 'MEMBER', joinedAt: new Date() })),
      ],
    });

    await room.populate('members', 'id fullName avatar');
    await room.populate('createdBy', 'id fullName avatar');
    const io = req.app.get('io');
    emitRoomEvent(io, req.params.projectId, 'group.created', room);
    for (const mid of memberIds) {
      emitRoomEvent(io, req.params.projectId, 'group.member.joined', { _id: room._id, memberId: mid });
    }
    res.status(201).json({ success: true, data: room });
  } catch (err) {
    next(err);
  }
};

exports.renameRoom = async (req, res, next) => {
  try {
    const room = await ChatRoom.findOne({
      _id: new ObjectId(req.params.roomId),
      projectId: new ObjectId(req.params.projectId),
    });
    if (!room) throw errors.NotFound('Room');
    if (room.type === 'GENERAL') throw errors.Forbidden('Cannot rename General room');

    const role = getMemberRole(room, req.user.id);
    if (role === 'MEMBER') throw errors.Forbidden('You do not have permission to rename this room');

    room.name = req.body.name;
    await room.save();
    await populateMembers(room);
    const io = req.app.get('io');
    emitRoomEvent(io, req.params.projectId, 'group.updated', { _id: room._id, name: room.name });
    res.json({ success: true, data: room });
  } catch (err) {
    next(err);
  }
};

// ─── ADD MEMBERS ────────────────────────────────────────────────

exports.addMembers = async (req, res, next) => {
  try {
    const room = await ChatRoom.findOne({
      _id: new ObjectId(req.params.roomId),
      projectId: new ObjectId(req.params.projectId),
    });
    if (!room) throw errors.NotFound('Room');
    if (room.type === 'GENERAL') throw errors.Forbidden('Cannot add members to General room');
    if (room.settings?.inviteLocked) throw errors.Forbidden('Member invitation is locked');

    const role = getMemberRole(room, req.user.id);
    if (role === 'MEMBER') throw errors.Forbidden('You do not have permission to add members');

    const userIds = req.body.memberIds || [];
    const addedIds = [];
    for (const uid of userIds) {
      const oid = new ObjectId(uid);
      if (!room.members.map((m) => m.toString()).includes(uid)) {
        room.members.push(oid);
        room.memberRoles = room.memberRoles.filter((r) => r.userId.toString() !== uid);
        room.memberRoles.push({ userId: oid, role: 'MEMBER', joinedAt: new Date() });
        addedIds.push(oid);
      }
    }
    await room.save();
    await populateMembers(room);
    const io = req.app.get('io');
    emitRoomEvent(io, req.params.projectId, 'group.updated', room);
    for (const mid of addedIds) {
      emitRoomEvent(io, req.params.projectId, 'group.member.joined', { _id: room._id, memberId: mid });
    }
    res.json({ success: true, data: room });
  } catch (err) {
    next(err);
  }
};

// ─── LEAVE CHANNEL ──────────────────────────────────────────────
// POST /rooms/:roomId/leave
// Handles all 4 cases from rq.md spec

exports.leaveChannel = async (req, res, next) => {
  try {
    const { projectId, roomId } = req.params;
    const userId = req.user.id;

    await checkMember(projectId, userId);

    const room = await ChatRoom.findOne({
      _id: new ObjectId(roomId),
      projectId: new ObjectId(projectId),
    });
    if (!room) throw errors.NotFound('Room');
    if (room.type === 'GENERAL') throw errors.Forbidden('Cannot leave the General room');

    const inRoom = await checkRoomMember(room, userId);
    if (!inRoom) throw errors.NotFound('You are not a member of this room');

    const role = getMemberRole(room, userId);
    const memberCount = room.members.length;

    // CASE 4: OWNER is the last member → delete room + messages
    if (role === 'OWNER' && memberCount === 1) {
      await ChatMessage.deleteMany({ roomId: room._id });
      await ChatRoom.findByIdAndDelete(room._id);
      const io = req.app.get('io');
      emitRoomEvent(io, projectId, 'group.deleted', { _id: room._id });
      return res.json({ success: true, data: { deleted: true, reason: 'last_owner' } });
    }

    // CASE 3: OWNER has other members → requires transfer first
    if (role === 'OWNER' && memberCount > 1) {
      const body = (req.body || {});
      if (!body.newOwnerId) {
        return res.status(400).json({
          success: false,
          message: 'Bạn là chủ sở hữu. Vui lòng chọn người nhận quyền trước khi rời kênh.',
          code: 'OWNER_TRANSFER_REQUIRED',
        });
      }

      const newOwnerId = body.newOwnerId;
      const newOwnerInRoom = await checkRoomMember(room, newOwnerId);
      if (!newOwnerInRoom) throw errors.NotFound('New owner is not a member of this room');

      room.memberRoles = room.memberRoles.map((r) => {
        if (r.userId.toString() === userId) return { ...r, role: 'MEMBER' };
        if (r.userId.toString() === newOwnerId) return { ...r, role: 'OWNER' };
        return r;
      });
      room.createdBy = new ObjectId(newOwnerId);

      room.members = room.members.filter((m) => m.toString() !== userId);
      room.chatAdmins = room.chatAdmins.filter((a) => a.toString() !== userId);

      await room.save();
      await populateMembers(room);
      const io = req.app.get('io');
      emitRoomEvent(io, projectId, 'group.owner.changed', { _id: room._id, newOwnerId });
      emitRoomEvent(io, projectId, 'group.member.left', { _id: room._id, userId });
      return res.json({ success: true, data: { room, transferredTo: newOwnerId } });
    }

    // CASE 1 & 2: ADMIN or MEMBER leaves
    room.members = room.members.filter((m) => m.toString() !== userId);
    room.memberRoles = room.memberRoles.filter((r) => r.userId.toString() !== userId);
    room.chatAdmins = room.chatAdmins.filter((a) => a.toString() !== userId);

    if (room.members.length === 0) {
      await ChatMessage.deleteMany({ roomId: room._id });
      await ChatRoom.findByIdAndDelete(room._id);
      const io = req.app.get('io');
      emitRoomEvent(io, projectId, 'group.deleted', { _id: room._id });
      return res.json({ success: true, data: { deleted: true, reason: 'last_member' } });
    }

    await room.save();
    await populateMembers(room);
    const ioLeave = req.app.get('io');
    emitRoomEvent(ioLeave, projectId, 'group.member.left', { _id: room._id, userId });
    return res.json({ success: true, data: { room } });
  } catch (err) {
    next(err);
  }
};

// ─── KICK MEMBER ────────────────────────────────────────────────

exports.kickMember = async (req, res, next) => {
  try {
    const { projectId, roomId, userId } = req.params;
    const actorId = req.user.id;

    await checkMember(projectId, actorId);

    const room = await ChatRoom.findOne({
      _id: new ObjectId(roomId),
      projectId: new ObjectId(projectId),
    });
    if (!room) throw errors.NotFound('Room');
    if (room.type === 'GENERAL') throw errors.Forbidden('Cannot kick from General room');

    const inRoom = await checkRoomMember(room, userId);
    if (!inRoom) throw errors.NotFound('User is not a member of this room');

    const actorRole = getMemberRole(room, actorId);
    const targetRole = getMemberRole(room, userId);

    // OWNER: can kick ADMIN and MEMBER
    if (actorRole === 'OWNER') {
      // no special restrictions
    }
    // ADMIN: can only kick MEMBER
    else if (actorRole === 'ADMIN') {
      if (targetRole === 'OWNER') throw errors.Forbidden('Cannot kick the owner');
      if (targetRole === 'ADMIN') throw errors.Forbidden('Cannot kick another admin');
    }
    // MEMBER: cannot kick anyone
    else {
      throw errors.Forbidden('You do not have permission to kick members');
    }

    room.members = room.members.filter((m) => m.toString() !== userId);
    room.memberRoles = room.memberRoles.filter((r) => r.userId.toString() !== userId);
    room.chatAdmins = room.chatAdmins.filter((a) => a.toString() !== userId);

    if (room.members.length === 0) {
      await ChatMessage.deleteMany({ roomId: room._id });
      await ChatRoom.findByIdAndDelete(room._id);
      const io = req.app.get('io');
      emitRoomEvent(io, projectId, 'group.deleted', { _id: room._id });
      return res.json({ success: true, data: { deleted: true } });
    }

    await room.save();
    await populateMembers(room);
    const ioKick = req.app.get('io');
    emitRoomEvent(ioKick, projectId, 'group.member.removed', { _id: room._id, userId });
    return res.json({ success: true, data: room });
  } catch (err) {
    next(err);
  }
};

// ─── PROMOTE TO ADMIN ────────────────────────────────────────────

exports.promoteChatAdmin = async (req, res, next) => {
  try {
    const { projectId, roomId, userId } = req.params;
    const actorId = req.user.id;

    await checkMember(projectId, actorId);

    const room = await ChatRoom.findOne({
      _id: new ObjectId(roomId),
      projectId: new ObjectId(projectId),
    });
    if (!room) throw errors.NotFound('Room');

    const actorRole = getMemberRole(room, actorId);
    if (actorRole !== 'OWNER') throw errors.Forbidden('Only the owner can promote members to admin');

    const inRoom = await checkRoomMember(room, userId);
    if (!inRoom) throw errors.NotFound('User is not a member of this room');

    const targetRole = getMemberRole(room, userId);
    if (targetRole === 'OWNER') throw errors.Forbidden('Cannot promote the owner');
    if (targetRole === 'ADMIN') throw errors.BadRequest('User is already an admin');

    room.memberRoles = room.memberRoles.filter((r) => r.userId.toString() !== userId);
    room.memberRoles.push({ userId: new ObjectId(userId), role: 'ADMIN', joinedAt: new Date() });
    if (!room.chatAdmins.map((a) => a.toString()).includes(userId)) {
      room.chatAdmins.push(new ObjectId(userId));
    }

    await room.save();
    await populateMembers(room);
    const io = req.app.get('io');
    emitRoomEvent(io, req.params.projectId, 'group.role.changed', { _id: room._id, userId, role: 'ADMIN' });
    return res.json({ success: true, data: room });
  } catch (err) {
    next(err);
  }
};

// ─── DEMOTE ADMIN ───────────────────────────────────────────────

exports.demoteChatAdmin = async (req, res, next) => {
  try {
    const { projectId, roomId, userId } = req.params;
    const actorId = req.user.id;

    await checkMember(projectId, actorId);

    const room = await ChatRoom.findOne({
      _id: new ObjectId(roomId),
      projectId: new ObjectId(projectId),
    });
    if (!room) throw errors.NotFound('Room');

    const actorRole = getMemberRole(room, actorId);
    if (actorRole !== 'OWNER') throw errors.Forbidden('Only the owner can demote admins');

    room.memberRoles = room.memberRoles.filter((r) => r.userId.toString() !== userId);
    room.memberRoles.push({ userId: new ObjectId(userId), role: 'MEMBER', joinedAt: new Date() });
    room.chatAdmins = room.chatAdmins.filter((a) => a.toString() !== userId);

    await room.save();
    await populateMembers(room);
    const io = req.app.get('io');
    emitRoomEvent(io, req.params.projectId, 'group.role.changed', { _id: room._id, userId, role: 'MEMBER' });
    return res.json({ success: true, data: room });
  } catch (err) {
    next(err);
  }
};

// ─── TRANSFER OWNER ─────────────────────────────────────────────

exports.transferOwner = async (req, res, next) => {
  try {
    const { projectId, roomId, userId } = req.params;
    const actorId = req.user.id;

    await checkMember(projectId, actorId);

    const room = await ChatRoom.findOne({
      _id: new ObjectId(roomId),
      projectId: new ObjectId(projectId),
    });
    if (!room) throw errors.NotFound('Room');
    if (room.type === 'GENERAL') throw errors.Forbidden('Cannot transfer ownership of General room');

    const actorRole = getMemberRole(room, actorId);
    if (actorRole !== 'OWNER') throw errors.Forbidden('Only the owner can transfer ownership');

    const inRoom = await checkRoomMember(room, userId);
    if (!inRoom) throw errors.NotFound('Target user is not a member of this room');

    if (userId === actorId) throw errors.BadRequest('Cannot transfer ownership to yourself');

    room.memberRoles = room.memberRoles.map((r) => {
      if (r.userId.toString() === actorId) return { ...r, role: 'ADMIN' };
      if (r.userId.toString() === userId) return { ...r, role: 'OWNER' };
      return r;
    });
    room.createdBy = new ObjectId(userId);

    await room.save();
    await populateMembers(room);
    const io = req.app.get('io');
    emitRoomEvent(io, req.params.projectId, 'group.owner.changed', { _id: room._id, newOwnerId: userId });
    return res.json({ success: true, data: room });
  } catch (err) {
    next(err);
  }
};

// ─── ROOM SETTINGS ─────────────────────────────────────────────

exports.updateRoomSettings = async (req, res, next) => {
  try {
    const room = await ChatRoom.findOne({
      _id: new ObjectId(req.params.roomId),
      projectId: new ObjectId(req.params.projectId),
    });
    if (!room) throw errors.NotFound('Room');
    if (room.type === 'GENERAL') throw errors.Forbidden('Cannot change settings for General room');

    const role = getMemberRole(room, req.user.id);
    if (role === 'MEMBER') throw errors.Forbidden('You do not have permission to change settings');

    if (typeof req.body.inviteLocked !== 'undefined') {
      room.settings = room.settings || {};
      room.settings.inviteLocked = Boolean(req.body.inviteLocked);
    }
    await room.save();
    await populateMembers(room);
    const io = req.app.get('io');
    emitRoomEvent(io, req.params.projectId, 'group.updated', { _id: room._id, settings: room.settings });
    return res.json({ success: true, data: room });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE ROOM ────────────────────────────────────────────────

exports.deleteRoom = async (req, res, next) => {
  try {
    const room = await ChatRoom.findOne({
      _id: new ObjectId(req.params.roomId),
      projectId: new ObjectId(req.params.projectId),
    });
    if (!room) throw errors.NotFound('Room');
    if (room.type === 'GENERAL') throw errors.Forbidden('Cannot delete General room');

    const role = getMemberRole(room, req.user.id);
    if (role === 'MEMBER' || role === 'ADMIN') {
      throw errors.Forbidden('Only the owner can delete this room');
    }

    await ChatMessage.deleteMany({ roomId: room._id });
    await ChatRoom.findByIdAndDelete(room._id);
    const io = req.app.get('io');
    emitRoomEvent(io, req.params.projectId, 'group.deleted', { _id: room._id });
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// ─── SEND MESSAGE ───────────────────────────────────────────────

exports.sendMessage = async (req, res, next) => {
  try {
    const room = await ChatRoom.findOne({
      _id: new ObjectId(req.params.roomId),
      projectId: new ObjectId(req.params.projectId),
    });
    if (!room) throw errors.NotFound('Room');

    const inRoom = await checkRoomMember(room, req.user.id);
    if (!inRoom) throw errors.Forbidden('You are not a member of this room');

    const msg = await ChatMessage.create({
      roomId: new ObjectId(req.params.roomId),
      senderId: new ObjectId(req.user.id),
      content: req.body.content,
      channel: req.body.channel || 'GROUP',
      targetId: req.body.targetId ? new ObjectId(req.body.targetId) : undefined,
    });

    await msg.populate('senderId', 'id fullName avatar');
    return res.status(201).json({ success: true, data: msg });
  } catch (err) {
    next(err);
  }
};

// ─── MUTE ROOM ──────────────────────────────────────────────────

exports.muteRoom = async (req, res, next) => {
  try {
    const { duration } = req.body;
    let mutedUntil = null;

    if (duration) {
      const now = new Date();
      switch (duration) {
        case '1h': mutedUntil = new Date(now.getTime() + 60 * 60 * 1000); break;
        case '8h': mutedUntil = new Date(now.getTime() + 8 * 60 * 60 * 1000); break;
        case '24h': mutedUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000); break;
        case '7d': mutedUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); break;
        case 'forever': mutedUntil = new Date(now.getTime() + 100 * 365 * 24 * 60 * 60 * 1000); break;
      }
    }

    const room = await ChatRoom.findOneAndUpdate(
      { _id: new ObjectId(req.params.roomId), 'memberRoles.userId': new ObjectId(req.user.id) },
      { $set: { 'memberRoles.$.mutedUntil': mutedUntil } },
      { new: true }
    );

    if (!room) throw errors.NotFound('Room or Membership not found');

    return res.json({ success: true, data: { mutedUntil } });
  } catch (err) {
    next(err);
  }
};
