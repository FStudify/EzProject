'use strict';

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const Project = require('../models/Project');
const Invitation = require('../models/Invitation');
const InviteLink = require('../models/InviteLink');
const User = require('../models/User');
const { ChatRoom } = require('../models/Chat');
const { Activity } = require('../models/Activity');
const { errors } = require('../middlewares/errorHandler');
const { sendProjectInviteEmail, buildInviteUrl } = require('../services/emailService');

const ObjectId = mongoose.Types.ObjectId;

async function checkOwner(projectId, userId) {
  const project = await Project.findOne({
    _id: new ObjectId(projectId),
    members: {
      $elemMatch: {
        userId: new ObjectId(userId),
        isOwner: true,
      },
    },
  }).lean();
  if (!project) throw errors.Forbidden('Only the project owner can perform this action');
  return project;
}

function normalizeRole(role) {
  const value = String(role || 'MEMBER').toUpperCase();
  const map = {
    OWNER: 'LEADER',
    ADMIN: 'LEADER',
    MANAGER: 'LEADER',
    PROJECT_MANAGER: 'LEADER',
    LEADER: 'LEADER',
    SUPERVISOR: 'SUPERVISOR',
    MEMBER: 'MEMBER',
  };
  return map[value] || 'MEMBER';
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Emit a real-time "you've been invited" event to the invited user.
 * Uses a per-user room "user:<id>" so the toast/list updates instantly
 * without requiring them to refresh.
 */
function notifyInvitedUser(req, invitation, project, invitedUserId) {
  const io = req.app?.get('io');
  if (!io || !invitedUserId) return;
  io.to(`user:${invitedUserId.toString()}`).emit('invitation:new', {
    invitationId: invitation._id?.toString() ?? invitation.id,
    projectId: project._id.toString(),
    projectName: project.name,
    invitedBy: invitation.invitedBy,
    role: invitation.role,
    expiresAt: invitation.expiresAt,
    createdAt: invitation.createdAt || new Date().toISOString(),
  });
}

/**
 * Notify the inviter when their invitee accepts or declines.
 * payload: { invitationId, projectId, projectName, action: 'accepted'|'declined', by }
 */
function notifyInviter(req, invitation, project, action) {
  const io = req.app?.get('io');
  if (!io || !invitation?.invitedBy) return;
  io.to(`user:${invitation.invitedBy.toString()}`).emit('invitation:response', {
    invitationId: invitation._id.toString(),
    projectId: project._id.toString(),
    projectName: project.name,
    invitedUser: invitation.invitedUserId,
    invitedEmail: invitation.invitedEmail,
    invitedUsername: invitation.invitedUsername,
    action, // 'accepted' | 'declined'
    timestamp: new Date().toISOString(),
  });
}

/**
 * Broadcast to ALL members of a project that someone joined.
 * Each member's socket is in room "user:<id>" AND we'll also broadcast
 * to a project room so members browsing the same project see updates instantly.
 */
function broadcastMemberJoined(req, projectId, joinedUserId, role) {
  const io = req.app?.get('io');
  if (!io) return;
  const payload = {
    projectId: projectId.toString(),
    userId: joinedUserId.toString(),
    role,
    timestamp: new Date().toISOString(),
  };
  io.to(`project:${projectId.toString()}`).emit('project:member:joined', payload);
  io.to(`user:${joinedUserId.toString()}`).emit('project:member:joined', payload);
}

/**
 * Broadcast to ALL members + the kicked user that someone was removed.
 */
function broadcastMemberRemoved(req, projectId, removedUserId) {
  const io = req.app?.get('io');
  if (!io) return;
  const payload = {
    projectId: projectId.toString(),
    userId: removedUserId.toString(),
    timestamp: new Date().toISOString(),
  };
  io.to(`project:${projectId.toString()}`).emit('project:member:removed', payload);
  io.to(`user:${removedUserId.toString()}`).emit('project:member:removed', payload);
}

function getProjectMember(project, userId) {
  return project.members.find((m) => m.userId.toString() === userId);
}

async function checkCanInvite(projectId, user) {
  const project = await Project.findById(projectId).lean();
  if (!project) throw errors.NotFound('Project');

  if (user.role === 'ADMIN') return { project, member: null };

  const member = getProjectMember(project, user.id);
  if (!member) throw errors.Forbidden('You are not a member of this project');

  const canInvite = member.isOwner || ['LEADER', 'SUPERVISOR'].includes(member.role);
  if (!canInvite) {
    throw errors.Forbidden('Only the project owner, leader, supervisor, or admin can invite members');
  }

  return { project, member };
}

async function syncMemberToGeneral(projectId, userId, role) {
  const general = await ChatRoom.findOne({ projectId: new ObjectId(projectId), type: 'GENERAL' });
  if (!general) return;

  const already = general.members.map((m) => m.toString()).includes(userId);
  if (!already) general.members.push(new ObjectId(userId));

  general.memberRoles = general.memberRoles.filter((r) => r.userId.toString() !== userId);
  general.memberRoles.push({
    userId: new ObjectId(userId),
    role: role === 'LEADER' ? 'ADMIN' : 'MEMBER',
    joinedAt: new Date(),
  });

  await general.save();
}

async function acceptInvitationDocument(invitation, user) {
  if (invitation.status !== 'PENDING') {
    throw errors.BadRequest('Invitation has already been processed');
  }

  if (invitation.expiresAt < new Date()) {
    invitation.status = 'EXPIRED';
    await invitation.save();
    throw errors.BadRequest('Invitation has expired');
  }

  const invitedEmail = normalizeEmail(invitation.invitedEmail);
  const userEmail = normalizeEmail(user.email);
  if (invitedEmail && invitedEmail !== userEmail) {
    throw errors.Forbidden('This invitation was sent to a different email address');
  }

  const project = await Project.findById(invitation.projectId).lean();
  if (!project) throw errors.NotFound('Project');

  const alreadyMember = project.members.some((m) => m.userId.toString() === user.id);
  if (alreadyMember) {
    throw errors.BadRequest('You are already a member of this project');
  }

  const role = normalizeRole(invitation.role);
  const acceptedAt = new Date();
  const claimed = await Invitation.findOneAndUpdate(
    { _id: invitation._id, status: 'PENDING', expiresAt: { $gte: acceptedAt } },
    {
      $set: {
        invitedUserId: new ObjectId(user.id),
        status: 'ACCEPTED',
        acceptedAt,
      },
    },
    { new: true },
  );
  if (!claimed) throw errors.BadRequest('Invitation has already been processed or expired');

  let updatedProject;
  try {
    updatedProject = await Project.findOneAndUpdate(
      {
        _id: project._id,
        'members.userId': { $ne: new ObjectId(user.id) },
      },
      {
        $push: {
          members: {
            userId: new ObjectId(user.id),
            role,
            isOwner: false,
            joinedAt: acceptedAt,
          },
        },
      },
      { new: true },
    ).lean();
  } catch (err) {
    await Invitation.updateOne(
      { _id: invitation._id, status: 'ACCEPTED', invitedUserId: new ObjectId(user.id) },
      { $set: { status: 'PENDING', acceptedAt: null, invitedUserId: null } },
    );
    throw err;
  }

  if (!updatedProject) {
    throw errors.BadRequest('You are already a member of this project');
  }

  try {
    await syncMemberToGeneral(project._id, user.id, role);
    await Activity.create({
      projectId: project._id,
      userId: new ObjectId(user.id),
      action: 'joined project via email invite',
      target: project.name,
      targetType: 'project',
      targetId: project._id,
    });
  } catch (err) {
    console.error('[Invite] Member joined but post-accept sync failed:', err.message);
  }

  return { projectId: project._id, projectName: project.name };
}

exports.createEmailInvite = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const email = normalizeEmail(req.body.email);
    const role = normalizeRole(req.body.role);

    if (!email || !isValidEmail(email)) {
      throw errors.BadRequest('A valid email is required');
    }

    const { project } = await checkCanInvite(projectId, req.user);
    const existingUser = await User.findOne({ email }).lean();

    if (existingUser) {
      const alreadyMember = project.members.some(
        (m) => m.userId.toString() === existingUser._id.toString(),
      );
      if (alreadyMember) {
        throw errors.BadRequest('This email already belongs to a project member');
      }
    }

    const existingPending = await Invitation.findOne({
      projectId: new ObjectId(projectId),
      invitedEmail: email,
      status: 'PENDING',
      expiresAt: { $gte: new Date() },
    }).lean();

    if (existingPending?.token) {
      const inviteUrl = buildInviteUrl(existingPending.token);
      return res.json({
        success: true,
        data: {
          id: existingPending._id,
          email,
          role: existingPending.role,
          token: existingPending.token,
          inviteUrl,
          expiresAt: existingPending.expiresAt,
          alreadyInvited: true,
          emailSent: false,
        },
        message: 'Lời mời đã tồn tại',
      });
    }

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await Invitation.create({
      projectId: new ObjectId(projectId),
      invitedBy: new ObjectId(req.user.id),
      invitedUserId: existingUser?._id || null,
      invitedEmail: email,
      invitedUsername: existingUser?.fullName || null,
      token,
      role,
      status: 'PENDING',
      expiresAt,
    });

    const inviter = await User.findById(req.user.id, 'fullName').lean();

    // Respond immediately so the frontend doesn't time out (Render cold-start
    // can take 30s and SMTP may be slow). Email is sent in the background.
    res.status(201).json({
      success: true,
      data: {
        id: invitation._id,
        email,
        role,
        token,
        inviteUrl: buildInviteUrl(token),
        expiresAt,
        emailSent: false,
        emailStatus: 'PENDING',
      },
      message: 'Đã tạo lời mời. Email đang được gửi trong nền.',
    });

    // Real-time push to invited user if they already have an account
    if (existingUser?._id) {
      notifyInvitedUser(req, invitation, project, existingUser._id);
    }

    // Fire-and-forget email send — do NOT block the response.
    setImmediate(async () => {
      try {
        const result = await sendProjectInviteEmail({
          to: email,
          projectName: project.name,
          inviterName: inviter?.fullName || req.user.username || 'A teammate',
          token,
        });
        await Invitation.findByIdAndUpdate(invitation._id, {
          emailSent: result.sent,
          emailStatus: result.reason || (result.sent ? 'SENT' : 'UNCONFIGURED'),
        });
        if (!result.sent) {
          console.warn(`[InviteEmail] Email not sent (${result.reason}) for ${email}`);
        }
      } catch (err) {
        console.error('[InviteEmail] Background send failed:', err.message);
        await Invitation.findByIdAndUpdate(invitation._id, {
          emailSent: false,
          emailStatus: 'SEND_FAILED',
        });
      }
    });

    return;
  } catch (err) {
    next(err);
  }
};

exports.getInviteByToken = async (req, res, next) => {
  try {
    const { token } = req.params;
    const invitation = await Invitation.findOne({ token })
      .populate('projectId', 'name description')
      .populate('invitedBy', 'fullName avatar')
      .lean();

    if (invitation) {
      if (invitation.status !== 'PENDING') {
        throw errors.BadRequest('Invitation has already been processed');
      }
      if (invitation.expiresAt < new Date()) {
        await Invitation.findByIdAndUpdate(invitation._id, { status: 'EXPIRED' });
        throw errors.BadRequest('Invitation has expired');
      }

      return res.json({
        success: true,
        data: {
          kind: 'invitation',
          email: invitation.invitedEmail,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
          project: invitation.projectId,
          invitedBy: invitation.invitedBy,
        },
      });
    }

    // Fallback: token có thể thuộc shareable invite link (InviteLink collection)
    const link = await InviteLink.findOne({ token })
      .populate('projectId', 'name description')
      .populate('createdBy', 'fullName avatar')
      .lean();

    if (!link) throw errors.NotFound('Invitation');
    if (link.expiresAt < new Date()) {
      await InviteLink.deleteOne({ _id: link._id });
      throw errors.BadRequest('Invitation has expired');
    }

    return res.json({
      success: true,
      data: {
        kind: 'invite_link',
        role: 'MEMBER',
        expiresAt: link.expiresAt,
        project: link.projectId,
        invitedBy: link.createdBy,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.acceptInviteByToken = async (req, res, next) => {
  try {
    const { token } = req.params;
    const invitation = await Invitation.findOne({ token });
    if (invitation) {
      const user = await User.findById(req.user.id).lean();
      if (!user) throw errors.NotFound('User');

      const result = await acceptInvitationDocument(invitation, {
        id: req.user.id,
        email: user.email,
      });

      // Email-link accept path: also notify the inviter in real-time
      notifyInviter(req, invitation, { _id: result.projectId, name: result.projectName }, 'accepted');

      // Broadcast to all project members that someone joined via invite
      broadcastMemberJoined(req, result.projectId, req.user.id, invitation.role || 'MEMBER');

      return res.json({
        success: true,
        data: result,
        message: `Đã tham gia dự án "${result.projectName}"`,
      });
    }

    // Fallback: token may belong to a shareable InviteLink
    const link = await InviteLink.findOne({ token });
    if (!link) throw errors.NotFound('Invitation');
    if (link.expiresAt < new Date()) {
      await InviteLink.deleteOne({ _id: link._id });
      throw errors.BadRequest('Invitation has expired');
    }

    const project = await Project.findById(link.projectId);
    if (!project) throw errors.NotFound('Project');

    const alreadyMember = project.members.some(
      (m) => m.userId.toString() === req.user.id,
    );
    if (alreadyMember) {
      return res.json({
        success: true,
        data: { projectId: project._id, projectName: project.name, alreadyMember: true },
        message: 'Bạn đã là thành viên của dự án này',
      });
    }

    project.members.push({
      userId: new ObjectId(req.user.id),
      role: 'MEMBER',
      isOwner: false,
      joinedAt: new Date(),
    });
    await project.save();

    // Delete link after successful use (one-time use)
    await InviteLink.deleteOne({ _id: link._id });

    try {
      const { ChatRoom } = require('../models/Chat');
      const { Activity } = require('../models/Activity');
      const general = await ChatRoom.findOne({ projectId: project._id, type: 'GENERAL' });
      if (general) {
        const already = general.members.map((m) => m.toString()).includes(req.user.id);
        if (!already) general.members.push(new ObjectId(req.user.id));
        general.memberRoles = general.memberRoles.filter((r) => r.userId.toString() !== req.user.id);
        general.memberRoles.push({ userId: new ObjectId(req.user.id), role: 'MEMBER', joinedAt: new Date() });
        await general.save();
      }
      await Activity.create({
        projectId: project._id,
        userId: new ObjectId(req.user.id),
        action: 'joined project via invite link',
        target: project.name,
        targetType: 'project',
        targetId: project._id,
      });
    } catch (err) {
      console.error('[Invite] Link-join post-accept sync failed:', err.message);
    }

    // Notify link creator that someone joined via their link
    notifyInviter(
      req,
      { _id: link._id, invitedBy: link.createdBy, invitedUserId: new ObjectId(req.user.id), invitedEmail: req.user.email },
      project,
      'accepted',
    );

    // Broadcast to all project members that someone joined via invite link
    broadcastMemberJoined(req, project._id, req.user.id, 'MEMBER');

    return res.json({
      success: true,
      data: { projectId: project._id, projectName: project.name },
      message: `Đã tham gia dự án "${project.name}"`,
    });
  } catch (err) {
    next(err);
  }
};

// ─── OWNER: Create manual invitation (by username or email) ──────

function escapeRegex(str) {
  return String(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function findUserByIdentifier(identifier) {
  const raw = String(identifier || '').trim();
  if (!raw) return null;

  const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw);
  if (looksLikeEmail) {
    return User.findOne({ email: raw.toLowerCase() }).lean();
  }

  const exact = escapeRegex(raw);
  return User.findOne({
    $or: [
      { username: { $regex: `^${exact}$`, $options: 'i' } },
      { fullName: { $regex: `^${exact}$`, $options: 'i' } },
    ],
  }).lean();
}

exports.createInvitation = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { username, email } = req.body;

    if (!username && !email) {
      throw errors.BadRequest('username or email is required');
    }

    const project = await checkOwner(projectId, req.user.id);
    const projectOid = new ObjectId(projectId);

    const identifier = (email || username || '').trim();
    const invitedUser = await findUserByIdentifier(identifier);

    if (!invitedUser) {
      throw errors.NotFound('User not found');
    }

    // Check if already a member
    const alreadyMember = project.members.some(
      (m) => m.userId.toString() === invitedUser._id.toString(),
    );
    if (alreadyMember) {
      throw errors.BadRequest('User is already a member of this project');
    }

    // Check for existing pending invitation
    const existing = await Invitation.findOne({
      projectId: projectOid,
      invitedUserId: invitedUser._id,
      status: 'PENDING',
    }).lean();
    if (existing) {
      return res.json({
        success: true,
        data: { id: existing._id, status: existing.status, alreadyInvited: true },
        message: 'Lời mời đã được gửi trước đó',
      });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await Invitation.create({
      projectId: projectOid,
      invitedBy: new ObjectId(req.user.id),
      invitedUserId: invitedUser._id,
      invitedEmail: invitedUser.email,
      invitedUsername: invitedUser.username || invitedUser.fullName,
      status: 'PENDING',
      expiresAt,
    });

    notifyInvitedUser(req, invitation, project, invitedUser._id);

    res.status(201).json({
      success: true,
      data: {
        id: invitation._id,
        invitedUser: {
          id: invitedUser._id,
          fullName: invitedUser.fullName,
          email: invitedUser.email,
          avatar: invitedUser.avatar,
        },
        status: 'PENDING',
        expiresAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── OWNER: List all invitations for a project ───────────────────

exports.listInvitations = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findOne({
      _id: new ObjectId(projectId),
      'members.userId': new ObjectId(req.user.id),
    }).lean();
    if (!project) throw errors.Forbidden('You are not a member of this project');

    const invitations = await Invitation.find({ projectId: new ObjectId(projectId) })
      .populate('invitedBy', 'id fullName avatar')
      .populate('invitedUserId', 'id fullName email avatar')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: invitations });
  } catch (err) {
    next(err);
  }
};

// ─── USER: Accept invitation ──────────────────────────────────────

exports.acceptInvitation = async (req, res, next) => {
  try {
    const { invitationId } = req.params;
    const userId = req.user.id;

    const invitation = await Invitation.findOne({
      _id: new ObjectId(invitationId),
      invitedUserId: new ObjectId(userId),
      status: 'PENDING',
    });
    if (!invitation) throw errors.NotFound('Invitation not found or already processed');

    if (invitation.expiresAt < new Date()) {
      invitation.status = 'EXPIRED';
      await invitation.save();
      throw errors.BadRequest('Invitation has expired');
    }

    const project = await Project.findById(invitation.projectId);
    if (!project) throw errors.NotFound('Project not found');

    // Check if already a member
    const alreadyMember = project.members.some(
      (m) => m.userId.toString() === userId,
    );
    if (alreadyMember) {
      invitation.status = 'ACCEPTED';
      await invitation.save();
      return res.json({
        success: true,
        data: { projectId: project._id, projectName: project.name },
        message: 'Bạn đã là thành viên của dự án này',
      });
    }

    project.members.push({
      userId: new ObjectId(userId),
      role: 'MEMBER',
      isOwner: false,
      joinedAt: new Date(),
    });
    await project.save();

    invitation.status = 'ACCEPTED';
    await invitation.save();

    try {
      await syncMemberToGeneral(project._id, userId, 'MEMBER');
      await Activity.create({
        projectId: project._id,
        userId: new ObjectId(userId),
        action: 'joined project via manual invite',
        target: project.name,
        targetType: 'project',
        targetId: project._id,
      });
    } catch (err) {
      console.error('[Invite] Manual join member post-accept sync failed:', err.message);
    }

    // Notify the inviter in real-time so they see "User accepted your invite"
    notifyInviter(req, invitation, project, 'accepted');

    // Broadcast to all project members so they see the new member instantly
    broadcastMemberJoined(req, project._id, userId, invitation.role || 'MEMBER');

    res.json({
      success: true,
      data: { projectId: project._id, projectName: project.name },
      message: `Đã tham gia dự án "${project.name}"`,
    });
  } catch (err) {
    next(err);
  }
};

// ─── USER: Decline invitation ─────────────────────────────────────

exports.declineInvitation = async (req, res, next) => {
  try {
    const { invitationId } = req.params;
    const userId = req.user.id;

    const invitation = await Invitation.findOne({
      _id: new ObjectId(invitationId),
      invitedUserId: new ObjectId(userId),
      status: 'PENDING',
    });
    if (!invitation) throw errors.NotFound('Invitation not found or already processed');

    invitation.status = 'DECLINED';
    await invitation.save();

    const project = await Project.findById(invitation.projectId).lean();
    if (project) notifyInviter(req, invitation, project, 'declined');

    res.json({ success: true, message: 'Đã từ chối lời mời' });
  } catch (err) {
    next(err);
  }
};

// ─── USER: List my pending invitations ────────────────────────────

exports.myInvitations = async (req, res, next) => {
  try {
    const userId = new ObjectId(req.user.id);

    const invitations = await Invitation.find({
      invitedUserId: userId,
      status: 'PENDING',
    })
      .populate('projectId', 'name')
      .populate('invitedBy', 'id fullName avatar')
      .lean();

    const valid = invitations.filter((i) => i.expiresAt >= new Date());
    const expired = invitations.filter((i) => i.expiresAt < new Date());

    for (const inv of expired) {
      await Invitation.findByIdAndUpdate(inv._id, { status: 'EXPIRED' });
    }

    res.json({ success: true, data: valid });
  } catch (err) {
    next(err);
  }
};

// ─── OWNER: Revoke invitation ─────────────────────────────────────

exports.revokeInvitation = async (req, res, next) => {
  try {
    const { projectId, invitationId } = req.params;

    await checkOwner(projectId, req.user.id);

    await Invitation.findOneAndDelete({
      _id: new ObjectId(invitationId),
      projectId: new ObjectId(projectId),
      status: 'PENDING',
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// ─── OWNER: Cancel invite (alias) ─────────────────────────────────

exports.cancelInvite = async (req, res, next) => {
  try {
    const { projectId, invitationId } = req.params;

    await checkCanInvite(projectId, req.user);

    const result = await Invitation.findOneAndUpdate(
      {
        _id: new ObjectId(invitationId),
        projectId: new ObjectId(projectId),
        status: 'PENDING',
      },
      { $set: { status: 'REVOKED' } },
      { new: true },
    );

    if (!result) {
      throw errors.NotFound('Pending invitation');
    }

    res.json({ success: true, message: 'Đã hủy lời mời' });
  } catch (err) {
    next(err);
  }
};

// ─── OWNER: Resend invite email ──────────────────────────────────

exports.resendInvite = async (req, res, next) => {
  try {
    const { projectId, invitationId } = req.params;

    await checkCanInvite(projectId, req.user);

    const invitation = await Invitation.findOne({
      _id: new ObjectId(invitationId),
      projectId: new ObjectId(projectId),
      status: 'PENDING',
    }).lean();

    if (!invitation) {
      throw errors.NotFound('Pending invitation');
    }

    if (invitation.expiresAt < new Date()) {
      throw errors.BadRequest('Cannot resend an expired invitation');
    }

    const project = await Project.findById(projectId, 'name').lean();
    const inviter = await User.findById(req.user.id, 'fullName').lean();

    const emailResult = await sendProjectInviteEmail({
      to: invitation.invitedEmail,
      projectName: project?.name || 'Project',
      inviterName: inviter?.fullName || req.user.username || 'A teammate',
      token: invitation.token,
    }).catch((err) => {
      console.error('[InviteEmail] Resend failed:', err.message);
      return { sent: false, inviteUrl: buildInviteUrl(invitation.token), reason: 'SEND_FAILED' };
    });

    res.json({
      success: true,
      data: {
        id: invitation._id,
        inviteUrl: emailResult.inviteUrl,
        emailSent: emailResult.sent,
        emailStatus: emailResult.reason || 'SENT',
        expiresAt: invitation.expiresAt,
      },
      message: emailResult.sent ? 'Đã gửi lại email mời' : 'Không thể gửi email. Vui lòng dùng URL lời mời.',
    });
  } catch (err) {
    next(err);
  }
};

