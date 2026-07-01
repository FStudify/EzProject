import { useState } from 'react';
import type { Task, TaskStatus } from '@/types';
import TaskCard from './TaskCard';

const statusColors: Record<TaskStatus, string> = {
  BACKLOG: 'bg-slate-400',
  IN_PROGRESS: 'bg-primary',
  REVIEW: 'bg-amber-500',
  DONE: 'bg-emerald-500',
  PAUSED: 'bg-slate-300',
  CANCELLED: 'bg-slate-300',
};

interface TaskColumnProps {
  title: string;
  tasks: Task[];
  status: TaskStatus;
  onTaskClick?: (task: Task) => void;
  onDrop?: (taskId: string, newStatus: TaskStatus) => void;
}

export default function TaskColumn({
  title,
  tasks,
  status,
  onTaskClick,
  onDrop,
}: TaskColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const taskId = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('application/json');
    let id = taskId;
    try {
      const parsed = JSON.parse(taskId);
      if (parsed.taskId) id = parsed.taskId;
    } catch {
      // use as-is
    }
    if (id) onDrop?.(id, status);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex w-full min-w-0 flex-col rounded-xl border-2 min-h-[300px] transition-colors ${
        isDragOver
          ? 'border-primary/40 bg-primary-50'
          : 'border-border bg-surface'
      }`}
    >
      <div className="border-b border-border px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${statusColors[status]}`}
            aria-hidden
          />
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          <span className="ml-auto rounded-full bg-surface-muted px-2 py-0.5 text-xs text-ink-muted">
            {tasks.length}
          </span>
        </div>
      </div>
      <div className="ez-task-scrollbar flex-1 min-h-0 space-y-1.5 overflow-y-auto p-1.5">
        {isDragOver && (
          <div className="h-20 rounded-xl border-2 border-dashed border-primary-light/50 bg-primary-50/25 dark:bg-primary-950/10 mb-2 animate-pulse flex items-center justify-center">
            <span className="text-xs font-semibold text-primary">Thả vào đây</span>
          </div>
        )}
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onClick={() => onTaskClick?.(task)}
          />
        ))}
        {tasks.length === 0 && !isDragOver && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-6 text-ink-muted">
            <p className="text-xs">Chưa có công việc</p>
          </div>
        )}
      </div>
    </div>
  );
}
