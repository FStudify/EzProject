/**
 * ============================================================
 * API Response Normalization
 * ============================================================
 *
 * Converts MongoDB API responses into local frontend types (@/types).
 *
 * Key transformations:
 * - _id → id
 * - fullName → name (for nested user objects)
 * - UPPERCASE enum values → lowercase where local types differ
 * - avatar: null | string (not undefined)
 */

import type {
  Task,
  TaskComment,
  Meeting,
  Activity,
  ChatRoom,
  ChatMessage,
  Project,
  ProjectMember,
} from '@/types';

function normalizeId(doc: Record<string, unknown>): string {
  return (doc._id as string) ?? (doc.id as string);
}

function normalizeUser(doc: Record<string, unknown>): { id: string; name: string; fullName?: string; email: string; avatar: string | null } {
  const fullName = (doc.fullName as string) ?? 'Unknown';
  return {
    id: normalizeId(doc),
    name: fullName,
    fullName,
    avatar: (doc.avatar as string | null) ?? null,
    email: (doc.email as string) ?? '',
  };
}

function normalizeProjectMember(m: Record<string, unknown>): ProjectMember {
  const userDoc = (m.userId ?? m.user) as Record<string, unknown>;
  return {
    member: normalizeUser(userDoc ?? m),
    isOwner: Boolean(m.isOwner),
    role: ((m.role as string) ?? 'member').toLowerCase() as ProjectMember['role'],
  };
}

function normalizeProject(raw: Record<string, unknown>): Project {
  const membersArr = (raw.members ?? []) as Record<string, unknown>[];
  return {
    id: normalizeId(raw),
    name: (raw.name as string) ?? '',
    description: (raw.description as string | null) ?? '',
    subject: (raw.subject as string | null) ?? undefined,
    status: ((raw.status as string) ?? 'active').toLowerCase() as Project['status'],
    progress: (raw.progress as number) ?? 0,
    members: membersArr.map(normalizeProjectMember),
    deadline: (raw.deadline as string | null) ?? new Date().toISOString(),
    totalTasks: (raw.totalTasks as number) ?? 0,
    completedTasks: (raw.completedTasks as number) ?? 0,
    createdAt: (raw.createdAt as string) ?? new Date().toISOString(),
  };
}

function normalizeTaskComment(c: Record<string, unknown>): TaskComment {
  const authorDoc = (c.author ?? c.authorId) as Record<string, unknown>;
  const author = normalizeUser(authorDoc ?? c);
  return {
    id: normalizeId(c),
    content: (c.content as string) ?? '',
    author,
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

function normalizeMeeting(raw: Record<string, unknown>): Meeting {
  const organizerDoc = (raw.organizer ?? raw.organizerId) as Record<string, unknown>;
  const attendeesArr = (raw.attendees ?? []) as Record<string, unknown>[];
  return {
    id: normalizeId(raw),
    projectId: (raw.projectId as string) ?? '',
    title: (raw.title as string) ?? '',
    description: (raw.description as string) ?? undefined,
    startTime: (raw.startTime as string) ?? new Date().toISOString(),
    endTime: (raw.endTime as string) ?? new Date().toISOString(),
    type: ((raw.type as string) ?? 'ONLINE').toLowerCase() as Meeting['type'],
    location: (raw.location as string) ?? undefined,
    meetingLink: (raw.meetingLink as string) ?? undefined,
    status: ((raw.status as string) ?? 'SCHEDULED').toLowerCase().replace('_', '_') as Meeting['status'],
    organizer: normalizeUser(organizerDoc ?? raw),
    attendees: attendeesArr.map((a) => normalizeUser((a.userId ?? a.user ?? a) as Record<string, unknown>)),
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

export function normalizeChatRoom(raw: Record<string, unknown>): ChatRoom {
  const membersArr = (raw.members ?? []) as Record<string, unknown>[];
  const createdByRaw = raw.createdBy as Record<string, unknown> | string | null;
  const settings = (raw.settings ?? {}) as Record<string, unknown>;
  const chatAdminsRaw = (raw.chatAdmins ?? []) as unknown[];
  return {
    id: normalizeId(raw),
    projectId: (raw.projectId as string) ?? '',
    name: (raw.name as string) ?? '',
    type: ((raw.type as string) ?? 'general').toLowerCase() as ChatRoom['type'],
    members: membersArr.map(normalizeUser),
    createdBy: createdByRaw
      ? (typeof createdByRaw === 'object' && createdByRaw !== null
        ? normalizeUser(createdByRaw as Record<string, unknown>)
        : { id: String(createdByRaw), name: 'Unknown', fullName: 'Unknown', email: '', avatar: null })
      : undefined,
    inviteLocked: Boolean(settings.inviteLocked),
    chatAdmins: chatAdminsRaw.map(String),
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
    channel: ((raw.channel as string) ?? 'GROUP').toLowerCase() as ChatMessage['channel'],
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

export function normalizeMemberList(data: unknown): { user: { id: string; name: string; fullName: string; email: string; avatar: string | null }; role: 'leader' | 'supervisor' | 'member'; isOwner: boolean; tasksAssigned: number; tasksCompleted: number }[] {
  const arr = Array.isArray(data) ? data : ((data as Record<string, unknown>).data as unknown[]) ?? [];
  return arr.map((item) => {
    const raw = item as Record<string, unknown>;
    const userDoc = (raw.user ?? raw.userId) as Record<string, unknown>;
    const fullName = (userDoc?.fullName as string) ?? 'Unknown';
    const roleStr = ((raw.role as string) ?? 'MEMBER').toLowerCase();
    return {
      user: {
        id: normalizeId(userDoc ?? raw),
        name: fullName,
        fullName,
        email: (userDoc?.email as string) ?? '',
        avatar: (userDoc?.avatar as string | null) ?? null,
      },
      role: roleStr as 'leader' | 'supervisor' | 'member',
      isOwner: Boolean(raw.isOwner),
      tasksAssigned: (raw.tasksAssigned as number) ?? 0,
      tasksCompleted: (raw.tasksCompleted as number) ?? 0,
    };
  });
}

export function normalizePerformanceList(data: unknown): { member: { id: string; name: string; fullName: string; avatar: string | null }; role: 'leader' | 'supervisor' | 'member'; isOwner: boolean; tasksCompleted: number; tasksInProgress: number; tasksTodo: number; documentsUploaded: number; commentsCount: number; score: number; contributions: { date: string; count: number }[]; evaluation: { rating: number; feedback: string | null; evaluatedAt: string } | null }[] {
  const arr = Array.isArray(data) ? data : ((data as Record<string, unknown>).data as unknown[]) ?? [];
  return arr.map((item) => {
    const raw = item as Record<string, unknown>;
    const memberDoc = (raw.member ?? raw.memberId ?? raw.user ?? raw.userId) as Record<string, unknown>;
    const fullName = (memberDoc?.fullName as string) ?? 'Unknown';
    const contributionsArr = (raw.contributions ?? []) as Record<string, unknown>[];
    const evaluationRaw = raw.evaluation as Record<string, unknown> | null;
    return {
      member: {
        id: normalizeId(memberDoc ?? raw),
        name: fullName,
        fullName,
        avatar: (memberDoc?.avatar as string | null) ?? null,
      },
      role: ((raw.role as string) ?? 'member').toLowerCase() as 'leader' | 'supervisor' | 'member',
      isOwner: Boolean(raw.isOwner),
      tasksCompleted: (raw.tasksCompleted as number) ?? 0,
      tasksInProgress: (raw.tasksInProgress as number) ?? 0,
      tasksTodo: (raw.tasksTodo as number) ?? 0,
      documentsUploaded: (raw.documentsUploaded as number) ?? 0,
      commentsCount: (raw.commentsCount as number) ?? 0,
      score: (raw.score as number) ?? 0,
      contributions: contributionsArr.map((c) => ({
        date: (c.date as string) ?? '',
        count: (c.count as number) ?? 0,
      })),
      evaluation: evaluationRaw
        ? {
            rating: (evaluationRaw.rating as number) ?? 0,
            feedback: (evaluationRaw.feedback as string | null) ?? null,
            evaluatedAt: (evaluationRaw.evaluatedAt as string) ?? new Date().toISOString(),
          }
        : null,
    };
  });
}
