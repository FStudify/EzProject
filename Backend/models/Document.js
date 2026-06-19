'use strict';

const mongoose = require('mongoose');

/**
 * Document — link-based reference to external resources
 * (Google Docs, Figma, GitHub, Notion, etc.)
 *
 * We don't store files. We store references.
 * This mirrors how Notion, Jira, Trello, ClickUp work.
 */

const DOCUMENT_TYPES = [
  'google_doc',
  'google_sheet',
  'google_slide',
  'figma',
  'github',
  'notion',
  'other',
];

const documentSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    type: {
      type: String,
      enum: DOCUMENT_TYPES,
      required: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
);

documentSchema.index({ projectId: 1, createdAt: -1 });
documentSchema.index({ projectId: 1, type: 1 });

const Document = mongoose.model('Document', documentSchema);

module.exports = { Document, DOCUMENT_TYPES };
