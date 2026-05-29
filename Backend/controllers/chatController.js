'use strict';

const mongoose = require('mongoose');
const { ChatRoom, ChatMessage } = require('../models/Chat');
const Project = require('../models/Project');
const { errors } = require('../middlewares/errorHandler');

const ObjectId = mongoose.Types.ObjectId;

async function checkMember(projectId, userId) {
  const project = await Project.findOne({
    _id: new ObjectId(projectId),
    'members.userId': new ObjectId(userId),
  }).lean();
  if (!project) throw errors.Forbidden('You are not a member of this project');
  return project.members.find((m) => m.userId.toString() === userId);
}

exports.getRooms = async (req, res, next) => {
  try {
    await checkMember(req.params.projectId, req.user.id);
    const rooms = await ChatRoom.find({ projectId: new ObjectId(req.params.projectId) })
      .populate('members', 'id fullName avatar')
      .lean();

    res.json({
      success: true,
      data: {
        general: rooms.filter((r) => r.type === 'GENERAL'),
        channels: rooms.filter((r) => r.type === 'CHANNEL'),
        direct: rooms.filter((r) => r.type === 'DIRECT'),
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

exports.createRoom = async (req, res, next) => {
  try {
    await checkMember(req.params.projectId, req.user.id);
    const room = await ChatRoom.create({
      projectId: new ObjectId(req.params.projectId),
      name: req.body.name,
      type: req.body.type,
      createdBy: new ObjectId(req.user.id),
      members: [
        new ObjectId(req.user.id),
        ...(req.body.memberIds || []).map((id) => new ObjectId(id)),
      ],
    });
    res.status(201).json({ success: true, data: room });
  } catch (err) {
    next(err);
  }
};

exports.renameRoom = async (req, res, next) => {
  try {
    const room = await ChatRoom.findById(req.params.roomId);
    if (!room) throw errors.NotFound('Room');
    if (room.type === 'GENERAL') throw errors.Forbidden('Cannot rename General room');
    room.name = req.body.name;
    await room.save();
    res.json({ success: true, data: room });
  } catch (err) {
    next(err);
  }
};

exports.deleteRoom = async (req, res, next) => {
  try {
    const room = await ChatRoom.findById(req.params.roomId);
    if (!room) throw errors.NotFound('Room');
    if (room.type === 'GENERAL') throw errors.Forbidden('Cannot delete General room');
    await ChatRoom.findByIdAndDelete(req.params.roomId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

exports.sendMessage = async (req, res, next) => {
  try {
    const room = await ChatRoom.findOne({
      _id: new ObjectId(req.params.roomId),
      projectId: new ObjectId(req.params.projectId),
    });
    if (!room) throw errors.NotFound('Room');

    const msg = await ChatMessage.create({
      roomId: new ObjectId(req.params.roomId),
      senderId: new ObjectId(req.user.id),
      content: req.body.content,
      channel: req.body.channel || 'GROUP',
      targetId: req.body.targetId ? new ObjectId(req.body.targetId) : undefined,
    });

    await msg.populate('senderId', 'id fullName avatar');
    res.status(201).json({ success: true, data: msg });
  } catch (err) {
    next(err);
  }
};
