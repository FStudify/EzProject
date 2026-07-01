'use strict';

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const Project = require('../models/Project');
const InviteLink = require('../models/InviteLink');
const { ChatRoom, ChatMessage } = require('../models/Chat');
const { errors } = require('../middlewares/errorHandler');

const ObjectId = mongoose.Types.ObjectId;

async function syncMemberToGeneral(projectId, userId, action) {
  const general = await ChatRoom.findOne({ projectId: new ObjectId(projectId), type: 'GENERAL' });
  if (!general) return;

  if (action === 'join') {
    const already = general.members.map((m) => m.toString()).includes(userId);
    if (!already) {
      general.members.push(new ObjectId(userId));
      general.memberRoles = general.memberRoles.filter((r) => r.userId.toString() !== userId);
      general.memberRoles.push({ userId: new ObjectId(userId), role: 'MEMBER', joinedAt: new Date() });
      await general.save();
    }
  } else if (action === 'leave') {
    general.members = general.members.filter((m) => m.toString() !== userId);
    general.memberRoles = general.memberRoles.filter((r) => r.userId.toString() !== userId);
    general.chatAdmins = general.chatAdmins.filter((a) => a.toString() !== userId);

    if (general.members.length === 0) {
      await ChatMessage.deleteMany({ roomId: general._id });
      await ChatRoom.findByIdAndDelete(general._id);
    } else {
      await general.save();
    }
  }
}

async function syncMemberToAllChats(projectId, userId, action) {
  const projectObjId = new ObjectId(projectId);
  const userObjId = new ObjectId(userId);
  const rooms = await ChatRoom.find({ projectId: projectObjId });

  for (const room of rooms) {
    const isMember = room.members.map((m) => m.toString()).includes(userId);

    if (action === 'join' && !isMember && room.type === 'GENERAL') {
      // Only auto-join General on project join (rq.md spec)
      continue;
    }
    if (action === 'join') continue;

    if (action === 'leave' && isMember) {
      room.members = room.members.filter((m) => m.toString() !== userId);
      room.memberRoles = room.memberRoles.filter((r) => r.userId.toString() !== userId);
      room.chatAdmins = room.chatAdmins.filter((a) => a.toString() !== userId);

      if (room.members.length === 0) {
        await ChatMessage.deleteMany({ roomId: room._id });
        await ChatRoom.findByIdAndDelete(room._id);
      } else {
        await room.save();
      }
    }
  }
}

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
    res.json({ success: true, data: null, message: 'Đã cập nhật vai trò' });
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

    await syncMemberToAllChats(req.params.projectId, req.params.userId, 'leave');

    // Real-time broadcast: every member (and the kicked user) gets notified
    // so their member list updates instantly without a page reload.
    const io = req.app?.get('io');
    if (io) {
      const payload = {
        projectId: req.params.projectId,
        removedUserId: req.params.userId,
        removedBy: req.user.id,
        bySelf: isSelf,
        timestamp: new Date().toISOString(),
      };
      io.to(`project:${req.params.projectId}`).emit('project:member:removed', payload);
      io.to(`user:${req.params.userId}`).emit('project:member:removed', payload);
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// ── POST /projects/:projectId/members/invite ──────────────────────────────────
// Tạo invite link, lưu vào DB với TTL 3 ngày. Mỗi project có thể có nhiều link
// đang hoạt động; link cũ tự hết hạn nhờ TTL index trên InviteLink.expiresAt.
exports.createInvite = async (req, res, next) => {
  try {
    await checkMember(req.params.projectId, req.user.id);

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 giờ

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
        message: 'Bạn đã là thành viên của dự án này',
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

    await syncMemberToGeneral(project._id, req.user.id, 'join');

    res.status(201).json({
      success: true,
      data: { projectId: project._id, projectName: project.name },
      message: `Đã tham gia dự án "${project.name}"`,
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /projects/:projectId/transfer-ownership ──────────────────
// Owner only — chuyển quyền sở hữu cho thành viên khác
exports.transferOwnership = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { newOwnerId } = req.body;
    if (!newOwnerId) throw errors.BadRequest('newOwnerId is required');

    const project = await Project.findOne({
      _id: new ObjectId(projectId),
      'members.userId': new ObjectId(req.user.id),
      'members.isOwner': true,
    });
    if (!project) throw errors.Forbidden('Only the owner can transfer ownership');

    const currentMember = project.members.find((m) => m.userId.toString() === req.user.id);
    if (!currentMember?.isOwner) throw errors.Forbidden('Only the owner can transfer ownership');
    if (newOwnerId === req.user.id) throw errors.BadRequest('Cannot transfer ownership to yourself');

    const newOwnerMember = project.members.find((m) => m.userId.toString() === newOwnerId);
    if (!newOwnerMember) throw errors.NotFound('Target user is not a member of this project');

    // Swap: old owner → SUPERVISOR, new owner → OWNER
    for (const m of project.members) {
      if (m.userId.toString() === req.user.id) {
        m.isOwner = false;
        m.role = 'SUPERVISOR';
      }
      if (m.userId.toString() === newOwnerId) {
        m.isOwner = true;
        m.role = 'LEADER';
      }
    }
    project.ownerId = new ObjectId(newOwnerId);

    await project.save();

    await project.populate('members.userId', 'id fullName email avatar');

    res.json({ success: true, data: { ownerId: newOwnerId } });
  } catch (err) {
    next(err);
  }
};

// ─── POST /projects/:projectId/leave ──────────────────────────────
// Member rời dự án — xử lý 3 trường hợp:
// 1. MEMBER/SUPERVISOR → xóa khỏi members
// 2. OWNER + còn thành viên → requires newOwnerId
// 3. OWNER là người cuối → xóa project + invitations + links
exports.leaveProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { newOwnerId } = req.body || {};
    const userId = req.user.id;

    const project = await Project.findOne({
      _id: new ObjectId(projectId),
      'members.userId': new ObjectId(userId),
    });
    if (!project) throw errors.NotFound('You are not a member of this project');

    const member = project.members.find((m) => m.userId.toString() === userId);
    const isOwner = member?.isOwner === true;
    const memberCount = project.members.length;

    // CASE 3: Owner là người cuối → xóa project hoàn toàn
    if (isOwner && memberCount === 1) {
      const Invitation = require('../models/Invitation');
      const InviteLink = require('../models/InviteLink');
      await ChatMessage.deleteMany({ roomId: { $in: (await ChatRoom.find({ projectId: project._id }, '_id')).map((r) => r._id) } });
      await ChatRoom.deleteMany({ projectId: project._id });
      await Invitation.deleteMany({ projectId: project._id });
      await InviteLink.deleteMany({ projectId: project._id });
      await Project.findByIdAndDelete(project._id);
      return res.json({ success: true, data: { deleted: true, reason: 'last_owner' } });
    }

    // CASE 2: Owner + còn thành viên khác → require transfer
    if (isOwner && memberCount > 1) {
      if (!newOwnerId) {
        return res.status(400).json({
          success: false,
          message: 'Bạn là chủ sở hữu. Vui lòng chuyển quyền trước khi rời dự án.',
          code: 'OWNER_TRANSFER_REQUIRED',
        });
      }
      const newOwnerMember = project.members.find((m) => m.userId.toString() === newOwnerId);
      if (!newOwnerMember) throw errors.NotFound('New owner is not a member of this project');

      for (const m of project.members) {
        if (m.userId.toString() === userId) {
          m.isOwner = false;
          m.role = 'SUPERVISOR';
        }
        if (m.userId.toString() === newOwnerId) {
          m.isOwner = true;
          m.role = 'LEADER';
        }
      }
      project.ownerId = new ObjectId(newOwnerId);
      project.members = project.members.filter((m) => m.userId.toString() !== userId);

      await project.save();
      await syncMemberToAllChats(projectId, userId, 'leave');
      return res.json({ success: true, data: { transferredTo: newOwnerId } });
    }

    // CASE 1: MEMBER hoặc SUPERVISOR rời
    project.members = project.members.filter((m) => m.userId.toString() !== userId);

    if (project.members.length === 0) {
      const Invitation = require('../models/Invitation');
      const InviteLink = require('../models/InviteLink');
      await ChatMessage.deleteMany({ roomId: { $in: (await ChatRoom.find({ projectId: project._id }, '_id')).map((r) => r._id) } });
      await ChatRoom.deleteMany({ projectId: project._id });
      await Invitation.deleteMany({ projectId: project._id });
      await InviteLink.deleteMany({ projectId: project._id });
      await Project.findByIdAndDelete(project._id);
      return res.json({ success: true, data: { deleted: true, reason: 'last_member' } });
    }

    await project.save();
    await syncMemberToAllChats(projectId, userId, 'leave');
    return res.json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
};
