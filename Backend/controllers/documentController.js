'use strict';

const mongoose = require('mongoose');
const Project = require('../models/Project');
const { Folder, Document } = require('../models/Document');
const { Activity } = require('../models/Activity');
const { errors } = require('../middlewares/errorHandler');
const { fileUrl } = require('../middlewares/upload');
const {
  ALLOWED_MAGIC_TYPES,
  PROJECT_STORAGE_QUOTA_BYTES,
} = require('../config/upload.config');
const {
  safeUnlink,
  resolveSafeUploadPath,
  formatBytes,
  validateDocumentName,
} = require('../utils/fileStorage');

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

function getExtension(originalname) {
  return require('path').extname(originalname).toLowerCase();
}

function detectFileType(mimetype, originalname) {
  const ext = getExtension(originalname);
  if (['.doc', '.docx'].includes(ext)) return 'DOC';
  if (ext === '.pdf') return 'PDF';
  if (['.ppt', '.pptx'].includes(ext)) return 'PPT';
  if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return 'IMG';
  return 'OTHER';
}

function withSizeLabel(document) {
  const value = typeof document.toObject === 'function' ? document.toObject() : document;
  return { ...value, sizeLabel: formatBytes(value.size) };
}

function isSafeText(buffer) {
  if (!buffer || buffer.length === 0) return true;
  const sample = buffer.subarray(0, Math.min(buffer.length, 8192));
  return !sample.some((byte) => {
    if (byte === 9 || byte === 10 || byte === 13) return false;
    return byte < 32 || byte === 127;
  });
}

async function hasOfficeZipMarkers(filePath, ext) {
  const fs = require('fs/promises');
  const buffer = await fs.readFile(filePath);
  const content = buffer.toString('latin1');
  const markerByExt = {
    '.docx': 'word/',
    '.pptx': 'ppt/',
    '.xlsx': 'xl/',
  };

  return content.includes('[Content_Types].xml') && content.includes(markerByExt[ext]);
}

async function validateUploadedFile(file) {
  const ext = getExtension(file.originalname);
  if (ext === '.txt') {
    const fs = require('fs/promises');
    const buffer = await fs.readFile(file.path);
    if (!isSafeText(buffer)) throw errors.BadRequest('Unsupported file type');
    return;
  }

  const allowedMimes = ALLOWED_MAGIC_TYPES[ext];
  if (!allowedMimes) throw errors.BadRequest('Unsupported file type');

  const { fileTypeFromFile } = await import('file-type');
  const detected = await fileTypeFromFile(file.path);
  if (detected?.mime === 'application/zip' && ['.docx', '.pptx', '.xlsx'].includes(ext)) {
    if (await hasOfficeZipMarkers(file.path, ext)) return;
  }

  if (!detected || !allowedMimes.has(detected.mime)) {
    throw errors.BadRequest('Unsupported file type');
  }
}

async function getFolderTreeIds(projectId, rootFolderId) {
  const rootId = new ObjectId(rootFolderId);
  const ids = [rootId];
  const queue = [rootId];

  while (queue.length > 0) {
    const children = await Folder.find({
      projectId,
      parentId: { $in: queue.splice(0) },
    }).select('_id').lean();

    for (const child of children) {
      ids.push(child._id);
      queue.push(child._id);
    }
  }

  return ids;
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

    res.json({ success: true, data: { folders, files: files.map(withSizeLabel) } });
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
    await validateUploadedFile(req.file);

    const projectId = new ObjectId(req.params.projectId);
    const [{ total = 0 } = {}] = await Document.aggregate([
      { $match: { projectId, size: { $type: 'number' } } },
      { $group: { _id: null, total: { $sum: '$size' } } },
    ]);

    if (total + req.file.size > PROJECT_STORAGE_QUOTA_BYTES) {
      await safeUnlink(req.file.path);
      req.file.path = null;
      throw errors.BadRequest('Project storage quota exceeded');
    }

    const name = req.body.name || req.file.originalname;
    if (!validateDocumentName(name)) throw errors.BadRequest('Invalid name');

    const doc = await Document.create({
      projectId,
      uploadedBy: new ObjectId(req.user.id),
      folderId: req.body.folderId ? new ObjectId(req.body.folderId) : undefined,
      name,
      fileType: detectFileType(req.file.mimetype, req.file.originalname),
      size: req.file.size,
      fileUrl: fileUrl(req, req.file.path),
    });

    res.status(201).json({ success: true, data: withSizeLabel(doc) });
  } catch (err) {
    if (req.file?.path) await safeUnlink(req.file.path);
    next(err);
  }
};

// ── PUT /projects/:projectId/documents/:docId ─────────────────────────────────
exports.rename = async (req, res, next) => {
  try {
    await checkMember(req.params.projectId, req.user.id);
    if (!validateDocumentName(req.body.name)) throw errors.BadRequest('Invalid name');
    const doc = await Document.findOneAndUpdate(
      { _id: new ObjectId(req.params.docId), projectId: new ObjectId(req.params.projectId) },
      { $set: { name: req.body.name } },
      { new: true },
    );
    if (!doc) throw errors.NotFound('Document');
    res.json({ success: true, data: withSizeLabel(doc) });
  } catch (err) {
    next(err);
  }
};

// ── GET /projects/:projectId/documents/:docId/download ──────────────────────
exports.download = async (req, res, next) => {
  try {
    await checkMember(req.params.projectId, req.user.id);
    const doc = await Document.findOne({
      _id: new ObjectId(req.params.docId),
      projectId: new ObjectId(req.params.projectId),
    }).lean();
    if (!doc) throw errors.NotFound('Document');

    const filePath = resolveSafeUploadPath(doc.fileUrl);
    if (!filePath) throw errors.NotFound('Document');

    res.download(filePath, doc.name);
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

    await Document.findByIdAndDelete(doc._id);

    if (member.role === 'SUPERVISOR' && doc.uploadedBy.toString() !== req.user.id) {
      await Activity.create({
        projectId: doc.projectId,
        userId: new ObjectId(req.user.id),
        action: 'DELETE_DOCUMENT',
        target: doc.name,
        targetType: 'DOCUMENT',
        targetId: doc._id,
        timestamp: new Date(),
      });
    }

    await safeUnlink(doc.fileUrl);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// ── POST /projects/:projectId/documents/folders ───────────────────────────────
exports.createFolder = async (req, res, next) => {
  try {
    await checkMember(req.params.projectId, req.user.id);
    if (!validateDocumentName(req.body.name)) throw errors.BadRequest('Invalid name');
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
    if (!validateDocumentName(req.body.name)) throw errors.BadRequest('Invalid name');
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
    const projectId = new ObjectId(req.params.projectId);
    const folder = await Folder.findOne({
      _id: new ObjectId(req.params.folderId),
      projectId,
    });
    if (!folder) throw errors.NotFound('Folder');

    const folderIds = await getFolderTreeIds(projectId, folder._id);
    const documents = await Document.find({
      projectId,
      folderId: { $in: folderIds },
    }).lean();

    await Document.deleteMany({ _id: { $in: documents.map((doc) => doc._id) } });
    await Promise.all(documents.map((doc) => safeUnlink(doc.fileUrl)));
    await Folder.deleteMany({ _id: { $in: folderIds }, projectId });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
