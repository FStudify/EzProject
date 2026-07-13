/**
 * ============================================================
 * Admin API Module
 * ============================================================
 *
 * Tất cả routes (trừ ADMIN_ANNOUNCEMENTS_ACTIVE) đều yêu cầu user có role ADMIN.
 * Backend middleware: requireAuth + requireAdmin.
 */
import { api } from './config';
import { Endpoints } from './endpoints';
import type { PaginatedResponse } from './types';

// ── Types ─────────────────────────────────────────────────────

export type AdminRole = 'ADMIN' | 'CUSTOMER';
export type AnnouncementType = 'INFO' | 'WARNING' | 'MAINTENANCE';

export interface AdminStats {
  totals: {
    users: number;
    projects: number;
    tasks: number;
    adminCount: number;
    customerCount: number;
    activeProjects: number;
  };
  weeklyGrowth: {
    users: { current: number; previous: number; percent: number };
    projects: { current: number; previous: number; percent: number };
    tasks: { current: number; previous: number; percent: number };
  };
  activeUsersToday: number;
}

export interface AdminUser {
  id: string;
  fullName: string;
  username: string;
  email: string;
  role: AdminRole;
  avatar: string | null;
  phone: string | null;
  department: string | null;
  position: string | null;
  bio: string | null;
  language?: 'VI' | 'EN';
  theme?: 'LIGHT' | 'DARK';
  isBlocked: boolean;
  blockedAt: string | null;
  blockedUntil: string | null;
  blockedReason: string | null;
  createdAt: string;
  updatedAt?: string;
  currentPlan?: string;
}

export interface AdminUserProject {
  id: string;
  name: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  ownerId: string;
  members: unknown[];
  createdAt: string;
}

export interface AdminUserDetail {
  user: AdminUser;
  projects: AdminUserProject[];
  recentActivities: Array<{
    id: string;
    action: string;
    target: string;
    targetType?: string | null;
    timestamp: string;
    projectId?: { id: string; name: string } | null;
  }>;
}

export interface AdminProject {
  id: string;
  name: string;
  description: string | null;
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  ownerId: {
    id: string;
    fullName: string;
    email: string;
    avatar: string | null;
    isBlocked?: boolean;
  };
  members: unknown[];
  taskCount: number;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminActivityLog {
  id: string;
  action: string;
  target: string;
  targetType?: string | null;
  targetId?: string | null;
  timestamp: string;
  userId: {
    id: string;
    fullName: string;
    email: string;
    avatar: string | null;
  } | null;
  projectId: { id: string; name: string } | null;
}

export interface AdminHealthError {
  id: string;
  message: string;
  timestamp: string;
  actor: { id: string; fullName: string } | null;
}

export interface AdminHealth {
  status: 'Online' | 'Degraded' | 'Down';
  dbConnected: boolean;
  mongoVersion: string | null;
  avgResponseMs: number;
  errorCount24h: number;
  uptimePercent7d: number;
  recentErrors: AdminHealthError[];
  checkedAt: string;
}

export interface AdminEmailVerify {
  ok: boolean;
  reason?: string;
  error?: string;
  code?: string;
}

export interface AdminEmailStatus {
  envPresent: boolean;
  missing: string[];
  nodemailerInstalled: boolean;
  host: string | null;
  port: number | null;
  user: string | null;
  fromRaw: string | null;
  secureByPort: boolean;
  verify: AdminEmailVerify | null;
  hints: string[];
}

export interface AdminEmailTestResult {
  sent: boolean;
  inviteUrl: string;
  reason?: string;
  error?: string;
  code?: string;
  from?: string;
  messageId?: string | null;
  diagnosticNote?: string;
}

export interface AdminAnnouncement {
  id: string;
  title: string;
  content: string;
  type: AnnouncementType;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  visibleNow: boolean;
  createdBy: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

// ── Filters ───────────────────────────────────────────────────

export interface AdminUserFilters {
  search?: string;
  status?: 'active' | 'blocked';
  role?: AdminRole;
  planKey?: string;
  page?: number;
  limit?: number;
}

export interface AdminProjectFilters {
  search?: string;
  status?: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  page?: number;
  limit?: number;
}

export interface AdminLogFilters {
  action?: string;
  userId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface AdminAnnouncementFilters {
  page?: number;
  limit?: number;
}

// ── 1. Dashboard ──────────────────────────────────────────────

export async function getAdminStats(): Promise<AdminStats> {
  return api.get<AdminStats>(Endpoints.ADMIN_STATS);
}

export async function getAdminDashboardRecent(range: '7d' | '30d' | '90d' | '1y' = '7d') {
  return api.get<{
    recentUsers: AdminUser[];
    growth: {
      users: Array<{ date: string; count: number }>;
      projects: Array<{ date: string; count: number }>;
    };
    range: string;
  }>(`${Endpoints.ADMIN_DASHBOARD_RECENT}?range=${range}`);
}

// ── 2. Users ──────────────────────────────────────────────────

function buildUserParams(f?: AdminUserFilters): string {
  const p = new URLSearchParams();
  if (f?.search) p.set('search', f.search);
  if (f?.status) p.set('status', f.status);
  if (f?.role) p.set('role', f.role);
  if (f?.planKey) p.set('planKey', f.planKey);
  if (f?.page) p.set('page', String(f.page));
  if (f?.limit) p.set('limit', String(f.limit));
  const s = p.toString();
  return s ? `?${s}` : '';
}

export async function getAdminUsers(
  filters?: AdminUserFilters,
): Promise<{ data: AdminUser[]; pagination: PaginatedResponse<unknown>['pagination'] }> {
  return api.get(`${Endpoints.ADMIN_USERS}${buildUserParams(filters)}`);
}

export async function getAdminUser(userId: string): Promise<AdminUserDetail> {
  return api.get<AdminUserDetail>(Endpoints.ADMIN_USER_DETAIL(userId));
}

export async function exportAdminUsers(filters?: AdminUserFilters): Promise<Blob> {
  const qs = buildUserParams(filters);
  const token = localStorage.getItem('ez_access_token');
  const base = api.getConfig().baseUrl;
  const res = await fetch(`${base}${Endpoints.ADMIN_USERS_EXPORT}${qs}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Export failed');
  return res.blob();
}

/** Format phần thời gian còn lại của block (tiếng Việt). */
export function formatBlockRemaining(blockedUntil: string | null): string | null {
  if (!blockedUntil) return null;
  const ms = new Date(blockedUntil).getTime() - Date.now();
  if (ms <= 0) return 'sắp hết hạn';
  const totalHours = Math.ceil(ms / (60 * 60 * 1000));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} ngày`);
  if (hours > 0) parts.push(`${hours} giờ`);
  return parts.length > 0 ? parts.join(' ') : 'dưới 1 giờ';
}

export async function blockAdminUser(
  userId: string,
  input: { reason?: string; durationHours?: number } = {},
): Promise<AdminUser> {
  return api.put<AdminUser>(Endpoints.ADMIN_USER_BLOCK(userId), input);
}

export async function unblockAdminUser(userId: string): Promise<AdminUser> {
  return api.put<AdminUser>(Endpoints.ADMIN_USER_UNBLOCK(userId), {});
}

// ── 3. Projects ───────────────────────────────────────────────

export async function getAdminProjects(
  filters?: AdminProjectFilters,
): Promise<{ data: AdminProject[]; pagination: PaginatedResponse<unknown>['pagination'] }> {
  const p = new URLSearchParams();
  if (filters?.search) p.set('search', filters.search);
  if (filters?.status) p.set('status', filters.status);
  if (filters?.page) p.set('page', String(filters.page));
  if (filters?.limit) p.set('limit', String(filters.limit));
  const qs = p.toString();
  return api.get(`${Endpoints.ADMIN_PROJECTS}${qs ? `?${qs}` : ''}`);
}

// ── 4. Activity Logs ──────────────────────────────────────────

export async function getAdminLogs(
  filters?: AdminLogFilters,
): Promise<{ data: AdminActivityLog[]; pagination: PaginatedResponse<unknown>['pagination'] }> {
  const p = new URLSearchParams();
  if (filters?.action) p.set('action', filters.action);
  if (filters?.userId) p.set('userId', filters.userId);
  if (filters?.from) p.set('from', filters.from);
  if (filters?.to) p.set('to', filters.to);
  if (filters?.page) p.set('page', String(filters.page));
  if (filters?.limit) p.set('limit', String(filters.limit));
  const qs = p.toString();
  return api.get(`${Endpoints.ADMIN_LOGS}${qs ? `?${qs}` : ''}`);
}

// ── 5. System Health ──────────────────────────────────────────

export async function getAdminHealth(): Promise<AdminHealth> {
  return api.get<AdminHealth>(Endpoints.ADMIN_HEALTH);
}

export async function getAdminEmailStatus(): Promise<AdminEmailStatus> {
  return api.get<AdminEmailStatus>(Endpoints.ADMIN_EMAIL_STATUS);
}

export async function sendAdminTestEmail(
  to: string,
): Promise<{ message: string; data: AdminEmailTestResult }> {
  return api.post<{ message: string; data: AdminEmailTestResult }>(
    Endpoints.ADMIN_EMAIL_TEST,
    { to },
  );
}

// ── 6. Announcements ──────────────────────────────────────────

export async function getAdminAnnouncements(
  filters?: AdminAnnouncementFilters,
): Promise<{ data: AdminAnnouncement[]; pagination: PaginatedResponse<unknown>['pagination'] }> {
  const p = new URLSearchParams();
  if (filters?.page) p.set('page', String(filters.page));
  if (filters?.limit) p.set('limit', String(filters.limit));
  const qs = p.toString();
  return api.get(`${Endpoints.ADMIN_ANNOUNCEMENTS}${qs ? `?${qs}` : ''}`);
}

export async function getAdminAnnouncement(id: string): Promise<AdminAnnouncement> {
  return api.get<AdminAnnouncement>(Endpoints.ADMIN_ANNOUNCEMENT_DETAIL(id));
}

export async function createAdminAnnouncement(input: {
  title: string;
  content: string;
  type: AnnouncementType;
  startsAt?: string;
  endsAt?: string;
  isActive?: boolean;
}): Promise<AdminAnnouncement> {
  return api.post<AdminAnnouncement>(Endpoints.ADMIN_ANNOUNCEMENTS, input);
}

export async function updateAdminAnnouncement(
  id: string,
  input: Partial<{
    title: string;
    content: string;
    type: AnnouncementType;
    startsAt: string | null;
    endsAt: string | null;
    isActive: boolean;
  }>,
): Promise<AdminAnnouncement> {
  return api.put<AdminAnnouncement>(Endpoints.ADMIN_ANNOUNCEMENT_DETAIL(id), input);
}

export async function deleteAdminAnnouncement(id: string): Promise<void> {
  return api.delete(Endpoints.ADMIN_ANNOUNCEMENT_DETAIL(id));
}

export async function getActiveAnnouncements(): Promise<AdminAnnouncement[]> {
  return api.get<AdminAnnouncement[]>(Endpoints.ADMIN_ANNOUNCEMENTS_ACTIVE);
}

// ── 7. Admin Profile ──────────────────────────────────────────

export async function getAdminProfile(): Promise<AdminUser> {
  return api.get<AdminUser>(Endpoints.ADMIN_PROFILE);
}

export async function changeAdminPassword(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ message: string }> {
  return api.put<{ message: string }>(Endpoints.ADMIN_PROFILE_PASSWORD, input);
}