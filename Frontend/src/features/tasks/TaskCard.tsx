import type { Task, TaskPriority } from '@/types';
import Avatar from '@/components/ui/Avatar';
import { Calendar } from 'lucide-react';
import Badge from '@/components/ui/Badge';

const priorityVariant: Record<TaskPriority, 'danger' | 'warning' | 'info'> = {
  HIGH: 'danger',
  MEDIUM: 'warning',
  LOW: 'info',
};

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  isDragging?: boolean;
}

/** Converts API assignee (with `fullName`) to local member shape (with `name`) */
function assigneeToMember(assignee: Task['assignee']) {
  if (!assignee) return null;
  return {
    id: assignee.id,
    name: assignee.fullName,
    email: assignee.email ?? '',
    avatar: assignee.avatar,
  };
}

export default function TaskCard({ task, onClick, isDragging }: TaskCardProps) {
  const assignee = assigneeToMember(task.assignee);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ taskId: task.id }));
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={`cursor-grab select-none rounded-lg border border-border bg-surface p-3 shadow-sm transition-all duration-200 hover:border-primary/30 hover:shadow-md active:cursor-grabbing ${
        isDragging ? 'opacity-50 scale-95' : ''
      }`}
    >
      <h4 className="mb-1.5 line-clamp-2 text-[15px] font-semibold leading-snug text-ink">
        {task.title}
      </h4>

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge variant={priorityVariant[task.priority]}>{task.priority}</Badge>
        {task.requestType && (
          <Badge variant={task.requestType === 'REVIEW' ? 'info' : 'warning'}>
            {task.requestType === 'REVIEW' ? 'Review request' : 'Hold/leave request'}
          </Badge>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {assignee ? (
            <>
              <Avatar
                name={assignee.name}
                src={assignee.avatar ?? undefined}
                size="sm"
              />
              <span className="truncate text-[13px] text-[#635648]">{assignee.name}</span>
            </>
          ) : (
            <span className="text-[13px] text-[#635648]/50">Chưa giao</span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1 text-[11px] text-[#867668]">
          <Calendar className="h-3.5 w-3.5" strokeWidth={2} />
          <span>
            {task.deadline
              ? new Date(task.deadline).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })
              : '—'}
          </span>
        </div>
      </div>
    </div>
  );
}
