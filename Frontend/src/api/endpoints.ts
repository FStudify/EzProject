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

  // ── Users ───────────────────────────────────────────────
  USER_ME: `${BASE}/users/me`,
  USER_PREFERENCES: `${BASE}/users/me/preferences`,
  USER_PASSWORD: `${BASE}/users/me/password`,
  USER_NOTIFICATIONS: `${BASE}/users/me/notifications`,

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

  // ── Members ─────────────────────────────────────────────
  MEMBER_LIST: (projectId: string) => `${BASE}/projects/${projectId}/members`,
  MEMBER_ROLE: (projectId: string, userId: string) =>
    `${BASE}/projects/${projectId}/members/${userId}/role`,
  MEMBER_REMOVE: (projectId: string, userId: string) =>
    `${BASE}/projects/${projectId}/members/${userId}`,
  MEMBER_INVITE: (projectId: string) => `${BASE}/projects/${projectId}/members/invite`,

  // ── Performance ──────────────────────────────────────────
  PERFORMANCE_LIST: (projectId: string) => `${BASE}/projects/${projectId}/performance`,
  PERFORMANCE_EVALUATE: (projectId: string) =>
    `${BASE}/projects/${projectId}/performance/evaluate`,

  // ── Activities ──────────────────────────────────────────
  ACTIVITY_LIST: (projectId: string) => `${BASE}/projects/${projectId}/activities`,

  // ── Upload ──────────────────────────────────────────────
  UPLOAD_FILE: `${BASE}/upload`,
} as const;
