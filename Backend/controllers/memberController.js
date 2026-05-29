'use strict';

const mongoose = require('mongoose');
const Project = require('../models/Project');
const { errors } = require('../middlewares/errorHandler');

const ObjectId = mongoose.Types.ObjectId;

async function checkMember(projectId, userId) {
  const project = await Project.findOne({
    _id: new ObjectId(projectId),
    'members.userId': new ObjectId(userId),
  }).lean();
  if (!project) throw errors.Forbidden('You are not a member of this project');
  const member = project.members.find((m) => m.userId.toString() === userId);
  return member;
}

exports.list = async (req, res, next) => {
  try {
    const project = await Project.findOne({
      _id: new ObjectId(req.params.projectId),
      'members.userId': new ObjectId(req.user.id),
    }).populate('members.userId', 'id fullName email avatar').lean();

    if (!project) throw errors.Forbidden('You are not a member of this project');
    res.json({ success: true, data: project.members });
  } catch (err) {
    next(err);
  }
};

exports.updateRole = async (req, res, next) => {
  try {
    const project = await Project.findOne({
      _id: new ObjectId(req.params.projectId),
      'members.userId': new ObjectId(req.user.id),
    }).lean();
    if (!project) throw errors.Forbidden('You are not a member of this project');

    const currentMember = project.members.find((m) => m.userId.toString() === req.user.id);
    if (!currentMember?.isOwner) {
      throw errors.Forbidden('Only the project owner can change roles');
    }

    const result = await Project.findOneAndUpdate(
      {
        _id: new ObjectId(req.params.projectId),
        'members.userId': new ObjectId(req.params.userId),
      },
      { $set: { 'members.$.role': req.body.role } },
      { new: true },
    );
    if (!result) throw errors.NotFound('Member');
    res.json({ success: true, data: null, message: 'Role updated' });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const project = await Project.findOne({
      _id: new ObjectId(req.params.projectId),
      'members.userId': new ObjectId(req.user.id),
    }).lean();
    if (!project) throw errors.Forbidden('You are not a member of this project');

    const currentMember = project.members.find((m) => m.userId.toString() === req.user.id);
    if (!currentMember?.isOwner) {
      throw errors.Forbidden('Only the project owner can remove members');
    }

    await Project.findByIdAndUpdate(req.params.projectId, {
      $pull: { members: { userId: new ObjectId(req.params.userId) } },
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

exports.createInvite = async (req, res, next) => {
  try {
    const token = Buffer.from(`${req.params.projectId}:${Date.now()}`).toString('base64url');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    res.json({ success: true, data: { inviteLink: `/join/${token}`, expiresAt } });
  } catch (err) {
    next(err);
  }
};
