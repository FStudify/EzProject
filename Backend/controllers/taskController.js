'use strict';

const mongoose = require('mongoose');
const Task = require('../models/Task');
const Project = require('../models/Project');
const { Notification } = require('../models/Activity');
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

function isProjectMember(project, userId) {
  return project.members.some((m) => m.userId.toString() === userId);
}

async function getProjectForTaskAction(projectId) {
  const project = await Project.findById(projectId).lean();
  if (!project) throw errors.NotFound('Project');
  return project;
}

async function populateTask(taskQuery) {
  return taskQuery
    .populate('assigneeId', 'id fullName avatar email')
    .populate('creatorId', 'id fullName avatar email')
    .populate('reviewerId', 'id fullName avatar email')
    .populate('comments.authorId', 'id fullName avatar email');
}

async function createTaskNotification({ userId, title, body, link }) {
  if (!userId) return;
  await Notification.create({
    userId: new ObjectId(userId),
    type: 'TASK',
    title,
    body,
    link,
  });
}

async function recalculateProjectProgress(projectId) {
  const tasks = await Task.find({ projectId: new ObjectId(projectId) });
  if (tasks.length === 0) {
    await Project.findByIdAndUpdate(projectId, { $set: { progress: 0 } });
    return;
  }
  const doneTasks = tasks.filter((t) => t.status === 'DONE');
  const progress = Math.round((doneTasks.length / tasks.length) * 100);
  await Project.findByIdAndUpdate(projectId, { $set: { progress } });
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
      { $lookup: { from: 'users', localField: 'reviewerId', foreignField: '_id', as: 'reviewer' } },
      { $unwind: { path: '$assignee', preserveNullAndEmptyArrays: true } },
      { $unwind: '$creator' },
      { $unwind: { path: '$reviewer', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          'assignee.passwordHash': '***',
          'creator.passwordHash': '***',
          'reviewer.passwordHash': '***',
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
      .populate('assigneeId', 'id fullName avatar email')
      .populate('creatorId', 'id fullName avatar email')
      .populate('reviewerId', 'id fullName avatar email')
      .populate('comments.authorId', 'id fullName avatar email')
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

    await recalculateProjectProgress(req.params.projectId);

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
    if (update.status === 'REVIEW') {
      if (!update.reviewerId) {
        throw errors.BadRequest('Reviewer is required when moving task to review', 'reviewerId');
      }

      const project = await getProjectForTaskAction(req.params.projectId);
      if (!isProjectMember(project, update.reviewerId)) {
        throw errors.BadRequest('Reviewer must be a project member', 'reviewerId');
      }
      if (update.reviewerId === req.user.id) {
        throw errors.BadRequest('You cannot assign yourself as reviewer', 'reviewerId');
      }

      update.reviewerId = new ObjectId(update.reviewerId);
      update.rejectionReason = null;
      update.reviewedAt = null;
    } else if (update.reviewerId) {
      const project = await getProjectForTaskAction(req.params.projectId);
      if (!isProjectMember(project, update.reviewerId)) {
        throw errors.BadRequest('Reviewer must be a project member', 'reviewerId');
      }
      if (update.reviewerId === req.user.id) {
        throw errors.BadRequest('You cannot assign yourself as reviewer', 'reviewerId');
      }
      update.reviewerId = new ObjectId(update.reviewerId);
    }

    let updated = await Task.findByIdAndUpdate(
      req.params.taskId,
      { $set: update },
      { new: true, runValidators: true },
    )
      .populate('assigneeId', 'id fullName avatar email')
      .populate('creatorId', 'id fullName avatar email')
      .populate('reviewerId', 'id fullName avatar email')
      .populate('comments.authorId', 'id fullName avatar email');

    await recalculateProjectProgress(req.params.projectId);

    if (req.body.status === 'REVIEW' && req.body.reviewerId) {
      await createTaskNotification({
        userId: req.body.reviewerId,
        title: 'Yêu cầu đánh giá công việc',
        body: `Bạn được yêu cầu đánh giá công việc "${updated.title}".`,
        link: `/app/projects/${req.params.projectId}/tasks`,
      });
      updated = await populateTask(Task.findById(req.params.taskId));
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

// ── POST /projects/:projectId/tasks/:taskId/approve ───────────────────────────
exports.approveTask = async (req, res, next) => {
  try {
    await checkMember(req.params.projectId, req.user.id);
    const task = await Task.findOne({
      _id: new ObjectId(req.params.taskId),
      projectId: new ObjectId(req.params.projectId),
    });
    if (!task) throw errors.NotFound('Task');
    if (task.status !== 'REVIEW') throw errors.BadRequest('Task must be in REVIEW status');
    if (!task.reviewerId || task.reviewerId.toString() !== req.user.id) {
      throw errors.Forbidden('Only the assigned reviewer can approve this task');
    }

    const updated = await populateTask(Task.findByIdAndUpdate(
      req.params.taskId,
      { $set: { status: 'DONE', reviewedAt: new Date(), rejectionReason: null } },
      { new: true, runValidators: true },
    ));

    await recalculateProjectProgress(req.params.projectId);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

// ── POST /projects/:projectId/tasks/:taskId/reject ────────────────────────────
exports.rejectTask = async (req, res, next) => {
  try {
    await checkMember(req.params.projectId, req.user.id);
    const task = await Task.findOne({
      _id: new ObjectId(req.params.taskId),
      projectId: new ObjectId(req.params.projectId),
    });
    if (!task) throw errors.NotFound('Task');
    if (task.status !== 'REVIEW') throw errors.BadRequest('Task must be in REVIEW status');
    if (!task.reviewerId || task.reviewerId.toString() !== req.user.id) {
      throw errors.Forbidden('Only the assigned reviewer can reject this task');
    }

    const reason = req.body.reason.trim();
    const updated = await populateTask(Task.findByIdAndUpdate(
      req.params.taskId,
      {
        $set: {
          status: 'IN_PROGRESS',
          rejectionReason: reason,
          reviewedAt: new Date(),
        },
      },
      { new: true, runValidators: true },
    ));

    if (task.assigneeId) {
      await createTaskNotification({
        userId: task.assigneeId.toString(),
        title: 'Công việc bị từ chối',
        body: `Công việc "${task.title}" bị từ chối: ${reason}`,
        link: `/app/projects/${req.params.projectId}/tasks`,
      });
    }

    await recalculateProjectProgress(req.params.projectId);
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
    await recalculateProjectProgress(req.params.projectId);
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
