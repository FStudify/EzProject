/**
 * ============================================================
 * API Response Types
 * ============================================================
 */

export interface ApiResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ── Auth ──────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  username: string;
  fullName: string;
  avatar: string | null;
  phone: string | null;
  department: string | null;
  position: string | null;
  bio: string | null;
  role: 'ADMIN' | 'CUSTOMER';
  language: 'VI' | 'EN';
  theme: 'LIGHT' | 'DARK';
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// ── Projects ──────────────────────────────────────────────────

export type ProjectStatus = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

export interface ProjectMember {
  user: Pick<User, 'id' | 'fullName' | 'avatar' | 'email'>;
  userId: string;
  role: 'LEADER' | 'SUPERVISOR' | 'MEMBER';
  isOwner: boolean;
  joinedAt?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  subject: string | null;
  status: ProjectStatus;
  progress: number;
  owner: Pick<User, 'id' | 'fullName' | 'avatar'>;
  members: ProjectMember[];
  deadline: string | null;
  totalTasks: number;
  completedTasks: number;
  createdAt: string;
  updatedAt: string;
}

// ── Tasks ────────────────────────────────────────────────────

export type TaskStatus = 'BACKLOG' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' | 'ON_HOLD' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type RequestType = 'REVIEW' | 'PAUSE';

export interface TaskComment {
  id: string;
  content: string;
  author: Pick<User, 'id' | 'fullName' | 'avatar'>;
  mentions: string[];
  createdAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: Pick<User, 'id' | 'fullName' | 'avatar'> | null;
  creator: Pick<User, 'id' | 'fullName' | 'avatar'>;
  deadline: string | null;
  requestType: RequestType | null;
  requestNote: string | null;
  comments: TaskComment[];
  commentsCount: number;
  createdAt: string;
  updatedAt: string;
}

// ── Documents ────────────────────────────────────────────────

export type FileType = 'DOC' | 'PDF' | 'PPT' | 'ZIP' | 'IMG' | 'OTHER';

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  fileCount: number;
  createdAt: string;
}

export interface Document {
  id: string;
  projectId: string;
  folderId: string | null;
  name: string;
  fileType: FileType;
  size: string;
  fileUrl: string | null;
  uploadedBy: Pick<User, 'id' | 'fullName' | 'avatar'>;
  uploadDate: string;
}

export interface DocumentListResponse {
  folders: Folder[];
  files: Document[];
}

// ── Meetings ──────────────────────────────────────────────────

export type MeetingType = 'ONLINE' | 'OFFLINE';
export type MeetingStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface MeetingAttendee {
  user: Pick<User, 'id' | 'fullName' | 'avatar'>;
  willAttend: boolean | null;
  declineReason: string | null;
}

export interface Meeting {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  type: MeetingType;
  startTime: string;
  endTime: string;
  location: string | null;
  meetingLink: string | null;
  status: MeetingStatus;
  organizer: Pick<User, 'id' | 'fullName' | 'avatar'>;
  attendees: MeetingAttendee[];
  createdAt: string;
}

// ── Chat ─────────────────────────────────────────────────────

export type ChatRoomType = 'GENERAL' | 'CHANNEL' | 'DIRECT';
export type MessageChannel = 'GROUP' | 'TASK' | 'DOCUMENT' | 'AI';

export interface ChatRoom {
  id: string;
  projectId: string;
  name: string;
  type: ChatRoomType;
  members: Pick<User, 'id' | 'fullName' | 'avatar'>[];
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  sender: (Pick<User, 'id' | 'fullName' | 'avatar'> & { avatar: string | null }) | null;
  content: string;
  channel: MessageChannel;
  timestamp: string;
}

// ── Members ─────────────────────────────────────────────────

export interface ProjectMemberDetail {
  user: Pick<User, 'id' | 'fullName' | 'email' | 'avatar'>;
  role: 'LEADER' | 'SUPERVISOR' | 'MEMBER';
  isOwner: boolean;
  tasksAssigned: number;
  tasksCompleted: number;
}

// ── Notifications ─────────────────────────────────────────────

export type NotificationType = 'TASK' | 'MEETING' | 'CHAT' | 'DOCUMENT';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationResponse {
  notifications: AppNotification[];
  unreadCount: number;
}

// ── Performance ──────────────────────────────────────────────

export interface ContributionDay {
  date: string;
  count: number;
}

export interface MemberEvaluation {
  rating: number;
  feedback: string | null;
  evaluatedAt: string;
}

export interface MemberPerformance {
  member: Pick<User, 'id' | 'fullName' | 'avatar'>;
  role: 'LEADER' | 'SUPERVISOR' | 'MEMBER';
  isOwner: boolean;
  tasksCompleted: number;
  tasksInProgress: number;
  tasksTodo: number;
  documentsUploaded: number;
  commentsCount: number;
  score: number;
  contributions: ContributionDay[];
  evaluation: MemberEvaluation | null;
}

// ── Activity ─────────────────────────────────────────────────

export interface Activity {
  id: string;
  user: Pick<User, 'id' | 'fullName' | 'avatar'>;
  action: string;
  target: string;
  targetType: string | null;
  targetId: string | null;
  timestamp: string;
}
