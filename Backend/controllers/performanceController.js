'use strict';

const mongoose = require('mongoose');
const { Activity, MemberEvaluation } = require('../models/Activity');
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
    if (!member || member.role === 'MEMBER') {
      throw errors.Forbidden('Only leaders and supervisors can evaluate');
    }

    await MemberEvaluation.create({
      projectId: new ObjectId(req.params.projectId),
      memberId: new ObjectId(req.body.memberId),
      evaluatorId: new ObjectId(req.user.id),
      rating: req.body.rating,
      feedback: req.body.feedback,
    });

    res.status(201).json({ success: true, data: null, message: 'Evaluation submitted' });
  } catch (err) {
    next(err);
  }
};
