'use strict';

const mongoose = require('mongoose');

const meetingAttendeeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  willAttend: { type: Boolean, default: null },
  declineReason: { type: String, default: null },
  respondedAt: { type: Date, default: null },
}, { _id: false });

const meetingSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: null },
  type: { type: String, enum: ['ONLINE', 'OFFLINE'], required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  location: { type: String, default: null },
  meetingLink: { type: String, default: null },
  status: {
    type: String,
    enum: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
    default: 'SCHEDULED',
  },
  organizerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  attendees: { type: [meetingAttendeeSchema], default: [] },
}, { timestamps: true });

meetingSchema.index({ projectId: 1, startTime: 1 });
meetingSchema.index({ projectId: 1, status: 1 });

module.exports = mongoose.model('Meeting', meetingSchema);
