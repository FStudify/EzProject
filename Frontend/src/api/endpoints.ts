/**
 * ============================================================
 * Centralized Endpoint URLs
 * ============================================================
 *
 * Mọi URL endpoint define o day. Khong hardcode URL trong API module.
 * Dung string template de build URL voi params.
 *
 * Quy tac dat ten: ENTITY_ACTION
 * Vi du: PROJECT_LIST, TASK_GET
 */

const BASE = '/api/v1';

export const Endpoints = {
  // ── Auth ────────────────────────────────────────────────
  AUTH_LOGIN: `${BASE}/auth/login`,
  AUTH_REGISTER: `${BASE}/auth/register`,
  AUTH_REFRESH: `${BASE}/auth/refresh`,
  AUTH_LOGOUT: `${BASE}/auth/logout`,
  AUTH_GOOGLE: `${BASE}/auth/google`,
  AUTH_FORGOT_PASSWORD: `${BASE}/auth/forgot-password`,
  AUTH_RESET_PASSWORD: `${BASE}/auth/reset-password`,
  AUTH_RESET_PASSWORD_VALIDATE: `${BASE}/auth/reset-password/validate`,

  // ── Users ───────────────────────────────────────────────
  USER_ME: `${BASE}/users/me`,
  USER_PREFERENCES: `${BASE}/users/me/preferences`,
  USER_PASSWORD: `${BASE}/users/me/password`,
  USER_NOTIFICATIONS: `${BASE}/users/me/notifications`,
  USER_ACTIVITIES: `${BASE}/users/me/activities`,
  USER_STATS: `${BASE}/users/me/stats`,

  // ── Projects ────────────────────────────────────────────
  PROJECT_LIST: `${BASE}/projects`,
  PROJECT_DETAIL: (id: string) => `${BASE}/projects/${id}`,
  PROJECT_PROGRESS: (id: string) => `${BASE}/projects/${id}/progress`,

  // ── Tasks ───────────────────────────────────────────────
  TASK_LIST: (projectId: string) => `${BASE}/projects/${projectId}/tasks`,
  TASK_DETAIL: (projectId: string, taskId: string) =>
    `${BASE}/projects/${projectId}/tasks/${taskId}`,
  TASK_COMMENTS: (projectId: string, taskId: string) =>
    `${BASE}/projects/${projectId}/tasks/${taskId}/comments`,
  TASK_AI_GENERATE: (projectId: string) => `${BASE}/projects/${projectId}/tasks/ai/generate`,
  TASK_BULK_CREATE: (projectId: string) => `${BASE}/projects/${projectId}/tasks/bulk`,

  // ── Documents ───────────────────────────────────────────
  DOCUMENT_LIST: (projectId: string) => `${BASE}/projects/${projectId}/documents`,
  DOCUMENT_DETAIL: (projectId: string, docId: string) =>
    `${BASE}/projects/${projectId}/documents/${docId}`,
  DOCUMENT_FOLDER: (projectId: string, folderId: string) =>
    `${BASE}/projects/${projectId}/documents/folders/${folderId}`,
  DOCUMENT_FOLDERS: (projectId: string) =>
    `${BASE}/projects/${projectId}/documents/folders`,

  // ── Meetings ────────────────────────────────────────────
  MEETING_LIST: (projectId: string) => `${BASE}/projects/${projectId}/meetings`,
  MEETING_DETAIL: (projectId: string, meetingId: string) =>
    `${BASE}/projects/${projectId}/meetings/${meetingId}`,
  MEETING_RSVP: (projectId: string, meetingId: string) =>
    `${BASE}/projects/${projectId}/meetings/${meetingId}/rsvp`,

  // ── Chat ────────────────────────────────────────────────
  CHAT_ROOMS: (projectId: string) => `${BASE}/projects/${projectId}/chat/rooms`,
  CHAT_MESSAGES: (projectId: string, roomId: string) =>
    `${BASE}/projects/${projectId}/chat/rooms/${roomId}/messages`,
  CHAT_ROOM_CREATE: (projectId: string) => `${BASE}/projects/${projectId}/chat/rooms`,

  // ── AI Chat ────────────────────────────────────────────────
  AI_CHAT: `${BASE}/ai/chat`,
  AI_GENERATE_PROJECT: `${BASE}/ai/generate-project`,

  // ── Members ─────────────────────────────────────────────
  MEMBER_LIST: (projectId: string) => `${BASE}/projects/${projectId}/members`,
  MEMBER_ROLE: (projectId: string, userId: string) =>
    `${BASE}/projects/${projectId}/members/${userId}/role`,
  MEMBER_REMOVE: (projectId: string, userId: string) =>
    `${BASE}/projects/${projectId}/members/${userId}`,
  MEMBER_INVITE: (projectId: string) => `${BASE}/projects/${projectId}/members/invite`,
  EMAIL_INVITE: (projectId: string) => `${BASE}/projects/${projectId}/invite`,
  INVITE_TOKEN: (token: string) => `${BASE}/invite/${token}`,
  INVITE_TOKEN_ACCEPT: (token: string) => `${BASE}/invite/${token}/accept`,
  INVITATION_RESEND: (projectId: string, invitationId: string) =>
    `${BASE}/projects/${projectId}/invitations/${invitationId}/resend`,
  INVITATION_CANCEL: (projectId: string, invitationId: string) =>
    `${BASE}/projects/${projectId}/invitations/${invitationId}`,
  MEMBER_INVITATIONS: (projectId: string) => `${BASE}/projects/${projectId}/members/invitations`,
  INVITATION_ACCEPT: (projectId: string, invitationId: string) =>
    `${BASE}/projects/${projectId}/members/invitations/${invitationId}/accept`,
  INVITATION_DECLINE: (projectId: string, invitationId: string) =>
    `${BASE}/projects/${projectId}/members/invitations/${invitationId}/decline`,
  INVITATION_DETAIL: (projectId: string, invitationId: string) =>
    `${BASE}/projects/${projectId}/members/invitations/${invitationId}`,
  PROJECT_LEAVE: (projectId: string) => `${BASE}/projects/${projectId}/members/leave`,
  PROJECT_TRANSFER: (projectId: string) => `${BASE}/projects/${projectId}/members/transfer-ownership`,
  MY_INVITATIONS: `${BASE}/users/me/invitations`,

  // ── Performance ──────────────────────────────────────────
  PERFORMANCE_LIST: (projectId: string) => `${BASE}/projects/${projectId}/performance`,
  PERFORMANCE_EVALUATE: (projectId: string) =>
    `${BASE}/projects/${projectId}/performance/evaluate`,
  PERFORMANCE_LEADER_EVALUATION: (projectId: string, memberId: string) =>
    `${BASE}/projects/${projectId}/performance/leader/${memberId}`,
  PERFORMANCE_SUPERVISOR_EVALUATION: (projectId: string, memberId: string) =>
    `${BASE}/projects/${projectId}/performance/supervisor/${memberId}`,

  // ── Activities ──────────────────────────────────────────
  ACTIVITY_LIST: (projectId: string) => `${BASE}/projects/${projectId}/activities`,

  // ── Upload ──────────────────────────────────────────────
  UPLOAD_FILE: `${BASE}/upload`,

  // ── User Avatar ─────────────────────────────────────────
  USER_AVATAR: `${BASE}/users/me/avatar`,

  // ── Join by Invite ──────────────────────────────────────
  JOIN_PROJECT: `${BASE}/join`,

  // ── Chat Room Detail ────────────────────────────────────
  CHAT_ROOM_DETAIL: (projectId: string, roomId: string) =>
    `${BASE}/projects/${projectId}/chat/rooms/${roomId}`,
  CHAT_SEND_MESSAGE: (projectId: string, roomId: string) =>
    `${BASE}/projects/${projectId}/chat/rooms/${roomId}/messages`,
  CHAT_ROOM_LEAVE: (projectId: string, roomId: string) =>
    `${BASE}/projects/${projectId}/chat/rooms/${roomId}/leave`,

  // ── Admin ───────────────────────────────────────────────
  ADMIN_STATS: `${BASE}/admin/stats`,
  ADMIN_DASHBOARD_RECENT: `${BASE}/admin/dashboard/recent`,
  ADMIN_USERS: `${BASE}/admin/users`,
  ADMIN_USERS_EXPORT: `${BASE}/admin/users/export`,
  ADMIN_USER_DETAIL: (userId: string) => `${BASE}/admin/users/${userId}`,
  ADMIN_USER_BLOCK: (userId: string) => `${BASE}/admin/users/${userId}/block`,
  ADMIN_USER_UNBLOCK: (userId: string) => `${BASE}/admin/users/${userId}/unblock`,
  ADMIN_USER_ROLE: (userId: string) => `${BASE}/admin/users/${userId}/role`,
  ADMIN_PROJECTS: `${BASE}/admin/projects`,
  ADMIN_PROJECT_DETAIL: (projectId: string) => `${BASE}/admin/projects/${projectId}`,
  ADMIN_LOGS: `${BASE}/admin/logs`,
  ADMIN_HEALTH: `${BASE}/admin/health`,
  ADMIN_EMAIL_STATUS: `${BASE}/admin/email/status`,
  ADMIN_EMAIL_TEST: `${BASE}/admin/email/test`,
  ADMIN_ANNOUNCEMENTS: `${BASE}/admin/announcements`,
  ADMIN_ANNOUNCEMENT_DETAIL: (id: string) => `${BASE}/admin/announcements/${id}`,
  ADMIN_ANNOUNCEMENTS_ACTIVE: `${BASE}/announcements/active`,
  ADMIN_PROFILE: `${BASE}/admin/profile`,
  ADMIN_PROFILE_PASSWORD: `${BASE}/admin/profile/password`,

  // ── Revenue ──────────────────────────────────────────────
  ADMIN_REVENUE_OVERVIEW: `${BASE}/admin/revenue/overview`,
  ADMIN_REVENUE_CHART: `${BASE}/admin/revenue/chart`,
  ADMIN_REVENUE_PLANS: `${BASE}/admin/revenue/plans`,
  ADMIN_REVENUE_STATUS: `${BASE}/admin/revenue/status`,
  ADMIN_REVENUE_PAYMENTS: `${BASE}/admin/revenue/payments`,
  ADMIN_REVENUE_EXPIRING: `${BASE}/admin/revenue/expiring`,
  ADMIN_REVENUE_EXPORT: `${BASE}/admin/revenue/export`,
  ADMIN_REVENUE_SUBSCRIPTIONS: `${BASE}/admin/revenue/subscriptions`,
  ADMIN_REVENUE_TOP_CUSTOMERS: `${BASE}/admin/revenue/top-customers`,

  // ── Payments / Plans ─────────────────────────────────────
  PLANS: `${BASE}/payments/plans`,
  PAYMENT_CREATE: `${BASE}/payments/create`,
  PAYMENT_ME_CURRENT: `${BASE}/payments/me/current`,
  PAYMENT_ME_HISTORY: `${BASE}/payments/me/history`,
  PAYMENT_ME_STATUS: (orderCode: string) => `${BASE}/payments/me/status/${orderCode}`,
  PAYMENT_ME_CANCEL: (orderCode: string) => `${BASE}/payments/me/cancel/${orderCode}`,
} as const;
