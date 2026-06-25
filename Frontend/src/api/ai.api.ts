import { api } from './config';
import { Endpoints } from './endpoints';

export interface GeneratedTask {
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'BACKLOG';
  suggestedDeadlineDays: number;
  deadline: string;
}

export interface GeneratedProject {
  name: string;
  description: string;
  subject: string;
  suggestedDeadlineDays: number;
  deadline: string;
  tasks: GeneratedTask[];
}

export async function generateProject(idea: string): Promise<GeneratedProject> {
  return api.post<GeneratedProject>(
    Endpoints.AI_GENERATE_PROJECT,
    { idea },
    { timeout: 30_000 },
  );
}

export function convertDeadlineDaysToDateString(days: number): string {
  if (!Number.isFinite(days) || days <= 0) return '';

  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + Math.round(days));
  return date.toISOString().slice(0, 10);
}

export function generateTaskId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}
