'use strict';

const mongoose = require('mongoose');
const Meeting = require('../models/Meeting');
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

exports.list = async (req, res, next) => {
  try {
    await checkMember(req.params.projectId, req.user.id);
    const match = { projectId: new ObjectId(req.params.projectId) };
    if (req.query.status) match.status = req.query.status;

    const meetings = await Meeting.aggregate([
      { $match: match },
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

    res.json({ success: true, data: meetings });
  } catch (err) {
    next(err);
  }
};

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

exports.create = async (req, res, next) => {
  try {
    await checkMember(req.params.projectId, req.user.id);
    const meeting = await Meeting.create({
      projectId: new ObjectId(req.params.projectId),
      title: req.body.title,
      description: req.body.description,
      type: req.body.type,
      startTime: new Date(req.body.startTime),
      endTime: new Date(req.body.endTime),
      location: req.body.location,
      meetingLink: req.body.meetingLink,
      organizerId: new ObjectId(req.user.id),
      attendees: (req.body.attendeeIds || []).map((uid) => ({ userId: new ObjectId(uid) })),
    });
    res.status(201).json({ success: true, data: meeting });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    await checkMember(req.params.projectId, req.user.id);
    const meeting = await Meeting.findOne({
      _id: new ObjectId(req.params.meetingId),
      projectId: new ObjectId(req.params.projectId),
    });
    if (!meeting) throw errors.NotFound('Meeting');
    if (meeting.organizerId.toString() !== req.user.id) {
      throw errors.Forbidden('Only the organizer can update this meeting');
    }

    const updated = await Meeting.findByIdAndUpdate(
      req.params.meetingId,
      { $set: req.body },
      { new: true, runValidators: true },
    );
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    await checkMember(req.params.projectId, req.user.id);
    const meeting = await Meeting.findOne({
      _id: new ObjectId(req.params.meetingId),
      projectId: new ObjectId(req.params.projectId),
    });
    if (!meeting) throw errors.NotFound('Meeting');
    if (meeting.organizerId.toString() !== req.user.id) {
      throw errors.Forbidden('Only the organizer can delete this meeting');
    }
    await Meeting.findByIdAndDelete(req.params.meetingId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

exports.rsvp = async (req, res, next) => {
  try {
    if (typeof req.body.willAttend !== 'boolean') {
      throw errors.BadRequest('willAttend must be a boolean');
    }
    await checkMember(req.params.projectId, req.user.id);
    await Meeting.findOneAndUpdate(
      {
        _id: new ObjectId(req.params.meetingId),
        projectId: new ObjectId(req.params.projectId),
        'attendees.userId': new ObjectId(req.user.id),
      },
      {
        $set: {
          'attendees.$.willAttend': req.body.willAttend,
          'attendees.$.declineReason': req.body.declineReason || null,
          'attendees.$.respondedAt': new Date(),
        },
      },
      { new: true },
    );
    res.json({ success: true, data: null, message: 'RSVP updated' });
  } catch (err) {
    next(err);
  }
};
