'use strict';

const mongoose = require('mongoose');
const Task = require('../models/Task');
const Project = require('../models/Project');
const { errors } = require('../middlewares/errorHandler');

const ObjectId = mongoose.Types.ObjectId;

// ── Helpers ───────────────────────────────────────────────────────────────────

function startOfTodayIso() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
}

function toIsoDate(value) {
  const [y, m, d] = String(value).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d).toISOString();
}

/**
 * Normalize a date string to an ISO timestamp at local 00:00.
 * Returns null when input is invalid.
 */
function toLocalIso(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.valueOf())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
}

/**
 * Format a Date as YYYY-MM-DD in local time.
 */
function toDateStringLocal(date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Build a fallback due date for AI-generated task drafts.
 * Spreads tasks evenly between tomorrow and the project deadline.
 */
function detectLanguage(text) {
  // Vietnamese Unicode range: U+00C0–U+1EF9 (Latin extended with diacritics)
  const viPattern = /[\u00C0-\u00D5\u00D8-\u00F6\u00F8-\u1EF9]/i;
  if (viPattern.test(text)) return 'vi';
  return 'en';
}

function buildAiPrompt(project, minDueDate, requestedCount, userPrompt) {
  const lang = detectLanguage(userPrompt || project.description || project.name || '');
  const langInstruction = lang === 'vi'
    ? 'Respond entirely in Vietnamese. All task titles and descriptions must be in Vietnamese. Use Vietnamese punctuation.'
    : 'Respond entirely in English. All task titles and descriptions must be in English.';

  const overrideMatch = userPrompt.match(/in\s+(english|vietnamese|tiếng\s*anh|tiếng\s*việt)/i);
  if (overrideMatch) {
    const override = overrideMatch[1].toLowerCase();
    if (/tiếng\s*việt|vietnamese/.test(override)) {
      return 'Respond entirely in Vietnamese. All task titles and descriptions must be in Vietnamese. Use Vietnamese punctuation.';
    }
    return 'Respond entirely in English. All task titles and descriptions must be in English.';
  }

  return langInstruction;
}

function buildAiSystemPrompt(project, minDueDate, requestedCount, userPrompt) {
  const langInstruction = buildAiPrompt(project, minDueDate, requestedCount, userPrompt);
  return [
    'You generate actionable child tasks for a project. Return valid JSON only, without markdown or commentary.',
    `Return a JSON array of exactly ${requestedCount} objects; do not wrap it in an object.`,
    'Every object must have: title (string), description (string), deadline (YYYY-MM-DD), priority (LOW, MEDIUM, or HIGH).',
    `HARD RULE: every "deadline" MUST be at least 1 day after today. Today is ${minDueDate}; the minimum allowed dueDate is ${minDueDate} (inclusive). A deadline equal to today or earlier is INVALID.`,
    `Every deadline must be on or before the project deadline (${new Date(project.deadline).toISOString().slice(0, 10)}). Do not include assignees or status.`,
    `Spread the deadlines evenly across the project's timeline (from ${minDueDate} through ${new Date(project.deadline).toISOString().slice(0, 10)}); earlier tasks get earlier due dates, later tasks get later due dates.`,
    langInstruction,
  ].join('\n');
}
  const projectEnd = toLocalIso(projectDeadline);
  const projectEndDate = projectEnd ? new Date(projectEnd) : null;

  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const baseEnd = projectEndDate && projectEndDate > tomorrow
    ? projectEndDate
    : new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000);

  const span = Math.max(1, baseEnd.getTime() - tomorrow.getTime());
  const step = Math.round((span * (index + 1)) / Math.max(1, total + 1));
  const fallback = new Date(tomorrow.getTime() + step);
  return fallback.toISOString();
}

/**
 * Clamp a user-supplied deadline into the project's valid window.
 * Never throws: missing/invalid input falls back to a safe distributed date.
 */
function normalizeBulkDeadline(value, projectDeadline, index, total) {
  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const projectEnd = toLocalIso(projectDeadline);
  const projectEndDate = projectEnd ? new Date(projectEnd) : null;

  const fallback = buildAiFallbackDeadline(index || 0, total || 1, projectDeadline);
  let date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.valueOf())) return fallback;

  if (date < tomorrow) date = tomorrow;
  if (projectEndDate && date > projectEndDate) date = projectEndDate;

  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
}

async function checkMember(projectId, userId) {
  const project = await Project.findOne({
    _id: new ObjectId(projectId),
    'members.userId': new ObjectId(userId),
  }).lean();
  if (!project) throw errors.Forbidden('You are not a member of this project');
  return project.members.find((m) => m.userId.toString() === userId);
}

/**
 * Role helpers:
 * - LEADER: isOwner || role === 'LEADER' (toàn quyền)
 * - VICE_LEADER: role === 'VICE_LEADER' (toàn quyền, trừ kick supervisor/leader)
 * - SUPERVISOR: role === 'SUPERVISOR' (view, đánh giá, không drag/edit task)
 * - MEMBER: chỉ cập nhật status task được gán hoặc tạo, không drag vào DONE/PAUSED
 */
function isLeader(member) {
  return member.isOwner || member.role === 'LEADER';
}

function isViceLeader(member) {
  return member.role === 'VICE_LEADER';
}

function isLeaderOrViceLeader(member) {
  return isLeader(member) || isViceLeader(member);
}

function isElevated(member) {
  return isLeaderOrViceLeader(member) || member.role === 'SUPERVISOR';
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
  if (!isLeaderOrViceLeader(member)) {
    throw errors.Forbidden('Only leaders and vice leaders can generate tasks with AI');
  }
  if (!project.deadline) throw errors.BadRequest('Set a project deadline before generating tasks');
  return project;
}

/**
 * Validate a task deadline:
 *  - Phải là ISO date hợp lệ.
 *  - Phải >= hôm nay (so sánh theo ngày, bỏ qua giờ).
 *  - Nếu có startDate truyền vào, deadline phải >= startDate.
 *  - Không được vượt quá deadline dự án (nếu truyền vào).
 */
function validateTaskDeadline(value, projectDeadline, startDate) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    throw errors.BadRequest('Mỗi công việc phải có deadline hợp lệ');
  }

  const minAllowed = new Date(startOfTodayIso());
  if (date < minAllowed) {
    throw errors.BadRequest('Deadline phải lớn hơn hoặc bằng ngày hiện tại');
  }

  if (startDate) {
    const start = new Date(startDate);
    if (Number.isNaN(start.valueOf())) {
      throw errors.BadRequest('Ngày bắt đầu không hợp lệ');
    }
    if (date < new Date(start.getFullYear(), start.getMonth(), start.getDate())) {
      throw errors.BadRequest('Deadline phải lớn hơn hoặc bằng ngày bắt đầu');
    }
  }

  if (projectDeadline) {
    const max = new Date(projectDeadline);
    max.setHours(23, 59, 59, 999);
    if (date > max) {
      throw errors.BadRequest('Deadline công việc không được sau deadline dự án');
    }
  }

  return date.toISOString();
}

function toIsoDateWithinProject(value, projectDeadline, startDate) {
  return validateTaskDeadline(value, projectDeadline, startDate);
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

  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const projectEnd = toLocalIso(projectDeadline);
  const projectEndDate = projectEnd ? new Date(projectEnd) : null;

  return rawTasks.slice(0, requestedCount).map((raw, index) => {
    const title = typeof raw?.title === 'string' ? raw.title.trim() : '';
    const description = typeof raw?.description === 'string' ? raw.description.trim() : '';
    const priority = ['LOW', 'MEDIUM', 'HIGH'].includes(raw?.priority) ? raw.priority : 'MEDIUM';

    const safeTitle = title || `Task ${index + 1}`;
    const safeDescription = description.length > 5000 ? description.slice(0, 5000) : description;

    let deadline = toLocalIso(raw?.deadline);
    if (!deadline) {
      deadline = buildAiFallbackDeadline(index, requestedCount, projectDeadline);
    }

    const dueDate = new Date(deadline);
    if (Number.isNaN(dueDate.valueOf())) {
      deadline = buildAiFallbackDeadline(index, requestedCount, projectDeadline);
    } else if (dueDate < tomorrow) {
      // AI returned a date that is today or earlier; bump to tomorrow.
      deadline = tomorrow.toISOString();
    } else if (projectEndDate && dueDate > projectEndDate) {
      deadline = projectEndDate.toISOString();
    }

    return {
      title: safeTitle.slice(0, 300),
      description: safeDescription,
      deadline,
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
    const { status, priority, assigneeId, overdue, hashtag } = req.query;

    const match = { projectId: new ObjectId(req.params.projectId) };
    if (status) match.status = status;
    if (priority) match.priority = priority;
    if (assigneeId) match.assigneeId = new ObjectId(assigneeId);
    if (overdue === 'true') {
      match.deadline = { $lt: new Date() };
      match.status = { $nin: ['DONE', 'CANCELLED'] };
    }
    if (hashtag) {
      match.hashtags = { $in: [String(hashtag).trim().toLowerCase().replace(/^#/, '')] };
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
// MEMBER: chỉ tạo task, không gán được task
// LEADER / VICE_LEADER: tạo + gán task (trừ supervisor)
exports.create = async (req, res, next) => {
  try {
    const member = await checkMember(req.params.projectId, req.user.id);
    const assigneeId = req.body.assigneeId ? new ObjectId(req.body.assigneeId) : undefined;

    // If trying to assign someone, only leader/vice-leader can
    if (assigneeId) {
      if (!isLeaderOrViceLeader(member)) {
        throw errors.Forbidden('Only leaders can assign tasks');
      }
      // Cannot assign to supervisor
      const assigneeMember = await Project.findOne({
        _id: new ObjectId(req.params.projectId),
        'members.userId': assigneeId,
      }).lean();
      if (assigneeMember) {
        const am = assigneeMember.members.find((m) => m.userId.toString() === assigneeId.toString());
        if (am && am.role === 'SUPERVISOR') {
          throw errors.Forbidden('Cannot assign tasks to supervisors');
        }
      }
    }

    const task = await Task.create({
      projectId: new ObjectId(req.params.projectId),
      title: req.body.title,
      description: req.body.description ?? null,
      priority: req.body.priority ?? 'MEDIUM',
      deadline: req.body.deadline ? new Date(validateTaskDeadline(req.body.deadline)) : undefined,
      assigneeId,
      creatorId: new ObjectId(req.user.id),
      hashtags: Array.isArray(req.body.hashtags)
        ? req.body.hashtags.map((h) => String(h).trim().toLowerCase().replace(/^#/, '')).filter(Boolean)
        : [],
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDueDate = toDateStringLocal(tomorrow);
    const systemPrompt = buildAiSystemPrompt(project, minDueDate, req.body.count, req.body.prompt);
    const projectPrompt = [
      `Project name: ${project.name}`,
      `Project subject: ${project.subject || 'Not provided'}`,
      `Project description: ${project.description || 'Not provided'}`,
      `Project deadline: ${projectDeadline}`,
      `User requirements: ${req.body.prompt || 'None'}`,
    ].join('\n');

    let result;
    try {
      result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: projectPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
      });
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
// AI drafts have already been normalized on the server, but the client may have
// edited them. Accept any non-empty deadline and clamp it to the project window
// so this endpoint never rejects due to date validation.
exports.bulkCreate = async (req, res, next) => {
  try {
    const project = await getProjectWithElevatedAccess(req.params.projectId, req.user.id);
    const drafts = req.body.tasks.map((task, index) => ({
      title: task.title,
      description: task.description || null,
      deadline: normalizeBulkDeadline(task.deadline, project.deadline, index, req.body.tasks.length),
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

// Status values that only LEADER or VICE_LEADER can move tasks to
const RESTRICTED_STATUSES = new Set(['DONE', 'PAUSED']);

exports.update = async (req, res, next) => {
  try {
    const member = await checkMember(req.params.projectId, req.user.id);
    const task = await Task.findOne({
      _id: new ObjectId(req.params.taskId),
      projectId: new ObjectId(req.params.projectId),
    });
    if (!task) throw errors.NotFound('Task');

    // ── Field-level permission map ────────────────────────────────────────────
    // Only LEADER / VICE_LEADER can edit: title, description, priority,
    // assigneeId, deadline, hashtags, requestType, requestNote.
    const restrictedFields = [
      'title', 'description', 'priority', 'assigneeId',
      'deadline', 'hashtags', 'requestType', 'requestNote',
    ];
    const requestedRestricted = restrictedFields.filter((f) => f in req.body);
    const requestedStatus = 'status' in req.body ? req.body.status : null;

    // ── Case 1: Supervisor ────────────────────────────────────────────────────
    if (member.role === 'SUPERVISOR' && !isLeaderOrViceLeader(member)) {
      // Supervisor can only add comments (handled by addComment endpoint).
      // Any field update attempt is denied.
      if (requestedRestricted.length > 0 || requestedStatus) {
        throw errors.Forbidden('Supervisors cannot edit task fields');
      }
    }

    // ── Case 2: Member (not leader / vice-leader) ────────────────────────────
    if (!isLeaderOrViceLeader(member) && member.role === 'MEMBER') {
      const isAssignee  = task.assigneeId?.toString() === req.user.id;
      const isCreator   = task.creatorId.toString() === req.user.id;

      // Members can only update tasks they created or are assigned to
      if (!isAssignee && !isCreator) {
        throw errors.Forbidden('You can only edit tasks assigned to or created by you');
      }

      // Members cannot edit task fields (title, description, priority, etc.)
      if (requestedRestricted.length > 0) {
        throw errors.Forbidden('You can only update task status');
      }

      // Members can only update status via drag — and only to non-restricted columns
      if (requestedStatus) {
        if (!isAssignee) {
          // Creator-only tasks: member cannot change status unless assigned
          throw errors.Forbidden('Only the assignee can update task status via drag');
        }
        if (RESTRICTED_STATUSES.has(requestedStatus)) {
          throw errors.Forbidden('Only leaders can move tasks to Hoàn thành or Tạm hoãn');
        }
      }
    }

    // ── Case 3: Leader / VICE_LEADER ──────────────────────────────────────────
    // Full access — no additional checks needed.

    const update = { ...req.body };
    if (update.deadline) update.deadline = new Date(validateTaskDeadline(update.deadline));
    if (update.assigneeId) update.assigneeId = new ObjectId(update.assigneeId);
    if (Array.isArray(update.hashtags)) {
      update.hashtags = update.hashtags.map((h) => String(h).trim().toLowerCase().replace(/^#/, '')).filter(Boolean);
    }

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
// LEADER / VICE_LEADER / isOwner: delete any task
// MEMBER: cannot delete
exports.delete = async (req, res, next) => {
  try {
    const member = await checkMember(req.params.projectId, req.user.id);
    const task = await Task.findOne({
      _id: new ObjectId(req.params.taskId),
      projectId: new ObjectId(req.params.projectId),
    });
    if (!task) throw errors.NotFound('Task');

    if (!isLeaderOrViceLeader(member)) {
      throw errors.Forbidden('Only leaders can delete tasks');
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
