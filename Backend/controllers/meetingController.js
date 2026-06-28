'use strict';

const mongoose = require('mongoose');
const Meeting = require('../models/Meeting');
const Project = require('../models/Project');
const { errors } = require('../middlewares/errorHandler');

const ObjectId = mongoose.Types.ObjectId;

async function getMembership(projectId, userId) {
  const project = await Project.findOne({
    _id: new ObjectId(projectId),
    'members.userId': new ObjectId(userId),
  }).lean();
  if (!project) return null;
  return project.members.find((m) => m.userId.toString() === userId);
}

async function checkMember(projectId, userId) {
  const member = await getMembership(projectId, userId);
  if (!member) throw errors.Forbidden('You are not a member of this project');
  return member;
}

function validateMeetingTimes({ startTime, endTime }, { existingStartTime, existingEndTime } = {}) {
  const now = new Date();
  const start = startTime ? new Date(startTime) : null;
  const end = endTime ? new Date(endTime) : null;

  if (startTime && Number.isNaN(start.valueOf())) {
    throw errors.BadRequest('Invalid startTime');
  }
  if (endTime && Number.isNaN(end.valueOf())) {
    throw errors.BadRequest('Invalid endTime');
  }
  if (start && start <= now) {
    throw errors.BadRequest('Meeting startTime must be in the future');
  }
  const comparisonStart = start || existingStartTime || null;
  const comparisonEnd = end || existingEndTime || null;
  if (comparisonStart && comparisonEnd && comparisonEnd <= comparisonStart) {
    throw errors.BadRequest('Meeting endTime must be after startTime');
  }
}

async function buildMeetingPipeline(matchStage) {
  return Meeting.aggregate([
    { $match: matchStage },
    { $sort: { startTime: 1 } },
    {
      $lookup: {
        from: 'users',
        localField: 'organizerId',
        foreignField: '_id',
        as: 'organizer',
      },
    },
    { $unwind: '$organizer' },
    {
      $lookup: {
        from: 'users',
        localField: 'attendees.userId',
        foreignField: '_id',
        as: 'attendeesDetail',
      },
    },
    {
      $addFields: {
        attendees: {
          $map: {
            input: '$attendees',
            as: 'a',
            in: {
              userId: {
                $arrayElemAt: [
                  {
                    $map: {
                      input: {
                        $filter: {
                          input: '$attendeesDetail',
                          as: 'u',
                          cond: { $eq: ['$$u._id', '$$a.userId'] },
                        },
                      },
                      as: 'uu',
                      in: { _id: '$$uu._id', fullName: '$$uu.fullName', avatar: '$$uu.avatar' },
                    },
                  },
                  0,
                ],
              },
              willAttend: '$$a.willAttend',
              declineReason: '$$a.declineReason',
              respondedAt: '$$a.respondedAt',
            },
          },
        },
      },
    },
    { $project: { __v: 0, 'organizer.passwordHash': 0, attendeesDetail: 0 } },
  ]);
}

function emitMeetingEvent(io, projectId, event, data) {
  if (!io) return;
  io.to(`project:${projectId}`).emit(event, data);
}

// ── GET /projects/:projectId/meetings ───────────────────────────────────────
exports.list = async (req, res, next) => {
  try {
    await checkMember(req.params.projectId, req.user.id);
    const match = { projectId: new ObjectId(req.params.projectId) };
    if (req.query.status) match.status = req.query.status;

    const meetings = await buildMeetingPipeline(match);
    res.json({ success: true, data: meetings });
  } catch (err) {
    next(err);
  }
};

// ── GET /projects/:projectId/meetings/:meetingId ─────────────────────────────
exports.getById = async (req, res, next) => {
  try {
    await checkMember(req.params.projectId, req.user.id);
    const meeting = await Meeting.findOne({
      _id: new ObjectId(req.params.meetingId),
      projectId: new ObjectId(req.params.projectId),
    })
      .populate('organizerId', 'id fullName avatar')
      .populate('attendees.userId', 'id fullName avatar')
      .lean();

    if (!meeting) throw errors.NotFound('Meeting');
    res.json({ success: true, data: meeting });
  } catch (err) {
    next(err);
  }
};

// ── POST /projects/:projectId/meetings ───────────────────────────────────────
exports.create = async (req, res, next) => {
  try {
    const membership = await checkMember(req.params.projectId, req.user.id);

    // Any project member can create a meeting
    validateMeetingTimes(req.body);
    const meeting = await Meeting.create({
      projectId: new ObjectId(req.params.projectId),
      title: req.body.title.trim(),
      description: req.body.description?.trim() || null,
      type: req.body.type,
      startTime: new Date(req.body.startTime),
      endTime: new Date(req.body.endTime),
      location: req.body.location?.trim() || null,
      meetingLink: req.body.meetingLink?.trim() || null,
      timezone: req.body.timezone || 'Asia/Ho_Chi_Minh',
      organizerId: new ObjectId(req.user.id),
      attendees: (req.body.attendeeIds || []).map((uid) => ({
        userId: new ObjectId(uid),
      })),
    });

    const [created] = await buildMeetingPipeline({ _id: meeting._id });

    // Socket event
    const io = req.app.get('io');
    emitMeetingEvent(io, req.params.projectId, 'meeting.created', created);

    res.status(201).json({ success: true, data: created || meeting });
  } catch (err) {
    next(err);
  }
};

// ── PUT /projects/:projectId/meetings/:meetingId ──────────────────────────────
exports.update = async (req, res, next) => {
  try {
    const membership = await checkMember(req.params.projectId, req.user.id);
    const meeting = await Meeting.findOne({
      _id: new ObjectId(req.params.meetingId),
      projectId: new ObjectId(req.params.projectId),
    });
    if (!meeting) throw errors.NotFound('Meeting');

    const now = new Date();
    const alreadyStarted = meeting.startTime <= now;
    const alreadyEnded = meeting.endTime <= now;

    // OWNER: edit everything
    // SUPERVISOR: only meetings they created
    if (membership.role === 'MEMBER') {
      throw errors.Forbidden('Members cannot edit meetings');
    }
    if (membership.role === 'SUPERVISOR' && meeting.organizerId.toString() !== req.user.id) {
      throw errors.Forbidden('Supervisors can only edit meetings they organized');
    }

    // If meeting already started, prevent changing startTime
    if (alreadyStarted && req.body.startTime) {
      throw errors.Forbidden('Cannot change start time of a meeting that has already started');
    }
    // If meeting already ended, read-only
    if (alreadyEnded && !['COMPLETED', 'CANCELLED'].includes(meeting.status)) {
      throw errors.Forbidden('Cannot edit a completed or cancelled meeting');
    }

    if (req.body.startTime || req.body.endTime) {
      validateMeetingTimes(req.body, {
        existingStartTime: meeting.startTime,
        existingEndTime: meeting.endTime,
      });
    }

    // Build update fields
    const allowedFields = ['title', 'description', 'type', 'location', 'meetingLink', 'timezone', 'summary'];
    if (!alreadyStarted) {
      allowedFields.push('startTime', 'endTime');
    }
    // Status can always be changed by owner/supervisor
    if (membership.role === 'OWNER' || meeting.organizerId.toString() === req.user.id) {
      allowedFields.push('status');
    }

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === 'startTime' || field === 'endTime') {
          updates[field] = new Date(req.body[field]);
        } else if (field === 'attendeeIds') {
          // handled separately below
        } else {
          updates[field] = req.body[field];
        }
      }
    }

    // Update attendees if provided
    if (Array.isArray(req.body.attendeeIds)) {
      meeting.attendees = req.body.attendeeIds.map((uid) => ({
        userId: new ObjectId(uid),
        willAttend: meeting.attendees.find(
          (a) => a.userId.toString() === uid,
        )?.willAttend || null,
        declineReason: meeting.attendees.find(
          (a) => a.userId.toString() === uid,
        )?.declineReason || null,
        respondedAt: meeting.attendees.find(
          (a) => a.userId.toString() === uid,
        )?.respondedAt || null,
      }));
    }

    Object.assign(meeting, updates);
    await meeting.save();

    const [updated] = await buildMeetingPipeline({ _id: meeting._id });

    const io = req.app.get('io');
    emitMeetingEvent(io, req.params.projectId, 'meeting.updated', updated);

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /projects/:projectId/meetings/:meetingId ───────────────────────────
exports.delete = async (req, res, next) => {
  try {
    const membership = await checkMember(req.params.projectId, req.user.id);
    const meeting = await Meeting.findOne({
      _id: new ObjectId(req.params.meetingId),
      projectId: new ObjectId(req.params.projectId),
    });
    if (!meeting) throw errors.NotFound('Meeting');

    // OWNER: delete any meeting
    // SUPERVISOR: only meetings they organized
    if (membership.role === 'MEMBER') {
      throw errors.Forbidden('Members cannot delete meetings');
    }
    if (membership.role === 'SUPERVISOR' && meeting.organizerId.toString() !== req.user.id) {
      throw errors.Forbidden('Supervisors can only delete meetings they organized');
    }

    await Meeting.findByIdAndDelete(req.params.meetingId);

    const io = req.app.get('io');
    emitMeetingEvent(io, req.params.projectId, 'meeting.deleted', { _id: req.params.meetingId });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// ── PUT /projects/:projectId/meetings/:meetingId/rsvp ────────────────────────
exports.rsvp = async (req, res, next) => {
  try {
    if (typeof req.body.willAttend !== 'boolean') {
      throw errors.BadRequest('willAttend must be a boolean');
    }
    await checkMember(req.params.projectId, req.user.id);

    const meeting = await Meeting.findOne({
      _id: new ObjectId(req.params.meetingId),
      projectId: new ObjectId(req.params.projectId),
    });
    if (!meeting) throw errors.NotFound('Meeting');

    // Check if user is in attendees list
    const attendee = meeting.attendees.find(
      (a) => a.userId.toString() === req.user.id,
    );
    if (!attendee) {
      // Auto-add as attendee
      meeting.attendees.push({
        userId: new ObjectId(req.user.id),
        willAttend: req.body.willAttend,
        declineReason: req.body.declineReason || null,
        respondedAt: new Date(),
      });
    } else {
      attendee.willAttend = req.body.willAttend;
      attendee.declineReason = req.body.declineReason || null;
      attendee.respondedAt = new Date();
    }
    await meeting.save();

    const [updated] = await buildMeetingPipeline({ _id: meeting._id });

    const io = req.app.get('io');
    emitMeetingEvent(io, req.params.projectId, 'meeting.response.updated', updated);

    res.json({ success: true, data: updated, message: 'Đã cập nhật phản hồi tham dự' });
  } catch (err) {
    next(err);
  }
};

// ── POST /projects/:projectId/meetings/:meetingId/attendees ──────────────────
exports.addAttendees = async (req, res, next) => {
  try {
    const membership = await checkMember(req.params.projectId, req.user.id);
    const { attendeeIds } = req.body;
    if (!Array.isArray(attendeeIds) || attendeeIds.length === 0) {
      throw errors.BadRequest('attendeeIds is required and must be non-empty');
    }

    // Permission: OWNER or SUPERVISOR can add attendees
    if (membership.role === 'MEMBER') {
      throw errors.Forbidden('Members cannot invite attendees');
    }

    const meeting = await Meeting.findOne({
      _id: new ObjectId(req.params.meetingId),
      projectId: new ObjectId(req.params.projectId),
    });
    if (!meeting) throw errors.NotFound('Meeting');

    // Verify all attendees are project members
    const project = await Project.findById(req.params.projectId).lean();
    const projectMemberIds = new Set(project.members.map((m) => m.userId.toString()));

    const alreadyAddedIds = new Set(meeting.attendees.map((a) => a.userId.toString()));
    const newAttendees = [];
    for (const uid of attendeeIds) {
      if (!projectMemberIds.has(uid)) {
        throw errors.BadRequest(`User ${uid} is not a member of this project`);
      }
      if (!alreadyAddedIds.has(uid)) {
        newAttendees.push({ userId: new ObjectId(uid) });
      }
    }

    if (newAttendees.length > 0) {
      meeting.attendees.push(...newAttendees);
      await meeting.save();
    }

    const [updated] = await buildMeetingPipeline({ _id: meeting._id });

    const io = req.app.get('io');
    emitMeetingEvent(io, req.params.projectId, 'meeting.attendee.added', updated);

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /projects/:projectId/meetings/:meetingId/attendees/:userId ─────────
exports.removeAttendee = async (req, res, next) => {
  try {
    const membership = await checkMember(req.params.projectId, req.user.id);
    const meeting = await Meeting.findOne({
      _id: new ObjectId(req.params.meetingId),
      projectId: new ObjectId(req.params.projectId),
    });
    if (!meeting) throw errors.NotFound('Meeting');

    // OWNER: remove any attendee
    // SUPERVISOR: only meetings they organized
    if (membership.role === 'MEMBER') {
      throw errors.Forbidden('Members cannot remove attendees');
    }
    if (membership.role === 'SUPERVISOR' && meeting.organizerId.toString() !== req.user.id) {
      throw errors.Forbidden('Supervisors can only manage attendees of meetings they organized');
    }

    // Cannot remove organizer
    if (meeting.organizerId.toString() === req.params.userId) {
      throw errors.Forbidden('Cannot remove the meeting organizer');
    }

    const hadAttendee = meeting.attendees.some(
      (a) => a.userId.toString() === req.params.userId,
    );
    if (!hadAttendee) throw errors.NotFound('Attendee not found in this meeting');

    meeting.attendees = meeting.attendees.filter(
      (a) => a.userId.toString() !== req.params.userId,
    );
    await meeting.save();

    const [updated] = await buildMeetingPipeline({ _id: meeting._id });

    const io = req.app.get('io');
    emitMeetingEvent(io, req.params.projectId, 'meeting.attendee.removed', updated);

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

// ── PUT /projects/:projectId/meetings/:meetingId/summary ─────────────────────
exports.updateSummary = async (req, res, next) => {
  try {
    await checkMember(req.params.projectId, req.user.id);
    const meeting = await Meeting.findOne({
      _id: new ObjectId(req.params.meetingId),
      projectId: new ObjectId(req.params.projectId),
    });
    if (!meeting) throw errors.NotFound('Meeting');

    meeting.summary = req.body.summary?.trim() || null;
    await meeting.save();

    const [updated] = await buildMeetingPipeline({ _id: meeting._id });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};
