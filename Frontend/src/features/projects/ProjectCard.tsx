import { Link } from 'react-router-dom';
import type { Project } from '@/types';
import { MemberAvatar } from '@/components/ui';
import { Calendar, CheckCheck, Pencil } from 'lucide-react';

interface ProjectCardProps {
  project: Project;
  currentUserId?: string;
  onEdit?: (project: Project) => void;
}

function getProgressTheme(value: number) {
  if (value >= 70) {
    return {
      bar: '#6DBE45',
      track: '#EAF7E2',
      percent: '#4E9D33',
      pillBg: '#EFF9E8',
      pillBorder: '#CDE8BF',
      pillText: '#4B9331',
      topBar: 'linear-gradient(90deg, #8BD66A 0%, #6DBE45 100%)',
    };
  }
  if (value >= 40) {
    return {
      bar: '#D97853',
      track: '#F5E7DD',
      percent: '#B76442',
      pillBg: '#FDF0E8',
      pillBorder: '#EFC8B4',
      pillText: '#B76442',
      topBar: 'linear-gradient(90deg, #E89B78 0%, #D97853 100%)',
    };
  }
  return {
    bar: '#274C7D',
    track: '#E8EEF6',
    percent: '#31527F',
    pillBg: '#EDF3FB',
    pillBorder: '#C9D6E8',
    pillText: '#31527F',
    topBar: 'linear-gradient(90deg, #4D668D 0%, #274C7D 100%)',
  };
}

export default function ProjectCard({ project, currentUserId, onEdit }: ProjectCardProps) {
  const progress = Math.round(project.progress);
  const theme = getProgressTheme(progress);
  const deadlineTime = project.deadline ? new Date(project.deadline).getTime() : Number.NaN;
  const daysLeft = Number.isNaN(deadlineTime) ? null : Math.ceil((deadlineTime - Date.now()) / 86400000);
  const dueSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 5 && project.status !== 'COMPLETED';
  const canEdit =
    !!currentUserId &&
    (project.ownerId === currentUserId ||
      project.members.some((item) => item.isOwner && item.member.id === currentUserId));

  return (
    <div
      className="relative flex min-h-[380px] flex-col overflow-hidden rounded-2xl p-5 pb-14 transition-all duration-200"
      style={{
        border: '1px solid #E8D8CF',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,249,244,0.72) 100%)',
        boxShadow: '0 18px 30px -24px rgba(38, 24, 16, 0.6)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 22px 36px -24px rgba(38, 24, 16, 0.55)';
        e.currentTarget.style.borderColor = '#D8C9BD';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = '0 18px 30px -24px rgba(38, 24, 16, 0.6)';
        e.currentTarget.style.borderColor = '#E8D8CF';
      }}
    >
      <span
        className="pointer-events-none absolute inset-x-0 top-0 block h-[3px]"
        style={{ background: theme.topBar }}
      />

      {canEdit && onEdit && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEdit(project);
          }}
          className="absolute bottom-4 right-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border bg-white text-[#D97853] shadow-md transition hover:-translate-y-0.5 hover:border-[#D97853] hover:bg-[#FFF5EC]"
          style={{ borderColor: '#E8D8CF' }}
          title="Chỉnh sửa dự án"
          aria-label="Chỉnh sửa dự án"
        >
          <Pencil className="h-4 w-4" />
        </button>
      )}

      <Link to={`/app/projects/${project.id}`} className="flex min-h-0 flex-1 flex-col">
        <div className="mt-1 flex min-h-[64px] items-start justify-between gap-3">
          <h3
            className="line-clamp-2 leading-tight transition-colors duration-200"
            style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.018em', color: '#1F1F1F' }}
          >
            {project.name}
          </h3>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {dueSoon && (
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                }}
              >
                Sắp hết hạn
              </span>
            )}
            <span
              className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.03em]"
              style={{
                backgroundColor: theme.pillBg,
                border: `1px solid ${theme.pillBorder}`,
                color: theme.pillText,
              }}
            >
              {progress >= 70 ? 'Tốt' : progress >= 40 ? 'Đang thực hiện' : 'Cần tập trung'}
            </span>
          </div>
        </div>

        <p
          className="mt-2 line-clamp-3 min-h-[72px] leading-relaxed"
          style={{ fontSize: '15px', color: '#635648' }}
        >
          {project.description || 'Chưa có mô tả cho dự án này.'}
        </p>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <span
              className="text-[11px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: '#A0816E' }}
            >
              Tiến độ
            </span>
            <span
              className="text-[15px] font-bold"
              style={{ color: theme.percent }}
            >
              {progress}%
            </span>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full"
            style={{ backgroundColor: theme.track }}
          >
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%`, backgroundColor: theme.bar }}
            />
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between pt-4" style={{ borderTop: '1px solid #F0E1D8' }}>
          <div className="flex -space-x-2.5">
            {project.members.slice(0, 4).map(({ member, isOwner, role }, index) => (
              <div
                key={member.id}
                className="rounded-full ring-2"
                style={{ borderColor: '#ffffff' }}
                title={member.fullName}
              >
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

          <div className="inline-flex items-center gap-1.5 text-[14px]" style={{ color: '#635648' }}>
            <Calendar className="h-4 w-4" strokeWidth={2} style={{ color: '#A0816E' }} />
            <span className="font-medium">
              {Number.isNaN(deadlineTime)
                ? 'Chưa có hạn'
                : new Date(deadlineTime).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
            </span>
          </div>
        </div>

        <div className="mt-3">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium"
            style={{
              backgroundColor: '#FFFDFB',
              border: '1px solid #E8D8CF',
              color: '#635648',
            }}
          >
            <CheckCheck className="h-3.5 w-3.5" style={{ color: '#53B848' }} />
            {project.completedTasks} / {project.totalTasks} công việc
          </span>
        </div>
      </Link>
    </div>
  );
}
