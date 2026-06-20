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
        message: 'Invitation already exists',
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
    let emailResult;
    try {
      emailResult = await sendProjectInviteEmail({
        to: email,
        projectName: project.name,
        inviterName: inviter?.fullName || req.user.username || 'A teammate',
        token,
      });
    } catch (err) {
      console.error('[InviteEmail] Failed to send invite email:', err.message);
      emailResult = { sent: false, inviteUrl: buildInviteUrl(token), reason: 'SEND_FAILED' };
    }

    // Real-time push to invited user if they already have an account
    if (existingUser?._id) {
      notifyInvitedUser(req, invitation, project, existingUser._id);
    }

    res.status(201).json({
      success: true,
      data: {
        id: invitation._id,
        email,
        role,
        token,
        inviteUrl: emailResult.inviteUrl,
        expiresAt,
        emailSent: emailResult.sent,
        emailStatus: emailResult.reason || 'SENT',
      },
      message: emailResult.sent
        ? 'Invitation email sent'
        : 'Invitation created. SMTP is not configured, use inviteUrl for local testing.',
    });
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

      return res.json({
        success: true,
        data: result,
        message: `Successfully joined project "${result.projectName}"`,
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
        message: 'You are already a member of this project',
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

    return res.json({
      success: true,
      data: { projectId: project._id, projectName: project.name },
      message: `Successfully joined project "${project.name}"`,
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
        message: 'Invitation already sent',
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
        message: 'You are already a member of this project',
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

    res.json({
      success: true,
      data: { projectId: project._id, projectName: project.name },
      message: `Successfully joined project "${project.name}"`,
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

    res.json({ success: true, message: 'Invitation declined' });
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

    res.json({ success: true, message: 'Invitation cancelled' });
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
      message: emailResult.sent ? 'Invitation email resent' : 'Email could not be sent. Use the invite URL.',
    });
  } catch (err) {
    next(err);
  }
};

