'use strict';

const mongoose = require('mongoose');
const Project = require('../models/Project');
const { Document } = require('../models/Document');
const { Activity } = require('../models/Activity');
const { errors } = require('../middlewares/errorHandler');

const ObjectId = mongoose.Types.ObjectId;

// ── URL pattern detector ───────────────────────────────────────
const URL_PATTERNS = [
  { type: 'google_doc', match: /^https?:\/\/(?:[\w-]+\.)?docs\.google\.com\/document\/d\/[\w-]+/i },
  { type: 'google_sheet', match: /^https?:\/\/(?:[\w-]+\.)?docs\.google\.com\/spreadsheets\/d\/[\w-]+/i },
  { type: 'google_slide', match: /^https?:\/\/(?:[\w-]+\.)?docs\.google\.com\/presentation\/d\/[\w-]+/i },
  { type: 'figma', match: /^https?:\/\/(?:www\.)?figma\.com\/(?:file|design|proto)\//i },
  { type: 'github', match: /^https?:\/\/(?:www\.)?github\.com\/[\w.-]+\/[\w.-]+/i },
  { type: 'notion', match: /^https?:\/\/(?:www\.)?notion\.so\//i },
];

function detectDocumentType(url) {
  if (!url) return 'other';
  const trimmed = url.trim();
  for (const { type, match } of URL_PATTERNS) {
    if (match.test(trimmed)) return type;
  }
  return 'other';
}

function normalizeUrl(url) {
  const trimmed = String(url || '').trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

function isValidUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

// ── Helpers ────────────────────────────────────────────────────

async function checkMember(projectId, userId) {
  const project = await Project.findOne({
    _id: new ObjectId(projectId),
    'members.userId': new ObjectId(userId),
  }).lean();
  if (!project) throw errors.Forbidden('You are not a member of this project');
  return project.members.find((m) => m.userId.toString() === userId);
}

function serialize(doc) {
  const value = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  const uploader = value.createdBy && typeof value.createdBy === 'object' ? value.createdBy : null;
  return {
    id: value._id.toString(),
    projectId: value.projectId?.toString?.() ?? value.projectId,
    title: value.title,
    description: value.description ?? '',
    type: value.type,
    url: value.url,
    createdBy: uploader
      ? {
          id: uploader._id?.toString?.() ?? uploader.id ?? '',
          fullName: uploader.fullName ?? uploader.name ?? '',
          avatar: uploader.avatar ?? null,
          email: uploader.email,
        }
      : null,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

// ── GET /projects/:projectId/documents ─────────────────────────
exports.list = async (req, res, next) => {
  try {
    await checkMember(req.params.projectId, req.user.id);
    const { type, search } = req.query;
    const pid = new ObjectId(req.params.projectId);

    const match = { projectId: pid };
    if (type) match.type = type;
    if (search) match.title = { $regex: search, $options: 'i' };

    const docs = await Document.find(match)
      .populate('createdBy', 'id fullName avatar email')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: docs.map(serialize) });
  } catch (err) {
    next(err);
  }
};

// ── POST /projects/:projectId/documents ────────────────────────
exports.create = async (req, res, next) => {
  try {
    await checkMember(req.params.projectId, req.user.id);

    const title = String(req.body.title || '').trim();
    const rawUrl = req.body.url;
    const url = normalizeUrl(rawUrl);

    if (!title) throw errors.BadRequest('Title is required');
    if (!url || !isValidUrl(url)) {
      throw errors.BadRequest('A valid URL is required');
    }

    const type = req.body.type || detectDocumentType(url);
    const description = String(req.body.description || '').trim();

    const doc = await Document.create({
      projectId: new ObjectId(req.params.projectId),
      createdBy: new ObjectId(req.user.id),
      title,
      description,
      type,
      url,
    });

    const populated = await Document.findById(doc._id)
      .populate('createdBy', 'id fullName avatar email')
      .lean();

    res.status(201).json({ success: true, data: serialize(populated) });
  } catch (err) {
    next(err);
  }
};

// ── PUT /projects/:projectId/documents/:docId ──────────────────
exports.update = async (req, res, next) => {
  try {
    await checkMember(req.params.projectId, req.user.id);

    const { docId } = req.params;
    const updates = {};

    if (req.body.title !== undefined) {
      const title = String(req.body.title).trim();
      if (!title) throw errors.BadRequest('Title cannot be empty');
      updates.title = title;
    }

    if (req.body.description !== undefined) {
      updates.description = String(req.body.description).trim();
    }

    if (req.body.url !== undefined) {
      const url = normalizeUrl(req.body.url);
      if (!isValidUrl(url)) throw errors.BadRequest('A valid URL is required');
      updates.url = url;
      updates.type = req.body.type || detectDocumentType(url);
    } else if (req.body.type !== undefined) {
      updates.type = req.body.type;
    }

    if (Object.keys(updates).length === 0) {
      throw errors.BadRequest('No fields to update');
    }

    const doc = await Document.findOneAndUpdate(
      {
        _id: new ObjectId(docId),
        projectId: new ObjectId(req.params.projectId),
      },
      { $set: updates },
      { new: true },
    )
      .populate('createdBy', 'id fullName avatar email')
      .lean();

    if (!doc) throw errors.NotFound('Document');
    res.json({ success: true, data: serialize(doc) });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /projects/:projectId/documents/:docId ───────────────
exports.delete = async (req, res, next) => {
  try {
    const member = await checkMember(req.params.projectId, req.user.id);

    const doc = await Document.findOne({
      _id: new ObjectId(req.params.docId),
      projectId: new ObjectId(req.params.projectId),
    });
    if (!doc) throw errors.NotFound('Document');

    const canDelete =
      doc.createdBy.toString() === req.user.id ||
      ['LEADER', 'SUPERVISOR'].includes(member.role) ||
      member.isOwner;

    if (!canDelete) {
      throw errors.Forbidden('Only the creator or leaders can delete this document');
    }

    await Document.findByIdAndDelete(doc._id);

    if (member.role === 'SUPERVISOR' && doc.createdBy.toString() !== req.user.id) {
      await Activity.create({
        projectId: doc.projectId,
        userId: new ObjectId(req.user.id),
        action: 'DELETE_DOCUMENT',
        target: doc.title,
        targetType: 'DOCUMENT',
        targetId: doc._id,
        timestamp: new Date(),
      });
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
