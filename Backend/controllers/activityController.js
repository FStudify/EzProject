'use strict';

const mongoose = require('mongoose');
const { Activity } = require('../models/Activity');
const Project = require('../models/Project');
const { errors } = require('../middlewares/errorHandler');

const ObjectId = mongoose.Types.ObjectId;

exports.list = async (req, res, next) => {
  try {
    const project = await Project.findOne({
      _id: new ObjectId(req.params.projectId),
      'members.userId': new ObjectId(req.user.id),
    }).lean();
    if (!project) throw errors.Forbidden('You are not a member of this project');

    const limit = parseInt(req.query.limit || '20', 10);
    const activities = await Activity.find({
      projectId: new ObjectId(req.params.projectId),
    })
      .populate('userId', 'id fullName avatar')
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    res.json({ success: true, data: activities });
  } catch (err) {
    next(err);
  }
};
