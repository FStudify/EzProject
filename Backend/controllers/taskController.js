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

function ensureValidObjectId(value) {
  if (!ObjectId.isValid(value)) throw errors.NotFound('Project');
}

async function getProjectWithElevatedAccess(projectId, userId) {
  ensureValidObjectId(projectId);
  const project = await Project.findOne({
    _id: new ObjectId(projectId),
    'members.userId': new ObjectId(userId),
  }).lean();
  if (!project) throw errors.Forbidden('You are not a member of this project');

  const member = project.members.find((m) => m.userId.toString() === userId);
  if (!member || !isElevated(member)) {
    throw errors.Forbidden('Only leaders and supervisors can generate tasks with AI');
  }
  if (!project.deadline) throw errors.BadRequest('Set a project deadline before generating tasks');
  return project;
}

function toIsoDateWithinProject(value, projectDeadline) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) throw errors.BadRequest('Each task must have a valid deadline');

  const max = new Date(projectDeadline);
  max.setHours(23, 59, 59, 999);
  if (date > max) throw errors.BadRequest('Task deadline cannot be after the project deadline');
  return date.toISOString();
}

function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : text).trim();

  const parseCandidate = (value) => {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.tasks)) return parsed.tasks;
    throw errors.BadRequest('AI returned an invalid task list');
  };

  try {
    return parseCandidate(candidate);
  } catch {
    // Accept an otherwise-valid JSON array embedded in explanatory text.
    const start = candidate.indexOf('[');
    const end = candidate.lastIndexOf(']');
    if (start === -1 || end === -1 || end < start) {
      throw errors.BadRequest('AI returned an invalid task list');
    }
    try {
      return parseCandidate(candidate.slice(start, end + 1));
    } catch {
      throw errors.BadRequest('AI returned an invalid task list');
    }
  }
}

function normalizeAiDrafts(rawTasks, projectDeadline, requestedCount) {
  if (!Array.isArray(rawTasks) || rawTasks.length < requestedCount) {
    throw errors.BadRequest('AI did not return the requested number of tasks');
  }

  return rawTasks.slice(0, requestedCount).map((raw) => {
    const title = typeof raw?.title === 'string' ? raw.title.trim() : '';
    const description = typeof raw?.description === 'string' ? raw.description.trim() : '';
    if (!title) throw errors.BadRequest('AI returned a task without a title');
    const priority = ['LOW', 'MEDIUM', 'HIGH'].includes(raw?.priority) ? raw.priority : 'MEDIUM';
    return {
      title: title.slice(0, 300),
      description: description.slice(0, 5000),
      deadline: toIsoDateWithinProject(raw?.deadline, projectDeadline),
      priority,
      // Keep this aligned with the existing first Kanban column; do not introduce a new status.
      status: 'BACKLOG',
      assigneeId: null,
    };
  });
}

function logGeminiError(err) {
  const status = err?.status || err?.response?.status || 'unknown';
  const code = err?.code || err?.response?.data?.error?.code || 'unknown';
  const message = typeof err?.message === 'string' ? err.message.slice(0, 500) : 'No error message returned';
  // Deliberately avoid logging the request object, headers, prompt, or API key.
  console.error(`[Gemini] Generation failed (status=${status}, code=${code}): ${message}`);
}

function logGeminiValidationError(projectDeadline, rawText, err) {
  const message = typeof err?.message === 'string' ? err.message : 'Unknown validation error';
  console.error(`[Gemini] Response validation failed (projectDeadline=${new Date(projectDeadline).toISOString()}): ${message}`);
  // Gemini's text can help diagnose invalid JSON while remaining independent of API credentials.
  console.error(`[Gemini] Raw response (first 2000 chars): ${String(rawText).slice(0, 2000)}`);
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

    await recalculateProjectProgress(req.params.projectId);

    res.status(201).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

// ── PUT /projects/:projectId/tasks/:taskId ────────────────────────────────────
// Gap 6: LEADER ✅ | SUPERVISOR ✅ | MEMBER → chỉ task của mình
// Generate drafts only; clients explicitly confirm selected drafts through /bulk.
exports.generateAiTasks = async (req, res, next) => {
  try {
    let project;
    try {
      project = await getProjectWithElevatedAccess(req.params.projectId, req.user.id);
    } catch (err) {
      console.error(`[Gemini] Request rejected before generation: ${err?.message || 'Unknown project, deadline, or permission error'}`);
      throw err;
    }
    if (!process.env.GEMINI_API_KEY) {
      console.error('[Gemini] Generation requested but GEMINI_API_KEY is not configured');
      throw errors.BadRequest('AI generation is not configured. Set GEMINI_API_KEY on the server');
    }

    let GoogleGenerativeAI;
    try {
      ({ GoogleGenerativeAI } = require('@google/generative-ai'));
    } catch {
      throw errors.BadRequest('Gemini AI dependency is not available on the server');
    }

    const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = ai.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });
    const projectDeadline = new Date(project.deadline).toISOString().slice(0, 10);
    const prompt = [
      'You generate actionable child tasks for a project. Return valid JSON only, without markdown or commentary.',
      `Return a JSON array of exactly ${req.body.count} objects; do not wrap it in an object.`,
      'Every object must have: title (string), description (string), deadline (YYYY-MM-DD), priority (LOW, MEDIUM, or HIGH).',
      `Every deadline must be on or before ${projectDeadline}. Do not include assignees or status.`,
      `Project name: ${project.name}`,
      `Project subject: ${project.subject || 'Not provided'}`,
      `Project description: ${project.description || 'Not provided'}`,
      `Project deadline: ${projectDeadline}`,
      `User requirements: ${req.body.prompt}`,
    ].join('\n');

    let result;
    try {
      result = await model.generateContent(prompt);
    } catch (err) {
      logGeminiError(err);
      throw errors.BadRequest('AI could not generate tasks. Please try again later');
    }

    const rawText = result.response.text();
    let drafts;
    try {
      drafts = normalizeAiDrafts(extractJson(rawText), project.deadline, req.body.count);
    } catch (err) {
      logGeminiValidationError(project.deadline, rawText, err);
      throw err;
    }
    console.info(`[Gemini] Generated ${drafts.length} task drafts (projectDeadline=${new Date(project.deadline).toISOString()}, taskDeadlines=${drafts.map((task) => task.deadline).join(', ')})`);
    res.json({ success: true, data: drafts });
  } catch (err) {
    next(err);
  }
};

// Validate every draft before inserting, so a failed request creates no tasks.
exports.bulkCreate = async (req, res, next) => {
  try {
    const project = await getProjectWithElevatedAccess(req.params.projectId, req.user.id);
    const drafts = req.body.tasks.map((task) => ({
      title: task.title,
      description: task.description || null,
      deadline: toIsoDateWithinProject(task.deadline, project.deadline),
      priority: task.priority,
    }));
    const projectId = new ObjectId(req.params.projectId);
    const creatorId = new ObjectId(req.user.id);
    const created = await Task.insertMany(drafts.map((task) => ({
      ...task,
      projectId,
      creatorId,
      assigneeId: null,
      status: 'BACKLOG',
    })));
    await Task.populate(created, [
      { path: 'assigneeId', select: 'id fullName avatar' },
      { path: 'creatorId', select: 'id fullName avatar' },
    ]);
    await recalculateProjectProgress(req.params.projectId);
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
};

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
