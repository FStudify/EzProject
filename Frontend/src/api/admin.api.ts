/**
 * ============================================================
 * Admin API Module
 * ============================================================
 * 
 * Tất cả routes đều yêu cầu user có role ADMIN.
 * Backend middleware: requireAuth + requireAdmin
 */
import { api } from './config';
import { Endpoints } from './endpoints';
import type { User, PaginatedResponse } from './types';

// ── Types ─────────────────────────────────────────────────────

export interface AdminStats {
  totalUsers: number;
  totalProjects: number;
  adminCount: number;
  customerCount: number;
  activeProjects: number;
}

export interface AdminUser extends Omit<User, 'theme' | 'language'> {
  role: 'ADMIN' | 'CUSTOMER';
  theme?: 'LIGHT' | 'DARK';
  language?: 'VI' | 'EN';
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
  };
  members: unknown[];
  createdAt: string;
  updatedAt: string;
}

interface AdminUserFilters {
  search?: string;
  role?: 'ADMIN' | 'CUSTOMER';
  page?: number;
  limit?: number;
}

interface AdminProjectFilters {
  search?: string;
  status?: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  page?: number;
  limit?: number;
}

// ── Stats ─────────────────────────────────────────────────────

/** Lay thong ke toan he thong */
export async function getAdminStats(): Promise<AdminStats> {
  return api.get<AdminStats>(Endpoints.ADMIN_STATS);
}

// ── Users ─────────────────────────────────────────────────────

/** Lay danh sach tat ca users (phan trang, filter, search) */
export async function getAdminUsers(
  filters?: AdminUserFilters,
): Promise<{ data: AdminUser[]; pagination: PaginatedResponse<unknown>['pagination'] }> {
  const params = new URLSearchParams();
  if (filters?.search) params.set('search', filters.search);
  if (filters?.role) params.set('role', filters.role);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.limit) params.set('limit', String(filters.limit));

  const qs = params.toString();
  return api.get(`${Endpoints.ADMIN_USERS}${qs ? `?${qs}` : ''}`);
}

/** Lay chi tiet 1 user */
export async function getAdminUser(userId: string): Promise<AdminUser> {
  return api.get<AdminUser>(Endpoints.ADMIN_USER_DETAIL(userId));
}

/** Thay doi system role (ADMIN / CUSTOMER) */
export async function setUserRole(
  userId: string,
  role: 'ADMIN' | 'CUSTOMER',
): Promise<AdminUser> {
  return api.put<AdminUser>(Endpoints.ADMIN_USER_ROLE(userId), { role });
}

/** Xoa user */
export async function deleteAdminUser(userId: string): Promise<void> {
  return api.delete(Endpoints.ADMIN_USER_DETAIL(userId));
}

// ── Projects ──────────────────────────────────────────────────

/** Lay danh sach tat ca projects (khong filter theo member) */
export async function getAdminProjects(
  filters?: AdminProjectFilters,
): Promise<{ data: AdminProject[]; pagination: PaginatedResponse<unknown>['pagination'] }> {
  const params = new URLSearchParams();
  if (filters?.search) params.set('search', filters.search);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.limit) params.set('limit', String(filters.limit));

  const qs = params.toString();
  return api.get(`${Endpoints.ADMIN_PROJECTS}${qs ? `?${qs}` : ''}`);
}

/** Xoa project (admin only) */
export async function deleteAdminProject(projectId: string): Promise<void> {
  return api.delete(Endpoints.ADMIN_PROJECT_DETAIL(projectId));
}
