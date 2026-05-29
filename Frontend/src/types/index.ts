export type TaskStatus = 'BACKLOG' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' | 'ON_HOLD' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type FileType = 'DOC' | 'PDF' | 'PPT' | 'ZIP' | 'IMG' | 'OTHER';

export type ProjectRole = 'leader' | 'supervisor' | 'member';

export interface Member {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role?: ProjectRole;
}

export interface ProjectMember {
  member: Member;
  isOwner: boolean;
  role: ProjectRole;
}

export type ProjectStatus = 'active' | 'completed' | 'archived';

export interface Project {
  id: string;
  name: string;
  description: string;
  subject?: string;
  status?: ProjectStatus;
  progress: number;
  members: ProjectMember[];
  createdAt: string;
  deadline: string;
  totalTasks: number;
  completedTasks: number;
}

export type NotificationType = 'task' | 'meeting' | 'chat' | 'document';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

export type WorkloadLevel = 'light' | 'medium' | 'heavy';

export interface TeamHealthWeek {
  weekLabel: string;
  workloadAvg: number;
  stressAvg: number;
  moraleAvg: number;
  responseCount: number;
}

export interface TaskComment {
  id: string;
  content: string;
  author: Member;
  createdAt: string;
  mentions?: string[];
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: Member;
  deadline: string;
  createdAt: string;
  requestType?: 'review' | 'pause';
  requestNote?: string;
  comments?: TaskComment[];
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

export type MeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type MeetingType = 'online' | 'offline';

export interface MeetingAttendeeResponse {
  willAttend: boolean;
  declineReason?: string;
}

export interface Meeting {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  type: MeetingType;
  /** For offline: meeting address */
  location?: string;
  /** For online: meeting link (Zoom, Meet, etc.) */
  meetingLink?: string;
  status: MeetingStatus;
  organizer: Member;
  attendees: Member[];
  /** memberId -> response. willAttend true = attending, false = declined with optional reason */
  attendeeResponses?: Record<string, MeetingAttendeeResponse>;
  createdAt: string;
}

export interface Document {
  id: string;
  projectId: string;
  name: string;
  fileType: FileType;
  size: string;
  uploadedBy: Member;
  uploadDate: string;
  /** URL for preview (e.g. /sample.docx) */
  fileUrl?: string;
  /** Folder this document belongs to (null = root) */
  folderId?: string | null;
}

export interface Activity {
  id: string;
  projectId: string;
  user: Member;
  action: string;
  target: string;
  timestamp: string;
}

export type ChatRoomType = 'general' | 'channel' | 'direct';

export interface ChatRoom {
  id: string;
  projectId: string;
  name: string;
  type: ChatRoomType;
  members: Member[];
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  projectId: string;
  roomId: string;
  sender: (Member & { avatar: string | null }) | 'ai' | null;
  content: string;
  timestamp: string;
  channel: 'group' | 'task' | 'document' | 'ai';
}

export interface ContributionDay {
  date: string;
  count: number;
}

export interface MemberPerformance {
  member: Pick<Member, 'id'> & { name: string; fullName: string; email: string; avatar: string };
  role: 'leader' | 'supervisor' | 'member';
  isOwner: boolean;
  tasksCompleted: number;
  tasksInProgress: number;
  tasksTodo: number;
  documentsUploaded: number;
  commentsCount: number;
  contributions: ContributionDay[];
  score: number;
  evaluation: MemberEvaluation | null;
}

export interface MemberEvaluation {
  memberId: string;
  rating: number;
  feedback: string;
  evaluatedAt: string;
}

