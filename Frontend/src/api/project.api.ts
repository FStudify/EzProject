/**
 * ============================================================
 * Project API Module
 * ============================================================
 */
import { api } from './config';
import { Endpoints } from './endpoints';
import {
  normalizeProjectList,
  normalizeProjectDetail,
} from './normalize';
import type { Project, PaginatedResponse } from '@/types';

interface ProjectFilters {
  status?: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  search?: string;
  page?: number;
  limit?: number;
}

/** Lay danh sach project (phan trang) */
export async function getProjects(
  filters?: ProjectFilters,
): Promise<PaginatedResponse<Project>> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.search) params.set('search', filters.search);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.limit) params.set('limit', String(filters.limit));

  const qs = params.toString();
  const raw = await api.get<{ data: unknown[]; pagination: PaginatedResponse<unknown>['pagination'] }>(
    `${Endpoints.PROJECT_LIST}${qs ? `?${qs}` : ''}`,
  );
  return {
    success: true,
    data: normalizeProjectList(raw.data),
    pagination: raw.pagination,
  };
}

/** Lay chi tiet project */
export async function getProject(id: string): Promise<Project> {
  const raw = await api.get<unknown>(Endpoints.PROJECT_DETAIL(id));
  return normalizeProjectDetail(raw);
}

/** Tao project moi */
export async function createProject(data: {
  name: string;
  description?: string;
  subject?: string;
  deadline?: string;
  members?: Array<{ userId: string; role: 'LEADER' | 'SUPERVISOR' | 'MEMBER' }>;
}): Promise<Project> {
  const raw = await api.post<unknown>(Endpoints.PROJECT_LIST, data);
  return normalizeProjectDetail(raw);
}

/** Cap nhat project */
export async function updateProject(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    subject: string;
    deadline: string;
    status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
    progress: number;
  }>,
): Promise<Project> {
  const raw = await api.put<unknown>(Endpoints.PROJECT_DETAIL(id), data);
  return normalizeProjectDetail(raw);
}

/** Xoa project */
export async function deleteProject(id: string): Promise<void> {
  return api.delete(Endpoints.PROJECT_DETAIL(id));
}

/** Cap nhat tien do project */
export async function updateProjectProgress(
  id: string,
): Promise<{ progress: number }> {
  return api.put<{ progress: number }>(Endpoints.PROJECT_PROGRESS(id));
}
