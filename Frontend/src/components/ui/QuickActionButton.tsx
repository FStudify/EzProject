import { Check, Loader2, Play } from 'lucide-react';
import type { Task, TaskStatus } from '@/types';

interface QuickActionButtonProps {
  task: Task;
  onAction: (taskId: string, newStatus: TaskStatus) => Promise<void> | void;
  disabled?: boolean;
  loading?: boolean;
}

function getQuickAction(task: Task) {
  if (task.status === 'BACKLOG') {
    return {
      label: 'Bắt đầu',
      tooltip: 'Chuyển sang đang làm',
      nextStatus: 'IN_PROGRESS' as TaskStatus,
      Icon: Play,
      className: 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100',
    };
  }

  if (task.status === 'IN_PROGRESS') {
    return {
      label: 'Hoàn thành',
      tooltip: 'Đánh dấu hoàn thành',
      nextStatus: 'DONE' as TaskStatus,
      Icon: Check,
      className: 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100',
    };
  }

  return null;
}

export default function QuickActionButton({
  task,
  onAction,
  disabled = false,
  loading = false,
}: QuickActionButtonProps) {
  const action = getQuickAction(task);
  if (!action) return null;

  const Icon = action.Icon;

  return (
    <button
      type="button"
      data-testid="quick-action-btn"
      title={action.tooltip}
      aria-label={action.tooltip}
      disabled={disabled || loading}
      onClick={(event) => {
        event.stopPropagation();
        void onAction(task.id, action.nextStatus);
      }}
      className={`inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${action.className}`}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
      <span>{action.label}</span>
    </button>
  );
}
