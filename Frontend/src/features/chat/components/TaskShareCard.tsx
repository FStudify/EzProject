import { useEffect, useState } from 'react';
import { getTask } from '@/api/task.api';
import type { Task } from '@/types';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Tag } from 'lucide-react';
import { Badge } from '@/components/ui';

interface TaskShareCardProps {
  taskId: string;
  fallbackTitle: string;
}

const statusColors: Record<string, string> = {
  BACKLOG: 'bg-slate-100 text-slate-700',
  TODO: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  IN_REVIEW: 'bg-purple-100 text-purple-700',
  DONE: 'bg-emerald-100 text-emerald-700',
};

const priorityColors: Record<string, string> = {
  LOW: 'text-slate-500 bg-slate-100',
  MEDIUM: 'text-amber-600 bg-amber-50',
  HIGH: 'text-rose-600 bg-rose-50',
};

export default function TaskShareCard({ taskId, fallbackTitle }: TaskShareCardProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    getTask(projectId, taskId)
      .then((data) => setTask(data))
      .catch((err) => console.error('Failed to load task for share card:', err))
      .finally(() => setLoading(false));
  }, [projectId, taskId]);

  const handleOpenTask = () => {
    if (projectId) {
      navigate(`/app/projects/${projectId}/tasks?highlightTaskId=${taskId}`);
    }
  };

  if (loading) {
    return (
      <div className="my-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm animate-pulse">
        <div className="h-4 w-1/3 rounded bg-slate-200 mb-4" />
        <div className="h-3 w-1/4 rounded bg-slate-200" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="my-2 rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-sm text-sm text-slate-500 flex items-center justify-between">
        <span>{fallbackTitle} (Task not found)</span>
      </div>
    );
  }

  return (
    <div className="my-2 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md max-w-sm">
      <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Shared Task</span>
        <Badge className={statusColors[task.status] || statusColors.TODO}>
          {task.status.replace('_', ' ')}
        </Badge>
      </div>
      <div className="p-4">
        <h4 className="mb-2 font-semibold text-slate-900 line-clamp-2">{task.title}</h4>
        
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge className={priorityColors[task.priority] || priorityColors.MEDIUM}>
            {task.priority}
          </Badge>
          {task.deadline && (
            <span className="flex items-center text-xs text-slate-500">
              <Calendar className="mr-1 h-3.5 w-3.5" />
              {new Date(task.deadline).toLocaleDateString()}
            </span>
          )}
          {task.hashtags && task.hashtags.length > 0 && (
            <span className="flex items-center text-xs text-slate-500">
              <Tag className="mr-1 h-3.5 w-3.5" />
              {task.hashtags[0]}
              {task.hashtags.length > 1 && ` +${task.hashtags.length - 1}`}
            </span>
          )}
        </div>

        <button
          onClick={handleOpenTask}
          className="w-full rounded-md bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
        >
          Open Task
        </button>
      </div>
    </div>
  );
}
