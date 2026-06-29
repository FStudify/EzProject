'use strict';

const mongoose = require('mongoose');
const idVirtual = require('./plugins/idVirtual');

/**
 * Announcement — system-wide banners managed by admins.
 * Shown to all users when active and within the [startsAt, endsAt] window.
 */
const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, required: true, maxlength: 5000 },
    type: {
      type: String,
      enum: ['INFO', 'WARNING', 'MAINTENANCE'],
      default: 'INFO',
      index: true,
    },
    isActive: { type: Boolean, default: true, index: true },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
);

announcementSchema.index({ isActive: 1, startsAt: 1, endsAt: 1 });

announcementSchema.plugin(idVirtual);

module.exports = mongoose.model('Announcement', announcementSchema);