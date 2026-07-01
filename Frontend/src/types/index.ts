/**
 * ============================================================
 * Frontend Types — Unified via @/api/types
 * ============================================================
 *
 * Strategy:
 * - Shared scalar types (TaskStatus, ProjectStatus, etc.) → re-export from @/api/types
 * - Complex object types → define LOCALLY so all components use the same shape
 *   (components expect `name`, not `fullName`; `avatar: null`, not `avatar: string`)
 * - Types with no UI-specific field mismatches → re-export from @/api/types
 */

export type {
  TaskStatus,
  TaskPriority,
  MeetingStatus,
  MeetingType,
  ChatRoomType,
  MessageChannel,
  NotificationType,
} from '@/api/types';

export type ProjectStatus = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
export type ProjectRole = 'LEADER' | 'VICE_LEADER' | 'SUPERVISOR' | 'MEMBER';
export type WorkloadLevel = 'LOW' | 'MEDIUM' | 'HIGH';

// ── Scalar & scalar-like types ─────────────────────────────────

export type { User } from '@/api/types';
export type { ApiResponse, PaginatedResponse, AuthTokens, AuthResponse } from '@/api/types';
export type { RequestType } from '@/api/types';
export type { ContributionDay, MemberEvaluation, MemberPerformance } from '@/api/types';

// ── Local types (shape must match component expectations) ─────────

/** Local Member — UI expects `.name`, not `.fullName` */
export interface Member {
  id: string;
  name: string;
  /** Alias so API shapes with fullName also work */
  fullName: string;
  email: string;
  avatar: string | null;
  role?: ProjectRole;
}

export function userToMember(user: { id: string; fullName: string; email?: string; avatar?: string | null }): Member {
  return { id: user.id, name: user.fullName, fullName: user.fullName, email: user.email ?? '', avatar: user.avatar ?? null };
}

/** Local Task — assignee uses local Member */
export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: 'BACKLOG' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' | 'PAUSED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  assignee: Member | null;
  creator?: Member;
  deadline: string | null;
  requestType: string | null;
  requestNote: string | null;
  comments: TaskComment[];
  commentsCount?: number;
  hashtags?: string[];
  createdAt: string;
  updatedAt?: string;
}

/** Local TaskComment — author uses local Member (with `.name`) */
export interface TaskComment {
  id: string;
  content: string;
  author: Member;
  mentions?: string[];
  createdAt: string;
}

/** Local Meeting — attendees use local Member (with `.name`) */
export type MeetingStatus2 = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type MeetingType2 = 'online' | 'offline';

export interface Meeting {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  type: MeetingType2;
  location?: string;
  meetingLink?: string;
  timezone?: string;
  status: MeetingStatus2;
  organizer: Member;
  attendees: Member[];
  attendeeResponses?: Record<string, { willAttend: boolean | null; declineReason?: string | null }>;
  summary?: string;
  createdAt: string;
}

/** Role của thành viên trong channel */
export type ChannelRole = 'OWNER' | 'ADMIN' | 'MEMBER';

/** Local ChatRoom — members use local Member (with `.name`) */
export interface ChatRoom {
  id: string;
  projectId?: string;
  name: string;
  type: 'general' | 'channel' | 'direct';
  members: Member[];
  createdBy?: Member;
  chatAdmins?: string[];
  inviteLocked?: boolean;
  createdAt: string;
  /** Per-member roles — source of truth for OWNER/ADMIN/MEMBER */
  memberRoles?: { userId: string; role: ChannelRole; joinedAt: string }[];
}

/** Local ChatMessage — sender uses local Member (with `.name`) */
export interface ChatMessage {
  id: string;
  roomId: string;
  sender: Member | 'ai' | null;
  content: string;
  channel: 'group' | 'task' | 'document' | 'ai' | 'GROUP' | 'TASK' | 'DOCUMENT' | 'AI';
  timestamp: string;
  projectId?: string;
}

/** Local Activity — user uses local Member (with `.name`) */
export interface Activity {
  id: string;
  user: Member;
  action: string;
  target: string;
  targetType?: string | null;
  targetId?: string | null;
  timestamp: string;
  projectId?: string;
}

/** Local Project — members use local ProjectMember (with `.name`) */
export interface ProjectMember {
  member: Member;
  isOwner: boolean;
  role: ProjectRole;
}

export interface Project {
  id: string;
  ownerId?: string;
  name: string;
  description: string;
  subject?: string;
  status?: ProjectStatus;
  progress: number;
  members: ProjectMember[];
  deadline: string;
  totalTasks: number;
  completedTasks: number;
  createdAt?: string;
}

// ── Document types (link-based) ─────────────────────────────────

export type DocumentType =
  | 'google_doc'
  | 'google_sheet'
  | 'google_slide'
  | 'figma'
  | 'github'
  | 'notion'
  | 'other';

export type { Document } from '@/api/types';

export interface Folder {
  id: string;
  projectId: string;
  name: string;
  parentId?: string | null;
  createdAt: string;
}

// ── Notification ────────────────────────────────────────────────

export type NotificationType2 = 'task' | 'meeting' | 'chat' | 'document';

export interface AppNotification {
  id: string;
  type: NotificationType2;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

// ── Performance ────────────────────────────────────────────────

export interface MemberPerformanceDetail {
  member: Member;
  role: 'LEADER' | 'VICE_LEADER' | 'SUPERVISOR' | 'MEMBER';
  isOwner: boolean;
  tasksCompleted: number;
  tasksInProgress: number;
  tasksTodo: number;
  documentsUploaded: number;
  commentsCount: number;
  score: number;
  contributions: { date: string; count: number }[];
  evaluation: { rating: number; feedback: string | null; evaluatedAt: string } | null;
}

// ── Member types ────────────────────────────────────────────────

export interface ProjectMemberDetail {
  user: { id: string; fullName: string; avatar?: string | null };
  role: 'LEADER' | 'VICE_LEADER' | 'SUPERVISOR' | 'MEMBER';
  isOwner: boolean;
  tasksAssigned: number;
  tasksCompleted: number;
}

// ── Local-only helpers ─────────────────────────────────────────

export interface TeamHealthWeek {
  weekLabel: string;
  workloadAvg: number;
  stressAvg: number;
  moraleAvg: number;
  responseCount: number;
}

export interface DocumentComment {
  id: string;
  content: string;
  author: Member;
  createdAt: string;
  mentions?: Member[];
}

export interface DocumentAuditEntry {
  id: string;
  action: string;
  user: Member;
  timestamp: string;
}
