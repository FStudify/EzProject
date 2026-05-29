'use strict';

const mongoose = require('mongoose');
const Task = require('../models/Task');
const Project = require('../models/Project');
const { errors } = require('../middlewares/errorHandler');

const ObjectId = mongoose.Types.ObjectId;

// ── Helpers ───────────────────────────────────────────────────────────────────

async function checkMember(projectId, userId) {
  const project = await Project.findOne({
    _id: new ObjectId(projectId),
    'members.userId': new ObjectId(userId),
  }).lean();
  if (!project) throw errors.Forbidden('You are not a member of this project');
  return project.members.find((m) => m.userId.toString() === userId);
}

/**
 * Gap 6 fix: LEADER, SUPERVISOR, và isOwner đều có elevated permissions.
 * MEMBER chỉ được thao tác với task của chính mình.
 */
function isElevated(member) {
  return member.isOwner || member.role === 'LEADER' || member.role === 'SUPERVISOR';
}

// ── GET /projects/:projectId/tasks ────────────────────────────────────────────
exports.list = async (req, res, next) => {
  try {
    await checkMember(req.params.projectId, req.user.id);
    const { status, priority, assigneeId, overdue } = req.query;

    const match = { projectId: new ObjectId(req.params.projectId) };
    if (status) match.status = status;
    if (priority) match.priority = priority;
    if (assigneeId) match.assigneeId = new ObjectId(assigneeId);
    if (overdue === 'true') {
      match.deadline = { $lt: new Date() };
      match.status = { $nin: ['DONE', 'CANCELLED'] };
    }

    const tasks = await Task.aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },
      { $lookup: { from: 'users', localField: 'assigneeId', foreignField: '_id', as: 'assignee' } },
      { $lookup: { from: 'users', localField: 'creatorId', foreignField: '_id', as: 'creator' } },
      { $unwind: { path: '$assignee', preserveNullAndEmptyArrays: true } },
      { $unwind: '$creator' },
      {
        $addFields: {
          'assignee.passwordHash': '***',
          'creator.passwordHash': '***',
          commentsCount: { $size: { $ifNull: ['$comments', []] } },
        },
      },
      { $project: { passwordHash: 0, __v: 0 } },
    ]);

    res.json({ success: true, data: tasks });
  } catch (err) {
    next(err);
  }
};

// ── GET /projects/:projectId/tasks/:taskId ────────────────────────────────────
exports.getById = async (req, res, next) => {
  try {
    await checkMember(req.params.projectId, req.user.id);
    const task = await Task.findOne({
      _id: new ObjectId(req.params.taskId),
      projectId: new ObjectId(req.params.projectId),
    })
      .populate('assigneeId', 'id fullName avatar')
      .populate('creatorId', 'id fullName avatar')
      .populate('comments.authorId', 'id fullName avatar')
      .lean();

    if (!task) throw errors.NotFound('Task');
    res.json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

// ── POST /projects/:projectId/tasks ───────────────────────────────────────────
// Bất kỳ member nào đều tạo được task
exports.create = async (req, res, next) => {
  try {
    await checkMember(req.params.projectId, req.user.id);

    const task = await Task.create({
      projectId: new ObjectId(req.params.projectId),
      ...req.body,
      deadline: req.body.deadline ? new Date(req.body.deadline) : undefined,
      assigneeId: req.body.assigneeId ? new ObjectId(req.body.assigneeId) : undefined,
      creatorId: new ObjectId(req.user.id),
    });

    await task.populate([
      { path: 'assigneeId', select: 'id fullName avatar' },
      { path: 'creatorId', select: 'id fullName avatar' },
    ]);

    res.status(201).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

// ── PUT /projects/:projectId/tasks/:taskId ────────────────────────────────────
// Gap 6: LEADER ✅ | SUPERVISOR ✅ | MEMBER → chỉ task của mình
exports.update = async (req, res, next) => {
  try {
    const member = await checkMember(req.params.projectId, req.user.id);
    const task = await Task.findOne({
      _id: new ObjectId(req.params.taskId),
      projectId: new ObjectId(req.params.projectId),
    });
    if (!task) throw errors.NotFound('Task');

    if (!isElevated(member)) {
      const isAssignee = task.assigneeId?.toString() === req.user.id;
      const isCreator  = task.creatorId.toString() === req.user.id;
      if (!isAssignee && !isCreator) {
        throw errors.Forbidden('You can only edit tasks assigned to or created by you');
      }
    }

    const update = { ...req.body };
    if (update.deadline) update.deadline = new Date(update.deadline);
    if (update.assigneeId) update.assigneeId = new ObjectId(update.assigneeId);

    const updated = await Task.findByIdAndUpdate(
      req.params.taskId,
      { $set: update },
      { new: true, runValidators: true },
    )
      .populate('assigneeId', 'id fullName avatar')
      .populate('creatorId', 'id fullName avatar');

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /projects/:projectId/tasks/:taskId ─────────────────────────────────
// Gap 6: LEADER ✅ | SUPERVISOR ✅ | MEMBER → chỉ task do mình tạo
exports.delete = async (req, res, next) => {
  try {
    const member = await checkMember(req.params.projectId, req.user.id);
    const task = await Task.findOne({
      _id: new ObjectId(req.params.taskId),
      projectId: new ObjectId(req.params.projectId),
    });
    if (!task) throw errors.NotFound('Task');

    if (!isElevated(member) && task.creatorId.toString() !== req.user.id) {
      throw errors.Forbidden('Only the creator, leader, or supervisor can delete this task');
    }

    await Task.findByIdAndDelete(req.params.taskId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// ── PUT /projects/:projectId/tasks/:taskId/comments ───────────────────────────
exports.addComment = async (req, res, next) => {
  try {
    await checkMember(req.params.projectId, req.user.id);
    const task = await Task.findOne({
      _id: new ObjectId(req.params.taskId),
      projectId: new ObjectId(req.params.projectId),
    });
    if (!task) throw errors.NotFound('Task');

    const comment = {
      authorId: new ObjectId(req.user.id),
      content: req.body.content,
      mentions: req.body.mentions || [],
    };

    await Task.findByIdAndUpdate(req.params.taskId, { $push: { comments: comment } });
    const updated = await Task.findOne({ _id: req.params.taskId })
      .populate('comments.authorId', 'id fullName avatar')
      .lean();

    res.json({ success: true, data: updated.comments.at(-1) });
  } catch (err) {
    next(err);
  }
};
