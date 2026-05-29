/**
 * ============================================================
 * API Response Normalization
 * ============================================================
 *
 * Backend tra ve MongoDB schema (_id, full user object trong nested fields).
 * Frontend types dinh nghia id (khong phai _id) va Pick<User, ...> cho nested objects.
 * Cac ham ben duoi normalize response tu API thanh dung type cua frontend.
 */

import type {
  Project,
  ProjectMember,
  Task,
  TaskComment,
  Meeting,
  MeetingAttendee,
  Activity,
  ProjectMemberDetail,
  ChatRoom,
  ChatMessage,
  MemberPerformance,
  ContributionDay,
  MemberEvaluation,
} from './types';
import type { User } from './types';

function normalizeId(doc: Record<string, unknown>): string {
  return (doc._id as string) ?? (doc.id as string);
}

function normalizeUser(doc: Record<string, unknown>): Pick<User, 'id' | 'fullName' | 'avatar' | 'email'> {
  return {
    id: normalizeId(doc),
    fullName: (doc.fullName as string) ?? 'Unknown',
    avatar: (doc.avatar as string | null) ?? null,
    email: (doc.email as string) ?? '',
  };
}

function normalizeProjectMember(m: Record<string, unknown>): ProjectMember {
  // Backend projectMemberSchema has { _id: false }, so m._id is undefined.
  // The user ID lives inside the populated userId object.
  const userDoc = (m.userId ?? m.user) as Record<string, unknown>;
  const userId = normalizeId(userDoc ?? m);
  const roleStr = ((m.role as string) ?? 'MEMBER').toUpperCase();
  return {
    userId,
    user: normalizeUser(userDoc ?? m),
    role: roleStr as ProjectMember['role'],
    isOwner: Boolean(m.isOwner),
    joinedAt: (m.joinedAt as string) ?? undefined,
  };
}

function normalizeProject(raw: Record<string, unknown>): Project {
  const ownerDoc = (raw.owner ?? raw.ownerId) as Record<string, unknown>;
  const membersArr = (raw.members ?? []) as Record<string, unknown>[];
  return {
    id: normalizeId(raw),
    name: (raw.name as string) ?? '',
    description: (raw.description as string | null) ?? null,
    subject: (raw.subject as string | null) ?? null,
    status: ((raw.status as string) ?? 'ACTIVE').toUpperCase() as Project['status'],
    progress: (raw.progress as number) ?? 0,
    owner: normalizeUser(ownerDoc ?? raw),
    members: membersArr.map(normalizeProjectMember),
    deadline: (raw.deadline as string | null) ?? null,
    totalTasks: (raw.totalTasks as number) ?? 0,
    completedTasks: (raw.completedTasks as number) ?? 0,
    createdAt: (raw.createdAt as string) ?? new Date().toISOString(),
    updatedAt: (raw.updatedAt as string) ?? new Date().toISOString(),
  };
}

function normalizeTaskComment(c: Record<string, unknown>): TaskComment {
  const authorDoc = (c.author ?? c.authorId) as Record<string, unknown>;
  return {
    id: normalizeId(c),
    content: (c.content as string) ?? '',
    author: normalizeUser(authorDoc ?? c),
    mentions: typeof c.mentions === 'string' ? c.mentions.split(',').filter(Boolean) : ((c.mentions as string[]) ?? []),
    createdAt: (c.createdAt as string) ?? new Date().toISOString(),
  };
}

function normalizeTask(raw: Record<string, unknown>): Task {
  const assigneeDoc = (raw.assignee ?? raw.assigneeId) as Record<string, unknown> | null;
  const creatorDoc = (raw.creator ?? raw.creatorId) as Record<string, unknown>;
  const commentsArr = (raw.comments ?? []) as Record<string, unknown>[];
  const statusStr = ((raw.status as string) ?? 'BACKLOG').toUpperCase().replace('-', '_');
  const priorityStr = ((raw.priority as string) ?? 'LOW').toUpperCase();

  return {
    id: normalizeId(raw),
    projectId: (raw.projectId as string) ?? '',
    title: (raw.title as string) ?? '',
    description: (raw.description as string | null) ?? null,
    status: statusStr as Task['status'],
    priority: priorityStr as Task['priority'],
    assignee: assigneeDoc ? normalizeUser(assigneeDoc) : null,
    creator: normalizeUser(creatorDoc ?? raw),
    deadline: (raw.deadline as string | null) ?? null,
    requestType: null,
    requestNote: null,
    comments: commentsArr.map(normalizeTaskComment),
    commentsCount: (raw.commentsCount as number) ?? 0,
    createdAt: (raw.createdAt as string) ?? new Date().toISOString(),
    updatedAt: (raw.updatedAt as string) ?? new Date().toISOString(),
  };
}

function normalizeMeetingAttendee(a: Record<string, unknown>): MeetingAttendee {
  const userDoc = (a.userId ?? a.user) as Record<string, unknown>;
  return {
    user: normalizeUser(userDoc ?? a),
    willAttend: a.willAttend as boolean | null,
    declineReason: (a.declineReason as string | null) ?? null,
  };
}

function normalizeMeeting(raw: Record<string, unknown>): Meeting {
  const organizerDoc = (raw.organizer ?? raw.organizerId) as Record<string, unknown>;
  const attendeesArr = (raw.attendees ?? []) as Record<string, unknown>[];
  return {
    id: normalizeId(raw),
    projectId: (raw.projectId as string) ?? '',
    title: (raw.title as string) ?? '',
    description: (raw.description as string | null) ?? null,
    type: ((raw.type as string) ?? 'ONLINE').toUpperCase() as Meeting['type'],
    startTime: (raw.startTime as string) ?? new Date().toISOString(),
    endTime: (raw.endTime as string) ?? new Date().toISOString(),
    location: (raw.location as string | null) ?? null,
    meetingLink: (raw.meetingLink as string | null) ?? null,
    status: ((raw.status as string) ?? 'SCHEDULED').toUpperCase() as Meeting['status'],
    organizer: normalizeUser(organizerDoc ?? raw),
    attendees: attendeesArr.map(normalizeMeetingAttendee),
    createdAt: (raw.createdAt as string) ?? new Date().toISOString(),
  };
}

function normalizeActivity(raw: Record<string, unknown>): Activity {
  const userDoc = (raw.userId ?? raw.user) as Record<string, unknown>;
  return {
    id: normalizeId(raw),
    user: normalizeUser(userDoc ?? raw),
    action: (raw.action as string) ?? '',
    target: (raw.target as string) ?? '',
    targetType: (raw.targetType as string | null) ?? null,
    targetId: (raw.targetId as string | null) ?? null,
    timestamp: (raw.timestamp as string) ?? new Date().toISOString(),
  };
}

function normalizeProjectMemberDetail(raw: Record<string, unknown>): ProjectMemberDetail {
  const userDoc = (raw.userId ?? raw.user) as Record<string, unknown>;
  return {
    user: normalizeUser(userDoc ?? raw),
    role: ((raw.role as string) ?? 'MEMBER').toUpperCase() as ProjectMemberDetail['role'],
    isOwner: Boolean(raw.isOwner),
    tasksAssigned: (raw.tasksAssigned as number) ?? 0,
    tasksCompleted: (raw.tasksCompleted as number) ?? 0,
  };
}

function normalizeContribution(c: Record<string, unknown>): ContributionDay {
  return {
    date: (c.date as string) ?? '',
    count: (c.count as number) ?? 0,
  };
}

function normalizeEvaluation(raw: Record<string, unknown> | null): MemberEvaluation | null {
  if (!raw) return null;
  return {
    rating: (raw.rating as number) ?? 0,
    feedback: (raw.feedback as string | null) ?? null,
    evaluatedAt: (raw.evaluatedAt as string) ?? '',
  };
}

function normalizeMemberPerformance(raw: Record<string, unknown>): MemberPerformance {
  const memberDoc = (raw.member ?? raw.userId ?? raw.user) as Record<string, unknown>;
  const contributionsArr = (raw.contributions ?? []) as Record<string, unknown>[];
  return {
    member: normalizeUser(memberDoc ?? raw),
    role: ((raw.role as string) ?? 'MEMBER').toUpperCase() as MemberPerformance['role'],
    isOwner: Boolean(raw.isOwner),
    tasksCompleted: (raw.tasksCompleted as number) ?? 0,
    tasksInProgress: (raw.tasksInProgress as number) ?? 0,
    tasksTodo: (raw.tasksTodo as number) ?? 0,
    documentsUploaded: (raw.documentsUploaded as number) ?? 0,
    commentsCount: (raw.commentsCount as number) ?? 0,
    score: (raw.score as number) ?? 0,
    contributions: contributionsArr.map(normalizeContribution),
    evaluation: normalizeEvaluation(raw.evaluation as Record<string, unknown> | null),
  };
}

function normalizeChatRoom(raw: Record<string, unknown>): ChatRoom {
  const membersArr = (raw.members ?? []) as Record<string, unknown>[];
  return {
    id: normalizeId(raw),
    projectId: (raw.projectId as string) ?? '',
    name: (raw.name as string) ?? '',
    type: ((raw.type as string) ?? 'GENERAL').toUpperCase() as ChatRoom['type'],
    members: membersArr.map(normalizeUser),
    createdAt: (raw.createdAt as string) ?? new Date().toISOString(),
  };
}

function normalizeChatMessage(raw: Record<string, unknown>): ChatMessage {
  const senderDoc = (raw.sender ?? raw.senderId) as Record<string, unknown> | null;
  return {
    id: normalizeId(raw),
    roomId: (raw.roomId as string) ?? '',
    sender: senderDoc ? normalizeUser(senderDoc) : null,
    content: (raw.content as string) ?? '',
    channel: ((raw.channel as string) ?? 'GROUP').toUpperCase() as ChatMessage['channel'],
    timestamp: (raw.timestamp as string) ?? new Date().toISOString(),
  };
}

// ── Public API ───────────────────────────────────────────────────

export function normalizeProjectList(data: unknown): Project[] {
  const arr = Array.isArray(data) ? data : ((data as Record<string, unknown>).data as unknown[]) ?? [];
  return arr.map((item) => normalizeProject(item as Record<string, unknown>));
}

export function normalizeProjectDetail(data: unknown): Project {
  return normalizeProject((data as Record<string, unknown>) ?? {});
}

export function normalizeTaskList(data: unknown): Task[] {
  const arr = Array.isArray(data) ? data : ((data as Record<string, unknown>).data as unknown[]) ?? [];
  return arr.map((item) => normalizeTask(item as Record<string, unknown>));
}

export function normalizeMeetingList(data: unknown): Meeting[] {
  const arr = Array.isArray(data) ? data : ((data as Record<string, unknown>).data as unknown[]) ?? [];
  return arr.map((item) => normalizeMeeting(item as Record<string, unknown>));
}

export function normalizeActivityList(data: unknown): Activity[] {
  const arr = Array.isArray(data) ? data : ((data as Record<string, unknown>).data as unknown[]) ?? [];
  return arr.map((item) => normalizeActivity(item as Record<string, unknown>));
}

export function normalizeMemberList(data: unknown): ProjectMemberDetail[] {
  const arr = Array.isArray(data) ? data : ((data as Record<string, unknown>).data as unknown[]) ?? [];
  return arr.map((item) => normalizeProjectMemberDetail(item as Record<string, unknown>));
}

export function normalizePerformanceList(data: unknown): MemberPerformance[] {
  const arr = Array.isArray(data) ? data : ((data as Record<string, unknown>).data as unknown[]) ?? [];
  return arr.map((item) => normalizeMemberPerformance(item as Record<string, unknown>));
}

export function normalizeChatRooms(data: unknown): { general: ChatRoom[]; channels: ChatRoom[]; direct: ChatRoom[] } {
  const obj = (data as Record<string, unknown>)?.data ?? data;
  const raw = obj as Record<string, unknown>;
  const toRooms = (arr: unknown): ChatRoom[] =>
    Array.isArray(arr) ? arr.map((r) => normalizeChatRoom(r as Record<string, unknown>)) : [];
  return {
    general: toRooms(raw?.general),
    channels: toRooms(raw?.channels),
    direct: toRooms(raw?.direct),
  };
}

export function normalizeChatMessages(data: unknown): ChatMessage[] {
  const obj = data as Record<string, unknown>;
  const arr = Array.isArray(obj) ? obj : ((obj?.messages as unknown[]) ?? []);
  return arr.map((item) => normalizeChatMessage(item as Record<string, unknown>));
}
