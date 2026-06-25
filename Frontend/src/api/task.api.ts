/**
 * ============================================================
 * Task API Module
 * ============================================================
 */
import { api } from './config';
import { Endpoints } from './endpoints';
import { normalizeTaskList } from './normalize';
import type { Task } from '@/types';

interface TaskFilters {
  status?: Task['status'];
  priority?: Task['priority'];
  assigneeId?: string;
  overdue?: boolean;
}

export interface AiTaskDraft {
  title: string;
  description: string;
  deadline: string;
  priority: Task['priority'];
  status: 'BACKLOG';
  assigneeId: null;
}

export interface BulkTaskDraft {
  title: string;
  description?: string;
  deadline: string;
  priority: Task['priority'];
}

/** Lay danh sach task cua project */
export async function getTasks(
  projectId: string,
  filters?: TaskFilters,
): Promise<Task[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.priority) params.set('priority', filters.priority);
  if (filters?.assigneeId) params.set('assigneeId', filters.assigneeId);
  if (filters?.overdue) params.set('overdue', 'true');

  const qs = params.toString();
  const raw = await api.get<unknown[]>(
    `${Endpoints.TASK_LIST(projectId)}${qs ? `?${qs}` : ''}`,
  );
  return normalizeTaskList(raw);
}

/** Lay chi tiet task */
export async function getTask(projectId: string, taskId: string): Promise<Task> {
  const raw = await api.get<unknown>(Endpoints.TASK_DETAIL(projectId, taskId));
  return normalizeTaskList([raw])[0];
}

/** Tao task moi */
export async function createTask(
  projectId: string,
  data: {
    title: string;
    description?: string;
    priority?: Task['priority'];
    assigneeId?: string;
    deadline?: string;
  },
): Promise<Task> {
  const raw = await api.post<unknown>(Endpoints.TASK_LIST(projectId), data);
  return normalizeTaskList([raw])[0];
}

export async function generateAiTaskDrafts(
  projectId: string,
  data: { prompt: string; count: number },
): Promise<AiTaskDraft[]> {
  return api.post<AiTaskDraft[]>(Endpoints.TASK_AI_GENERATE(projectId), data, { timeout: 45_000 });
}

export async function bulkCreateTasks(projectId: string, tasks: BulkTaskDraft[]): Promise<Task[]> {
  const raw = await api.post<unknown[]>(Endpoints.TASK_BULK_CREATE(projectId), { tasks });
  return normalizeTaskList(raw);
}

/** Cap nhat task */
export async function updateTask(
  projectId: string,
  taskId: string,
  data: Partial<{
    title: string;
    description: string;
    status: Task['status'];
    priority: Task['priority'];
    assigneeId: string;
    deadline: string;
  }>,
): Promise<Task> {
  const raw = await api.put<unknown>(Endpoints.TASK_DETAIL(projectId, taskId), data);
  return normalizeTaskList([raw])[0];
}

/** Xoa task */
export async function deleteTask(projectId: string, taskId: string): Promise<void> {
  return api.delete(Endpoints.TASK_DETAIL(projectId, taskId));
}

/** Them comment vao task */
export async function addTaskComment(
  projectId: string,
  taskId: string,
  data: { content: string; mentions?: string[] },
): Promise<Task['comments'][number]> {
  return api.put<Task['comments'][number]>(
    Endpoints.TASK_COMMENTS(projectId, taskId),
    data,
  );
}
