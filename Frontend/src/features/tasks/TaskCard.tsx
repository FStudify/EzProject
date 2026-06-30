import type { Task, TaskPriority } from '@/types';
import Avatar from '@/components/ui/Avatar';
import { Calendar } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import QuickActionButton from '@/components/ui/QuickActionButton';

const priorityVariant: Record<TaskPriority, 'danger' | 'warning' | 'info'> = {
  HIGH: 'danger',
  MEDIUM: 'warning',
  LOW: 'info',
};

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  onQuickAction?: (taskId: string, newStatus: Task['status']) => Promise<void> | void;
  onApprove?: (task: Task) => Promise<void> | void;
  onReject?: (task: Task) => void;
  currentUserId?: string;
  actionLoading?: boolean;
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

export default function TaskCard({
  task,
  onClick,
  onQuickAction,
  onApprove,
  onReject,
  currentUserId,
  actionLoading,
  isDragging,
}: TaskCardProps) {
  const assignee = assigneeToMember(task.assignee);
  const isAssignedReviewer = task.status === 'REVIEW' && task.reviewer?.id === currentUserId;

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
        {task.status === 'ON_HOLD' && <Badge variant="warning">Tạm dừng</Badge>}
        {task.status === 'CANCELLED' && <Badge variant="danger">Đã hủy</Badge>}
        {task.reviewer && task.status === 'REVIEW' && (
          <Badge variant="info">Reviewer: {task.reviewer.name}</Badge>
        )}
      </div>

      {task.rejectionReason && (
        <p className="mb-2 line-clamp-2 rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700">
          Lý do từ chối: {task.rejectionReason}
        </p>
      )}

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

      {(onQuickAction || isAssignedReviewer) && (
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
          {onQuickAction && (
            <QuickActionButton
              task={task}
              onAction={onQuickAction}
              loading={actionLoading}
            />
          )}
          {isAssignedReviewer && (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  void onApprove?.(task);
                }}
                disabled={actionLoading}
                className="min-h-8 rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
              >
                Phê duyệt
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onReject?.(task);
                }}
                disabled={actionLoading}
                className="min-h-8 rounded-lg border border-rose-100 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
              >
                Từ chối
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
