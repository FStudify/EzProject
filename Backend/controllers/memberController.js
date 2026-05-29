'use strict';

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const Project = require('../models/Project');
const InviteLink = require('../models/InviteLink');
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

// ── GET /projects/:projectId/members ─────────────────────────────────────────
exports.list = async (req, res, next) => {
  try {
    const project = await Project.findOne({
      _id: new ObjectId(req.params.projectId),
      'members.userId': new ObjectId(req.user.id),
    }).populate('members.userId', 'id fullName email avatar role').lean();

    if (!project) throw errors.Forbidden('You are not a member of this project');
    res.json({ success: true, data: project.members });
  } catch (err) {
    next(err);
  }
};

// ── PUT /projects/:projectId/members/:userId/role ─────────────────────────────
// isOwner only — đổi project-role của thành viên
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

    // Owner không thể đổi role của chính mình
    if (req.params.userId === req.user.id) {
      throw errors.BadRequest('Cannot change your own role');
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

// ── DELETE /projects/:projectId/members/:userId ───────────────────────────────
// isOwner only — hoặc tự rời nhóm
exports.remove = async (req, res, next) => {
  try {
    const project = await Project.findOne({
      _id: new ObjectId(req.params.projectId),
      'members.userId': new ObjectId(req.user.id),
    }).lean();
    if (!project) throw errors.Forbidden('You are not a member of this project');

    const currentMember = project.members.find((m) => m.userId.toString() === req.user.id);
    const isSelf = req.params.userId === req.user.id;

    // Owner không thể tự rời
    if (isSelf && currentMember?.isOwner) {
      throw errors.BadRequest('Project owner cannot leave. Transfer ownership first.');
    }

    // Chỉ owner mới được xóa người khác
    if (!isSelf && !currentMember?.isOwner) {
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

// ── POST /projects/:projectId/members/invite ──────────────────────────────────
// Tạo invite link, lưu vào DB với TTL 7 ngày
exports.createInvite = async (req, res, next) => {
  try {
    await checkMember(req.params.projectId, req.user.id);

    // Xóa invite cũ của project nếu có
    await InviteLink.deleteMany({ projectId: new ObjectId(req.params.projectId) });

    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await InviteLink.create({
      projectId: new ObjectId(req.params.projectId),
      token,
      createdBy: new ObjectId(req.user.id),
      expiresAt,
    });

    res.json({
      success: true,
      data: {
        inviteLink: `/join/${token}`,
        token,
        expiresAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /join ────────────────────────────────────────────────────────────────
// Người dùng join dự án bằng invite token
exports.joinByInvite = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) throw errors.BadRequest('token is required');

    const invite = await InviteLink.findOne({ token }).lean();
    if (!invite) throw errors.NotFound('Invite link');
    if (invite.expiresAt < new Date()) {
      await InviteLink.deleteOne({ _id: invite._id });
      throw errors.BadRequest('Invite link has expired');
    }

    const project = await Project.findById(invite.projectId);
    if (!project) throw errors.NotFound('Project');

    // Kiểm tra đã là member chưa
    const alreadyMember = project.members.some(
      (m) => m.userId.toString() === req.user.id,
    );
    if (alreadyMember) {
      return res.json({
        success: true,
        data: { projectId: project._id, alreadyMember: true },
        message: 'You are already a member of this project',
      });
    }

    // Thêm vào dự án với role MEMBER
    project.members.push({
      userId: new ObjectId(req.user.id),
      role: 'MEMBER',
      isOwner: false,
      joinedAt: new Date(),
    });
    await project.save();

    res.status(201).json({
      success: true,
      data: { projectId: project._id, projectName: project.name },
      message: `Successfully joined project "${project.name}"`,
    });
  } catch (err) {
    next(err);
  }
};
