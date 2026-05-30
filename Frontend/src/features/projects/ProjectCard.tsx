import { Link } from 'react-router-dom';
import type { Project } from '@/types';
import { MemberAvatar } from '@/components/ui';
import { Calendar, CheckCheck } from 'lucide-react';

interface ProjectCardProps {
  project: Project;
}

function getProgressTheme(value: number) {
  if (value >= 70) {
    return {
      accent: 'bg-emerald-500',
      track: 'bg-emerald-100',
      bar: 'bg-emerald-500',
      percent: 'text-emerald-700',
      statusPill: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      statusLabel: 'Tốt',
    };
  }

  if (value >= 40) {
    return {
      accent: 'bg-amber-500',
      track: 'bg-amber-100',
      bar: 'bg-amber-500',
      percent: 'text-amber-700',
      statusPill: 'border-amber-200 bg-amber-50 text-amber-800',
      statusLabel: 'Đang thực hiện',
    };
  }

  return {
    accent: 'bg-primary',
    track: 'bg-slate-200',
    bar: 'bg-slate-500',
    percent: 'text-slate-600',
    statusPill: 'border-slate-200 bg-slate-100 text-slate-700',
    statusLabel: 'Cần tập trung',
  };
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const progress = Math.round(project.progress);
  const theme = getProgressTheme(progress);
  const daysLeft = Math.ceil((new Date(project.deadline).getTime() - Date.now()) / 86400000);
  const dueSoon = daysLeft >= 0 && daysLeft <= 5 && project.status !== 'completed';

  return (
    <Link
      to={`/app/projects/${project.id}`}
      className="group relative block overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md"
    >
      <span className={`pointer-events-none absolute inset-x-0 top-0 h-1 ${theme.accent}`} />

      <div className="flex items-start justify-between gap-3">
        <h3 className="line-clamp-2 text-[22px] font-extrabold leading-tight tracking-[-0.018em] text-ink transition-colors duration-200 group-hover:text-primary">
          {project.name}
        </h3>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {dueSoon && (
            <span className="inline-flex items-center rounded-full border border-danger/30 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-danger">
              Sắp hết hạn
            </span>
          )}
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.03em] ${theme.statusPill}`}
          >
            {theme.statusLabel}
          </span>
        </div>
      </div>

      <p className="mt-1 line-clamp-2 text-[15px] leading-relaxed text-ink-secondary">
        {project.description}
      </p>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
            Tiến độ
          </span>
          <span className={`text-[15px] font-semibold ${theme.percent}`}>{progress}%</span>
        </div>

        <div className={`h-2 rounded-full ${theme.track}`}>
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${theme.bar}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <div className="flex -space-x-2.5">
          {project.members.slice(0, 4).map(({ member, isOwner, role }, index) => (
            <div key={member.id} className="rounded-full ring-2 ring-surface" title={member.fullName}>
              <MemberAvatar
                src={member.avatar}
                name={member.fullName}
                isOwner={isOwner}
                role={role}
                size="sm"
                online={index === 0 || progress >= 70}
              />
            </div>
          ))}
        </div>

        <div className="inline-flex items-center gap-1.5 text-[14px] text-ink-secondary">
          <Calendar className="h-4 w-4 text-ink-muted" strokeWidth={2} />
          <span className="font-medium">
            {new Date(project.deadline).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>
      </div>

      <div className="mt-3">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-muted px-3 py-1.5 text-[13px] font-medium text-ink-secondary">
          <CheckCheck className="h-3.5 w-3.5 text-emerald-600" />
          {project.completedTasks} / {project.totalTasks} công việc
        </span>
      </div>
    </Link>
  );
}
