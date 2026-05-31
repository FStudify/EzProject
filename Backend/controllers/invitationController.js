'use strict';

const mongoose = require('mongoose');
const Project = require('../models/Project');
const Invitation = require('../models/Invitation');
const User = require('../models/User');
const { errors } = require('../middlewares/errorHandler');

const ObjectId = mongoose.Types.ObjectId;

async function checkOwner(projectId, userId) {
  const project = await Project.findOne({
    _id: new ObjectId(projectId),
    'members.userId': new ObjectId(userId),
    'members.isOwner': true,
  }).lean();
  if (!project) throw errors.Forbidden('Only the project owner can perform this action');
  return project;
}

// ─── OWNER: Create manual invitation (by username or email) ──────

exports.createInvitation = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { username, email } = req.body;

    if (!username && !email) {
      throw errors.BadRequest('username or email is required');
    }

    const project = await checkOwner(projectId, req.user.id);
    const projectOid = new ObjectId(projectId);

    let invitedUser = null;

    if (username) {
      invitedUser = await User.findOne({ fullName: { $regex: `^${username}$`, $options: 'i' } }).lean();
    } else if (email) {
      invitedUser = await User.findOne({ email: email.toLowerCase() }).lean();
    }

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
      invitedUsername: invitedUser.fullName,
      status: 'PENDING',
      expiresAt,
    });

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

    await Project.findOne({
      _id: new ObjectId(projectId),
      'members.userId': new ObjectId(req.user.id),
    }).lean();

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

    const invitation = await Invitation.findOne({
      _id: new ObjectId(invitationId),
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
