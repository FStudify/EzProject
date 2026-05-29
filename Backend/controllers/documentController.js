'use strict';

const mongoose = require('mongoose');
const Project = require('../models/Project');
const { Folder, Document } = require('../models/Document');
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
    const { folderId, search, fileType } = req.query;
    const pid = new ObjectId(req.params.projectId);

    const folderMatch = { projectId: pid };
    if (folderId !== undefined) {
      folderMatch.parentId = folderId === 'null' ? null : new ObjectId(folderId);
    }

    const docMatch = { projectId: pid };
    if (folderId !== undefined) {
      docMatch.folderId = folderId === 'null' ? null : new ObjectId(folderId);
    }
    if (search) docMatch.name = { $regex: search, $options: 'i' };
    if (fileType) docMatch.fileType = fileType;

    const [folders, files] = await Promise.all([
      Folder.aggregate([
        { $match: folderMatch },
        { $sort: { name: 1 } },
        {
          $lookup: {
            from: 'documents',
            localField: '_id',
            foreignField: 'folderId',
            as: 'docs',
          },
        },
        { $addFields: { fileCount: { $size: '$docs' } } },
        { $project: { docs: 0, __v: 0 } },
      ]),
      Document.aggregate([
        { $match: docMatch },
        { $sort: { uploadDate: -1 } },
        {
          $lookup: {
            from: 'users',
            localField: 'uploadedBy',
            foreignField: '_id',
            as: 'uploader',
          },
        },
        { $unwind: '$uploader' },
        { $project: { __v: 0 } },
      ]),
    ]);

    res.json({ success: true, data: { folders, files } });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    await checkMember(req.params.projectId, req.user.id);
    const doc = await Document.create({
      projectId: new ObjectId(req.params.projectId),
      uploadedBy: new ObjectId(req.user.id),
      folderId: req.body.folderId ? new ObjectId(req.body.folderId) : undefined,
      ...req.body,
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
};

exports.rename = async (req, res, next) => {
  try {
    await checkMember(req.params.projectId, req.user.id);
    const doc = await Document.findByIdAndUpdate(
      req.params.docId,
      { $set: { name: req.body.name } },
      { new: true },
    );
    if (!doc) throw errors.NotFound('Document');
    res.json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    await checkMember(req.params.projectId, req.user.id);
    const doc = await Document.findByIdAndDelete(req.params.docId);
    if (!doc) throw errors.NotFound('Document');
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

exports.createFolder = async (req, res, next) => {
  try {
    await checkMember(req.params.projectId, req.user.id);
    const folder = await Folder.create({
      projectId: new ObjectId(req.params.projectId),
      createdBy: new ObjectId(req.user.id),
      parentId: req.body.parentId ? new ObjectId(req.body.parentId) : undefined,
      name: req.body.name,
    });
    res.status(201).json({ success: true, data: folder });
  } catch (err) {
    next(err);
  }
};

exports.renameFolder = async (req, res, next) => {
  try {
    const folder = await Folder.findByIdAndUpdate(
      req.params.folderId,
      { $set: { name: req.body.name } },
      { new: true },
    );
    if (!folder) throw errors.NotFound('Folder');
    res.json({ success: true, data: folder });
  } catch (err) {
    next(err);
  }
};

exports.deleteFolder = async (req, res, next) => {
  try {
    const folder = await Folder.findByIdAndDelete(req.params.folderId);
    if (!folder) throw errors.NotFound('Folder');
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
