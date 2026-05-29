'use strict';

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const Project = require('../models/Project');
const { Folder, Document } = require('../models/Document');
const { errors } = require('../middlewares/errorHandler');
const { fileUrl } = require('../middlewares/upload');

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

function detectFileType(mimetype, originalname) {
  const ext = path.extname(originalname).toLowerCase();
  if (['.doc', '.docx'].includes(ext)) return 'DOC';
  if (ext === '.pdf') return 'PDF';
  if (['.ppt', '.pptx'].includes(ext)) return 'PPT';
  if (['.zip', '.rar'].includes(ext)) return 'ZIP';
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) return 'IMG';
  return 'OTHER';
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ── GET /projects/:projectId/documents ────────────────────────────────────────
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
        { $project: { __v: 0, 'uploader.passwordHash': 0 } },
      ]),
    ]);

    res.json({ success: true, data: { folders, files } });
  } catch (err) {
    next(err);
  }
};

// ── POST /projects/:projectId/documents ───────────────────────────────────────
// Nhận file thực từ multipart/form-data (field: "file")
exports.create = async (req, res, next) => {
  try {
    await checkMember(req.params.projectId, req.user.id);

    if (!req.file) throw errors.BadRequest('No file uploaded. Use multipart/form-data with field "file"');

    const doc = await Document.create({
      projectId: new ObjectId(req.params.projectId),
      uploadedBy: new ObjectId(req.user.id),
      folderId: req.body.folderId ? new ObjectId(req.body.folderId) : undefined,
      name: req.body.name || req.file.originalname,
      fileType: detectFileType(req.file.mimetype, req.file.originalname),
      size: formatSize(req.file.size),
      fileUrl: fileUrl(req, req.file.path),
    });

    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    // Xóa file nếu DB lỗi
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    next(err);
  }
};

// ── PUT /projects/:projectId/documents/:docId ─────────────────────────────────
exports.rename = async (req, res, next) => {
  try {
    await checkMember(req.params.projectId, req.user.id);
    const doc = await Document.findOneAndUpdate(
      { _id: new ObjectId(req.params.docId), projectId: new ObjectId(req.params.projectId) },
      { $set: { name: req.body.name } },
      { new: true },
    );
    if (!doc) throw errors.NotFound('Document');
    res.json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /projects/:projectId/documents/:docId ──────────────────────────────
exports.delete = async (req, res, next) => {
  try {
    const member = await checkMember(req.params.projectId, req.user.id);
    const doc = await Document.findOne({
      _id: new ObjectId(req.params.docId),
      projectId: new ObjectId(req.params.projectId),
    });
    if (!doc) throw errors.NotFound('Document');

    // Chỉ uploader hoặc LEADER/SUPERVISOR mới được xóa
    const canDelete =
      doc.uploadedBy.toString() === req.user.id ||
      ['LEADER', 'SUPERVISOR'].includes(member.role);
    if (!canDelete) throw errors.Forbidden('Only the uploader or leaders can delete files');

    // Xóa file vật lý khỏi disk (nếu là local storage)
    const localPath = doc.fileUrl.replace(/^https?:\/\/[^/]+\/public\//, './public/');
    fs.unlink(localPath, () => {}); // fail silently

    await Document.findByIdAndDelete(req.params.docId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// ── POST /projects/:projectId/documents/folders ───────────────────────────────
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

// ── PUT /projects/:projectId/documents/folders/:folderId ─────────────────────
exports.renameFolder = async (req, res, next) => {
  try {
    await checkMember(req.params.projectId, req.user.id);
    const folder = await Folder.findOneAndUpdate(
      { _id: new ObjectId(req.params.folderId), projectId: new ObjectId(req.params.projectId) },
      { $set: { name: req.body.name } },
      { new: true },
    );
    if (!folder) throw errors.NotFound('Folder');
    res.json({ success: true, data: folder });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /projects/:projectId/documents/folders/:folderId ──────────────────
exports.deleteFolder = async (req, res, next) => {
  try {
    const member = await checkMember(req.params.projectId, req.user.id);
    if (!['LEADER', 'SUPERVISOR'].includes(member.role) && !member.isOwner) {
      throw errors.Forbidden('Only leaders or supervisors can delete folders');
    }
    const folder = await Folder.findOneAndDelete({
      _id: new ObjectId(req.params.folderId),
      projectId: new ObjectId(req.params.projectId),
    });
    if (!folder) throw errors.NotFound('Folder');
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
