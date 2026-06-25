'use strict';

const { z } = require('zod');
const { errors: errorFactory } = require('../middlewares/errorHandler');

const validators = {
  // ── Auth ───────────────────────────────────────────────
  login: z.object({
    username: z.string().trim().min(1, 'Username or email is required'),
    password: z.string().min(1, 'Password is required'),
  }),

  register: z
    .object({
      fullName: z.string().min(1, 'Full name is required'),
      email: z.string().trim().toLowerCase().email('Invalid email format'),
      username: z
        .string()
        .trim()
        .min(3, 'Username must be at least 3 characters')
        .max(30, 'Username too long'),
      password: z.string().min(6, 'Password must be at least 6 characters'),
      confirmPassword: z.string(),
      inviteToken: z.string().optional(),
    })
    .refine((d) => d.password === d.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }),

  refresh: z.object({
    refreshToken: z.string().min(1),
  }),

  changePassword: z
    .object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(6),
      confirmPassword: z.string(),
    })
    .refine((d) => d.newPassword === d.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }),

  // ── Projects ────────────────────────────────────────────
  createProject: z.object({
    name: z.string().min(1, 'Project name is required'),
    description: z.string().optional(),
    subject: z.string().optional(),
    deadline: z.string().optional(),
    members: z
      .array(
        z.object({
          userId: z.string(),
          role: z.enum(['LEADER', 'SUPERVISOR', 'MEMBER']),
        }),
      )
      .optional(),
  }),

  updateProject: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    subject: z.string().optional(),
    deadline: z.string().optional(),
    status: z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED']).optional(),
    progress: z.number().min(0).max(100).optional(),
  }),

  generateProject: z.object({
    idea: z
      .string()
      .trim()
      .min(10, 'Mo ta y tuong phai co it nhat 10 ky tu')
      .max(2000, 'Mo ta qua dai'),
  }),

  // ── Tasks ──────────────────────────────────────────────
  createTask: z.object({
    title: z.string().min(1, 'Task title is required'),
    description: z.string().optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
    assigneeId: z.string().optional(),
    deadline: z.string().optional(),
  }),

  generateAiTasks: z.object({
    prompt: z.string().trim().min(1, 'Prompt is required').max(4000),
    count: z.number().int().min(1).max(20).default(10),
  }),

  bulkCreateTasks: z.object({
    tasks: z.array(z.object({
      title: z.string().trim().min(1, 'Task title is required').max(300),
      description: z.string().trim().max(5000).optional().default(''),
      deadline: z.string().min(1, 'Task deadline is required'),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
    })).min(1, 'Select at least one task').max(20),
  }),

  updateTask: z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    status: z.enum(['BACKLOG', 'IN_PROGRESS', 'REVIEW', 'DONE', 'ON_HOLD', 'CANCELLED']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
    assigneeId: z.string().optional(),
    deadline: z.string().optional(),
  }),

  addComment: z.object({
    content: z.string().min(1, 'Comment content is required'),
    mentions: z.array(z.string()).optional(),
  }),

  // ── Meetings ────────────────────────────────────────────
  createMeeting: z
    .object({
      title: z.string().min(1, 'Meeting title is required').max(200),
      description: z.string().max(2000).optional(),
      type: z.enum(['ONLINE', 'OFFLINE']),
      startTime: z.string(),
      endTime: z.string(),
      location: z.string().max(500).optional(),
      meetingLink: z.string().max(1000).optional(),
      timezone: z.string().optional(),
      attendeeIds: z.array(z.string()),
    })
    .refine((data) => {
      const start = new Date(data.startTime);
      return !Number.isNaN(start.valueOf()) && start > new Date();
    }, {
      message: 'Meeting startTime must be a valid future date',
      path: ['startTime'],
    })
    .refine((data) => {
      const start = new Date(data.startTime);
      const end = new Date(data.endTime);
      return (
        !Number.isNaN(start.valueOf()) &&
        !Number.isNaN(end.valueOf()) &&
        end > start
      );
    }, {
      message: 'Meeting endTime must be after startTime',
      path: ['endTime'],
    }),

  updateMeeting: z
    .object({
      title: z.string().min(1).max(200).optional(),
      description: z.string().max(2000).optional(),
      type: z.enum(['ONLINE', 'OFFLINE']).optional(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      location: z.string().max(500).optional(),
      meetingLink: z.string().max(1000).optional(),
      timezone: z.string().optional(),
      attendeeIds: z.array(z.string()).optional(),
      status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
    })
    .refine((data) => {
      if (!data.startTime) return true;
      const start = new Date(data.startTime);
      return !Number.isNaN(start.valueOf()) && start > new Date();
    }, {
      message: 'Meeting startTime must be a valid future date',
      path: ['startTime'],
    })
    .refine((data) => {
      if (!data.startTime || !data.endTime) return true;
      const start = new Date(data.startTime);
      const end = new Date(data.endTime);
      return (
        !Number.isNaN(start.valueOf()) &&
        !Number.isNaN(end.valueOf()) &&
        end > start
      );
    }, {
      message: 'Meeting endTime must be after startTime',
      path: ['endTime'],
    }),

  rsvp: z.object({
    willAttend: z.boolean(),
    declineReason: z.string().optional(),
  }),

  addAttendees: z.object({
    attendeeIds: z.array(z.string()).min(1, 'At least one attendee is required'),
  }),

  updateSummary: z.object({
    summary: z.string().max(5000).optional(),
  }),

  // ── Chat ────────────────────────────────────────────────
  createRoom: z.object({
    name: z.string().min(1),
    type: z.enum(['GENERAL', 'CHANNEL', 'DIRECT']),
    memberIds: z.array(z.string()).optional(),
  }),

  sendMessage: z.object({
    content: z.string().min(1, 'Message cannot be empty'),
    channel: z.enum(['GROUP', 'TASK', 'DOCUMENT', 'AI']).optional(),
    targetId: z.string().optional(),
  }),

  // ── Members ─────────────────────────────────────────────
  updateRole: z.object({
    role: z.enum(['LEADER', 'SUPERVISOR', 'MEMBER']),
  }),

  createEmailInvite: z.object({
    email: z.string().trim().email('A valid email is required'),
    role: z
      .string()
      .transform((value) => value.toUpperCase())
      .pipe(z.enum(['MEMBER', 'SUPERVISOR', 'LEADER']))
      .default('MEMBER'),
  }),

  // ── Join by invite ────────────────────────────────────────
  joinProject: z.object({
    token: z.string().min(1, 'Invite token is required'),
  }),

  // ── Admin ─────────────────────────────────────────────────
  setSystemRole: z.object({
    role: z.enum(['ADMIN', 'CUSTOMER']),
  }),

  // ── Performance ─────────────────────────────────────────
  evaluate: z.object({
    memberId: z.string(),
    rating: z.number().int().min(1).max(5),
    feedback: z.string().optional(),
  }),

  // ── Users ──────────────────────────────────────────────
  updateProfile: z.object({
    fullName: z.string().optional(),
    phone: z.string().optional(),
    department: z.string().optional(),
    position: z.string().optional(),
    bio: z.string().optional(),
  }),

  updatePreferences: z.object({
    theme: z.enum(['LIGHT', 'DARK']).optional(),
    language: z.enum(['VI', 'EN']).optional(),
  }),

  // ── Documents (link-based) ────────────────────────────────
  listDocuments: z.object({
    type: z.enum(['google_doc', 'google_sheet', 'google_slide', 'figma', 'github', 'notion', 'other']).optional(),
    search: z.string().optional(),
  }),

  createDocumentLink: z.object({
    title: z.string().min(1, 'Title is required').max(255),
    description: z.string().max(2000).optional().default(''),
    url: z.string().min(1, 'URL is required'),
    type: z.enum(['google_doc', 'google_sheet', 'google_slide', 'figma', 'github', 'notion', 'other']).optional(),
  }),

  updateDocumentLink: z
    .object({
      title: z.string().min(1).max(255).optional(),
      description: z.string().max(2000).optional(),
      url: z.string().min(1).optional(),
      type: z.enum(['google_doc', 'google_sheet', 'google_slide', 'figma', 'github', 'notion', 'other']).optional(),
    })
    .refine(
      (d) => d.title !== undefined || d.description !== undefined || d.url !== undefined || d.type !== undefined,
      { message: 'At least one field must be provided' },
    ),
};

function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const errs = result.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      return next(errorFactory.ValidationError(errs));
    }
    req[source] = result.data;
    next();
  };
}

module.exports = { validators, validate };
