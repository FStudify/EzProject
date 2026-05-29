import { useMemo } from 'react';
import type { Task, TaskStatus, ProjectMember } from '@/types';
import { ProjectMemberAvatar } from '@/components/ui';

interface TaskTimelineProps {
  tasks: Task[];
  projectDeadline: string;
  projectStart: string;
  projectMembers?: ProjectMember[];
  onTaskClick?: (task: Task) => void;
}

function getTaskBarStyle(
  task: Task,
  startDate: Date,
  endDate: Date,
): { left: number; width: number; color: string } {
  const rangeStart = startDate.getTime();
  const rangeEnd = endDate.getTime();
  const rangeTotal = rangeEnd - rangeStart;
  const taskStart = Math.max(new Date(task.createdAt).getTime(), rangeStart);
  const taskEnd = Math.min(new Date(task.deadline).getTime(), rangeEnd);
  const left = ((taskStart - rangeStart) / rangeTotal) * 100;
  const width = Math.max(3, ((taskEnd - taskStart) / rangeTotal) * 100);

  const statusColors: Record<TaskStatus, string> = {
    DONE: 'bg-[linear-gradient(90deg,#84D062,#6DBE45)]',
    REVIEW: 'bg-amber-500',
    IN_PROGRESS: 'bg-primary',
    BACKLOG: 'bg-slate-400',
    ON_HOLD: 'bg-slate-300',
    CANCELLED: 'bg-slate-300',
  };
  return {
    left,
    width,
    color: statusColors[task.status],
  };
}

export default function TaskTimeline({
  tasks,
  projectDeadline,
  projectStart,
  projectMembers = [],
  onTaskClick,
}: TaskTimelineProps) {
  const startDate = useMemo(() => new Date(projectStart), [projectStart]);
  const endDate = useMemo(() => new Date(projectDeadline), [projectDeadline]);

  const weeks = useMemo(() => {
    const w: { label: string; date: Date }[] = [];
    const d = new Date(startDate);
    d.setHours(0, 0, 0, 0);
    const endTime = endDate.getTime();
    let i = 1;
    while (d.getTime() <= endTime) {
      w.push({
        label: `Week ${i}`,
        date: new Date(d),
      });
      d.setDate(d.getDate() + 7);
      i++;
    }
    return w;
  }, [startDate, endDate]);

  const sortedTasks = useMemo(
    () =>
      [...tasks]
        .filter((t) => t.status !== 'CANCELLED')
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        ),
    [tasks],
  );

  return (
    <div className="space-y-4">
      {/* Project deadline */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 shadow-[0_10px_20px_-18px_rgba(145,88,56,0.62)]">
        <strong>Project deadline:</strong>{' '}
        {endDate.toLocaleDateString(undefined, {
          weekday: 'short',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </div>

      {/* Timeline with grid */}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_16px_30px_-24px_rgba(44,27,18,0.55)]">
        {/* Week headers - grid cells */}
        <div
          className="grid border-b border-border bg-surface-muted"
          style={{ gridTemplateColumns: `180px repeat(${weeks.length}, minmax(64px, 1fr))` }}
        >
          <div className="border-r border-border px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-[#857468]">
            Task
          </div>
          {weeks.map((w, i) => (
            <div
              key={i}
              className="border-r border-border px-1 py-2 text-center text-xs font-medium text-ink-muted last:border-r-0"
            >
              {w.label}
              <br />
              <span className="text-[10px] text-[#A39489]">
                {w.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            </div>
          ))}
        </div>

        {/* Task rows - grid cells with borders */}
        {sortedTasks.map((task) => {
          const { left, width, color } = getTaskBarStyle(
            task,
            startDate,
            endDate,
          );
          const isInProgress = task.status === 'IN_PROGRESS';
          const isUpcoming = task.status === 'BACKLOG';
          const isReview = task.status === 'REVIEW';

          return (
            <div
              key={task.id}
              className="grid cursor-pointer border-b border-border transition-colors last:border-b-0 hover:bg-surface-muted"
              style={{ gridTemplateColumns: `180px repeat(${weeks.length}, minmax(64px, 1fr))` }}
              onClick={() => onTaskClick?.(task)}
            >
              <div className="flex min-w-0 items-center gap-2 border-r border-border px-3 py-2.5">
                <ProjectMemberAvatar member={task.assignee} projectMembers={projectMembers} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#1F1F1F]">
                    {task.title}
                  </p>
                  <p className="text-xs text-[#7F7167]">
                    {task.assignee.name}
                    {isInProgress && (
                      <span className="ml-1 rounded-full bg-primary-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-primary">
                        Đang làm
                      </span>
                    )}
                    {isUpcoming && (
                      <span className="ml-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-amber-700">
                        Backlog
                      </span>
                    )}
                    {isReview && (
                      <span className="ml-1 rounded-full bg-orange-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-orange-700">
                        Chờ review
                      </span>
                    )}
                  </p>
                </div>
              </div>
              {/* Timeline cells - one per week */}
              <div
                className="relative col-span-full h-12 py-2 border-r-0"
                style={{ gridColumn: `2 / -1` }}
              >
                {/* Grid lines for weeks */}
                <div className="absolute inset-0 flex">
                  {weeks.map((_, i) => (
                    <div
                      key={i}
                      className="flex-1 min-w-0 border-r border-border last:border-r-0"
                    />
                  ))}
                </div>
                {/* Task bar */}
                <div
                  className={`absolute top-1/2 h-7 min-w-[28px] -translate-y-1/2 rounded-full ${color} shadow-[0_8px_14px_-10px_rgba(45,29,20,0.45)] transition-all hover:opacity-95 hover:ring-2 hover:ring-primary/35 cursor-pointer`}
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                  }}
                  title={`${task.title} • Click to edit`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
