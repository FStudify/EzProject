'use strict';

const mongoose = require('mongoose');
const Project = require('../models/Project');
const Task = require('../models/Task');
const { errors } = require('../middlewares/errorHandler');

const ObjectId = mongoose.Types.ObjectId;

exports.list = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const match = { 'members.userId': new ObjectId(req.user.id) };
    if (status) match.status = status;
    if (search) match.name = { $regex: search, $options: 'i' };

    const [projects, total] = await Promise.all([
      Project.aggregate([
        { $match: match },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: parseInt(limit, 10) },
        {
          $lookup: {
            from: 'users',
            localField: 'ownerId',
            foreignField: '_id',
            as: 'owner',
          },
        },
        { $unwind: '$owner' },
        {
          $addFields: {
            'owner.passwordHash': '***',
          },
        },
        {
          $lookup: {
            from: 'tasks',
            localField: '_id',
            foreignField: 'projectId',
            as: 'tasks',
          },
        },
        {
          $addFields: {
            totalTasks: { $size: '$tasks' },
            completedTasks: {
              $size: {
                $filter: {
                  input: '$tasks',
                  cond: { $eq: ['$$this.status', 'DONE'] },
                },
              },
            },
          },
        },
        { $project: { tasks: 0, passwordHash: 0, __v: 0 } },
      ]),
      Project.countDocuments(match),
    ]);

    res.json({
      success: true,
      data: {
        data: projects,
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const project = await Project.findOne({
      _id: new ObjectId(req.params.projectId),
      'members.userId': new ObjectId(req.user.id),
    })
      .populate('ownerId', 'id fullName avatar')
      .populate('members.userId', 'id fullName email avatar')
      .lean();

    if (!project) throw errors.NotFound('Project');
    res.json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const uid = new ObjectId(req.user.id);
    const members = [
      { userId: uid, role: 'LEADER', isOwner: true, joinedAt: new Date() },
      ...(req.body.members || []).map((m) => ({
        userId: new ObjectId(m.userId),
        role: m.role,
        isOwner: false,
        joinedAt: new Date(),
      })),
    ];

    const project = await Project.create({
      ...req.body,
      deadline: req.body.deadline ? new Date(req.body.deadline) : undefined,
      ownerId: uid,
      members,
    });

    res.status(201).json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const project = await Project.findOne({
      _id: new ObjectId(req.params.projectId),
      'members.userId': new ObjectId(req.user.id),
    });
    if (!project) throw errors.NotFound('Project');

    const update = { ...req.body };
    if (update.deadline) update.deadline = new Date(update.deadline);

    const updated = await Project.findByIdAndUpdate(
      req.params.projectId,
      { $set: update },
      { new: true, runValidators: true },
    );
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const project = await Project.findOne({
      _id: new ObjectId(req.params.projectId),
      'members.userId': new ObjectId(req.user.id),
      'members.isOwner': true,
    });
    if (!project) throw errors.Forbidden('Only the owner can delete this project');

    await Project.findByIdAndDelete(req.params.projectId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

exports.updateProgress = async (req, res, next) => {
  try {
    const project = await Project.findOne({
      _id: new ObjectId(req.params.projectId),
      'members.userId': new ObjectId(req.user.id),
    });
    if (!project) throw errors.NotFound('Project');

    const tasks = await Task.find({
      projectId: new ObjectId(req.params.projectId),
    }).lean();
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === 'DONE').length;
    const progress = total === 0 ? 0 : Math.round((done / total) * 100);

    const updated = await Project.findByIdAndUpdate(
      req.params.projectId,
      { $set: { progress } },
      { new: true },
    );

    res.json({ success: true, data: { progress: updated.progress } });
  } catch (err) {
    next(err);
  }
};
