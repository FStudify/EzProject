'use strict';

const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
  name: { type: String, required: true, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

const documentSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  folderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
  name: { type: String, required: true, trim: true },
  fileType: {
    type: String,
    enum: ['DOC', 'PDF', 'PPT', 'ZIP', 'IMG', 'OTHER'],
    default: 'OTHER',
  },
  size: { type: String, required: true },
  fileUrl: { type: String, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  uploadDate: { type: Date, default: Date.now },
}, { timestamps: true });

folderSchema.index({ projectId: 1, parentId: 1 });
documentSchema.index({ projectId: 1, folderId: 1 });

const Folder = mongoose.model('Folder', folderSchema);
const Document = mongoose.model('Document', documentSchema);

module.exports = { Folder, Document };
