import type { Task, TaskStatus } from '@/types';

export type TaskColumnId = 'not-started' | 'in-progress' | 'review' | 'done';

export interface TaskColumnConfig {
  id: TaskColumnId;
  title: string;
  statuses: TaskStatus[];
  targetStatus: TaskStatus;
}

export const STATUS_COLUMNS: TaskColumnConfig[] = [
  {
    id: 'not-started',
    title: 'Chưa bắt đầu',
    statuses: ['BACKLOG', 'ON_HOLD', 'CANCELLED'],
    targetStatus: 'BACKLOG',
  },
  {
    id: 'in-progress',
    title: 'Đang làm',
    statuses: ['IN_PROGRESS'],
    targetStatus: 'IN_PROGRESS',
  },
  {
    id: 'review',
    title: 'Đang xem xét',
    statuses: ['REVIEW'],
    targetStatus: 'REVIEW',
  },
  {
    id: 'done',
    title: 'Hoàn thành',
    statuses: ['DONE'],
    targetStatus: 'DONE',
  },
];

export function getColumnForStatus(status: TaskStatus): TaskColumnConfig {
  return STATUS_COLUMNS.find((column) => column.statuses.includes(status)) ?? STATUS_COLUMNS[0];
}

export function groupTasksByColumn(tasks: Task[]): Record<TaskColumnId, Task[]> {
  const grouped = STATUS_COLUMNS.reduce(
    (acc, column) => ({ ...acc, [column.id]: [] }),
    {} as Record<TaskColumnId, Task[]>,
  );

  for (const task of tasks) {
    grouped[getColumnForStatus(task.status).id].push(task);
  }

  return grouped;
}
