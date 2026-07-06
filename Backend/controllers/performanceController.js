'use strict';
const mongoose = require('mongoose');
const {
  Activity,
  MemberEvaluation,
  LeaderEvaluation,
  SupervisorEvaluation,
  EVALUATION_CRITERIA,
  MAX_CRITERION_SCORE,
} = require('../models/Activity');
const Task = require('../models/Task');
const { Document } = require('../models/Document');
const Project = require('../models/Project');
const { errors } = require('../middlewares/errorHandler');

const ObjectId = mongoose.Types.ObjectId;

exports.getPerformance = async (req, res, next) => {
  try {
    const project = await Project.findOne({
      _id: new ObjectId(req.params.projectId),
      'members.userId': new ObjectId(req.user.id),
    }).populate('members.userId', 'id fullName avatar').lean();

    if (!project) throw errors.Forbidden('You are not a member of this project');

    const results = await Promise.all(
      project.members.map(async (m) => {
        const uid =
          typeof m.userId === 'object' && m.userId !== null
            ? m.userId._id
            : m.userId;
        const memberId = new ObjectId(uid);

        const [tasksCompleted, tasksInProgress, tasksTodo, docs, evaluation] = await Promise.all([
          Task.countDocuments({
            projectId: project._id,
            assigneeId: memberId,
            status: 'DONE',
          }),
          Task.countDocuments({
            projectId: project._id,
            assigneeId: memberId,
            status: 'IN_PROGRESS',
          }),
          Task.countDocuments({
            projectId: project._id,
            assigneeId: memberId,
            status: { $in: ['BACKLOG', 'REVIEW'] },
          }),
          Document.countDocuments({ projectId: project._id, uploadedBy: memberId }),
          MemberEvaluation.findOne({ projectId: project._id, memberId })
            .sort({ evaluatedAt: -1 })
            .lean(),
        ]);

        const commentsResult = await Task.aggregate([
          { $match: { projectId: project._id } },
          { $unwind: '$comments' },
          { $match: { 'comments.authorId': memberId } },
          { $count: 'total' },
        ]);
        const comments = commentsResult[0]?.total ?? 0;

        const activities = await Activity.find({
          projectId: project._id,
          userId: memberId,
        })
          .sort({ timestamp: -1 })
          .limit(90)
          .lean();

        const byDate = new Map();
        for (const a of activities) {
          const date = a.timestamp.toISOString().slice(0, 10);
          byDate.set(date, Math.min((byDate.get(date) || 0) + 1, 6));
        }
        const contributions = Array.from(byDate.entries())
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => a.date.localeCompare(b.date));

        const score = Math.min(
          100,
          Math.round(tasksCompleted * 8 + tasksInProgress * 3 + docs * 5 + comments * 2),
        );

        return {
          member: m.userId,
          role: m.role,
          isOwner: m.isOwner,
          tasksCompleted,
          tasksInProgress,
          tasksTodo,
          documentsUploaded: docs,
          commentsCount: comments,
          score,
          contributions,
          evaluation: evaluation
            ? {
                rating: evaluation.rating,
                feedback: evaluation.feedback,
                evaluatedAt: evaluation.evaluatedAt,
              }
            : null,
        };
      }),
    );

    res.json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
};

exports.evaluate = async (req, res, next) => {
  try {
    const project = await Project.findOne({
      _id: new ObjectId(req.params.projectId),
      'members.userId': new ObjectId(req.user.id),
    }).lean();
    if (!project) throw errors.Forbidden('You are not a member of this project');

    const member = project.members.find((m) => m.userId.toString() === req.user.id);
    const canEvaluate = member?.isOwner || member?.role === 'LEADER' || member?.role === 'VICE_LEADER' || member?.role === 'SUPERVISOR';
    if (!canEvaluate) {
      throw errors.Forbidden('Only leaders, vice leaders, and supervisors can evaluate');
    }

    await MemberEvaluation.create({
      projectId: new ObjectId(req.params.projectId),
      memberId: new ObjectId(req.body.memberId),
      evaluatorId: new ObjectId(req.user.id),
      rating: req.body.rating,
      feedback: req.body.feedback,
    });

    res.status(201).json({ success: true, data: null, message: 'Đã gửi đánh giá' });
  } catch (err) {
    next(err);
  }
};

/* ====================================================================
 *  Helpers — shared by LeaderEvaluation & SupervisorEvaluation routes
 * ================================================================== */

function pickCriteria(body) {
  const out = {};
  let total = 0;
  for (const key of EVALUATION_CRITERIA) {
    const value = Number(body?.[key]);
    if (!Number.isFinite(value) || value < 0 || value > MAX_CRITERION_SCORE) {
      throw errors.BadRequest(`Invalid score for "${key}" (expected 0..${MAX_CRITERION_SCORE})`);
    }
    out[key] = value;
    total += value;
  }
  out.totalScore = total;
  return out;
}

async function resolveProjectAndMember(req) {
  const project = await Project.findOne({
    _id: new ObjectId(req.params.projectId),
    'members.userId': new ObjectId(req.user.id),
  }).lean();
  if (!project) throw errors.Forbidden('You are not a member of this project');
  const me = project.members.find((m) => m.userId.toString() === req.user.id);
  if (!me) throw errors.Forbidden('Member record not found');

  const target = project.members.find((m) => m.userId.toString() === req.params.memberId);
  if (!target) throw errors.NotFound('Member to evaluate not found in this project');

  return { project, me, target };
}

/* ====================================================================
 *  Leader Evaluation — plan §7.8
 *  Only the Project Leader can create / edit evaluations.
 *  Leader cannot evaluate themselves.
 * ================================================================== */

async function listLeaderEvaluations(req, res, next) {
  try {
    const project = await Project.findOne({
      _id: new ObjectId(req.params.projectId),
      'members.userId': new ObjectId(req.user.id),
    }).lean();
    if (!project) throw errors.Forbidden('You are not a member of this project');

    const evaluations = await LeaderEvaluation.find({
      projectId: project._id,
      memberId: new ObjectId(req.params.memberId),
    })
      .populate('evaluatorId', 'id fullName avatar')
      .sort({ evaluationDate: -1 })
      .lean();

    const latest = evaluations[0] || null;
    res.json({ success: true, data: { latest, history: evaluations } });
  } catch (err) {
    next(err);
  }
}

async function upsertLeaderEvaluation(req, res, next) {
  try {
    const { project, me } = await resolveProjectAndMember(req);

    if (!me.isOwner && me.role !== 'LEADER') {
      throw errors.Forbidden('Only the project leader can submit leader evaluations');
    }
    if (me.isOwner && me.userId.toString() === req.params.memberId) {
      throw errors.BadRequest('You cannot evaluate yourself');
    }

    const criteria = pickCriteria(req.body);

    // One active evaluation per (project, member) — replace the latest.
    const existing = await LeaderEvaluation.findOne({
      projectId: project._id,
      memberId: new ObjectId(req.params.memberId),
    }).sort({ evaluationDate: -1 });

    if (existing) {
      Object.assign(existing, criteria, {
        comment: req.body.comment ?? existing.comment,
        status: req.body.status || 'SUBMITTED',
        updatedAt: new Date(),
      });
      await existing.save();
      return res.json({ success: true, data: existing });
    }

    const created = await LeaderEvaluation.create({
      projectId: project._id,
      memberId: new ObjectId(req.params.memberId),
      evaluatorId: new ObjectId(req.user.id),
      ...criteria,
      comment: req.body.comment,
      status: req.body.status || 'SUBMITTED',
    });
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
}

/* ====================================================================
 *  Supervisor Evaluation — plan §7.9
 *  Only Supervisors can create / edit evaluations.
 * ================================================================== */

async function listSupervisorEvaluations(req, res, next) {
  try {
    const project = await Project.findOne({
      _id: new ObjectId(req.params.projectId),
      'members.userId': new ObjectId(req.user.id),
    }).lean();
    if (!project) throw errors.Forbidden('You are not a member of this project');

    const evaluations = await SupervisorEvaluation.find({
      projectId: project._id,
      memberId: new ObjectId(req.params.memberId),
    })
      .populate('evaluatorId', 'id fullName avatar')
      .sort({ evaluationDate: -1 })
      .lean();

    const latest = evaluations[0] || null;
    res.json({ success: true, data: { latest, history: evaluations } });
  } catch (err) {
    next(err);
  }
}

async function upsertSupervisorEvaluation(req, res, next) {
  try {
    const { project, me } = await resolveProjectAndMember(req);

    if (me.role !== 'SUPERVISOR') {
      throw errors.Forbidden('Only supervisors can submit supervisor evaluations');
    }
    if (me.userId.toString() === req.params.memberId) {
      throw errors.BadRequest('You cannot evaluate yourself');
    }

    const criteria = pickCriteria(req.body);

    const existing = await SupervisorEvaluation.findOne({
      projectId: project._id,
      memberId: new ObjectId(req.params.memberId),
    }).sort({ evaluationDate: -1 });

    if (existing) {
      Object.assign(existing, criteria, {
        comment: req.body.comment ?? existing.comment,
        status: req.body.status || 'SUBMITTED',
        updatedAt: new Date(),
      });
      await existing.save();
      return res.json({ success: true, data: existing });
    }

    const created = await SupervisorEvaluation.create({
      projectId: project._id,
      memberId: new ObjectId(req.params.memberId),
      evaluatorId: new ObjectId(req.user.id),
      ...criteria,
      comment: req.body.comment,
      status: req.body.status || 'SUBMITTED',
    });
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPerformance: exports.getPerformance,
  evaluate: exports.evaluate,
  listLeaderEvaluations,
  upsertLeaderEvaluation,
  listSupervisorEvaluations,
  upsertSupervisorEvaluation,
};