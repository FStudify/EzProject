import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Users,
  CheckSquare,
  Clock,
  ArrowRight,
  AlertTriangle,
  TrendingUp,
  Loader2,
  ClipboardList,
  CheckCircle2,
  PlayCircle,
  Pencil,
  Save,
  X,
} from 'lucide-react';
import { getProject, updateProject } from '@/api/project.api';
import { getTasks } from '@/api/task.api';
import { getActivities } from '@/api/member.api';
import type { Project, Task, Activity } from '@/types';
import { Card, ProgressBar, MemberAvatar } from '@/components/ui';
import { getRoleLabel } from '@/components/ui/RoleIcons';
import { useChatSocket } from '@/contexts/ChatSocketContext';
import { useToast } from '@/components/ui';

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  if (m < 1) return 'Vừa xong';
  if (m < 60) return `${m} phút trước`;
  if (h < 24) return `${h} giờ trước`;
  if (d < 7) return `${d} ngày trước`;
  return new Date(ts).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' });
}

function toDateInputValue(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export default function ProjectOverview() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [savingProject, setSavingProject] = useState(false);
  const { joinProject, leaveProject } = useChatSocket();
  const { toast } = useToast();

  const refresh = useCallback(() => {
    if (!projectId) return;
    setLoading(true);
    Promise.all([
      getProject(projectId),
      getTasks(projectId),
      getActivities(projectId, 20),
    ]).then(([projectData, tasksData, activitiesData]) => {
      setProject(projectData as Project | null);
      setTasks(tasksData as Task[]);
      setActivities(activitiesData);
    }).catch(() => {
      setProject(null);
      setTasks([]);
      setActivities([]);
    }).finally(() => {
      setLoading(false);
    });
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    refresh();
    joinProject(projectId);
    return () => {
      leaveProject(projectId);
    };
  }, [projectId, refresh, joinProject, leaveProject]);

  // Real-time: when someone joins or leaves this project, refresh + toast
  useEffect(() => {
    if (!projectId) return;
    const handleJoined = (event: Event) => {
      const detail = (event as CustomEvent<{ projectId: string; userId: string }>).detail;
      if (detail?.projectId !== projectId) return;
      refresh();
      toast('Một thành viên vừa tham gia dự án', 'success');
    };
    const handleRemoved = (event: Event) => {
      const detail = (event as CustomEvent<{ projectId: string; removedUserId: string; bySelf: boolean }>).detail;
      if (detail?.projectId !== projectId) return;
      if (detail.bySelf) {
        toast('Bạn đã bị xoá khỏi dự án', 'warning');
        navigate('/app', { replace: true });
      } else {
        refresh();
        toast('Một thành viên vừa rời dự án', 'warning');
      }
    };
    window.addEventListener('project:member:joined', handleJoined);
    window.addEventListener('project:member:removed', handleRemoved);
    return () => {
      window.removeEventListener('project:member:joined', handleJoined);
      window.removeEventListener('project:member:removed', handleRemoved);
    };
  }, [projectId, refresh, toast]);

  const startEditProject = () => {
    if (!project) return;
    setEditName(project.name);
    setEditDeadline(toDateInputValue(project.deadline));
    setIsEditingProject(true);
  };

  const cancelEditProject = () => {
    setIsEditingProject(false);
    setEditName('');
    setEditDeadline('');
  };

  const saveProjectInfo = async () => {
    if (!projectId || !project) return;

    const name = editName.trim();
    if (!name) {
      toast('Vui lòng nhập tên dự án', 'error');
      return;
    }
    if (!editDeadline) {
      toast('Vui lòng chọn hạn chót dự án', 'error');
      return;
    }

    setSavingProject(true);
    try {
      const deadline = new Date(editDeadline).toISOString();
      await updateProject(projectId, { name, deadline });
      setProject((current) => current ? { ...current, name, deadline } : current);
      setIsEditingProject(false);
      toast('Đã cập nhật thông tin dự án', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Không thể cập nhật dự án', 'error');
    } finally {
      setSavingProject(false);
    }
  };

  const stats = useMemo(() => {
    const now = Date.now();
    return {
      total: tasks.length,
      done: tasks.filter(t => t.status === 'DONE').length,
      inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
      overdue: tasks.filter(t => t.status !== 'DONE' && t.status !== 'CANCELLED' && t.deadline != null && new Date(t.deadline).getTime() < now).length,
    };
  }, [tasks]);

  const recent = useMemo(
    () => [...activities]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 4),
    [activities],
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-ink-muted">Đang tải...</span>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="py-16 text-center">
        <p className="text-ink-muted">Không tìm thấy dự án.</p>
      </div>
    );
  }

  const deadlineTime = project.deadline ? new Date(project.deadline).getTime() : Number.NaN;
  const daysLeft = Number.isNaN(deadlineTime) ? null : Math.ceil((deadlineTime - Date.now()) / 86400000);
  const deadlineColor = daysLeft === null || daysLeft < 0 ? 'text-danger' : daysLeft <= 3 ? 'text-warning' : 'text-success';

  const quickLinks = [
    { to: 'tasks', icon: CheckSquare, label: 'Công việc', count: stats.total },
    { to: 'documents', icon: Clock, label: 'Tài liệu', count: null },
    { to: 'members', icon: Users, label: 'Thành viên', count: project.members.length },
    { to: 'meetings', icon: Calendar, label: 'Cuộc họp', count: null },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          {isEditingProject ? (
            <div className="max-w-xl rounded-xl border border-border bg-surface p-4 shadow-sm">
              <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Tên dự án</span>
                  <input
                    type="text"
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    className="ez-input w-full"
                    maxLength={120}
                    autoFocus
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Hạn chót</span>
                  <input
                    type="date"
                    value={editDeadline}
                    onChange={(event) => setEditDeadline(event.target.value)}
                    className="ez-input w-full"
                  />
                </label>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={saveProjectInfo}
                  disabled={savingProject}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingProject ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Lưu
                </button>
                <button
                  type="button"
                  onClick={cancelEditProject}
                  disabled={savingProject}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-ink-secondary transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <X className="h-4 w-4" />
                  Hủy
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-ink">{project.name}</h1>
                <button
                  type="button"
                  onClick={startEditProject}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-xs font-semibold text-ink-secondary transition hover:border-primary/40 hover:text-primary"
                  title="Chỉnh sửa tên và hạn chót dự án"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Chỉnh sửa
                </button>
              </div>
              <p className="mt-1 text-sm text-ink-muted">{project.description}</p>
            </>
          )}
        </div>
        <div className="shrink-0 text-center rounded-xl border border-border bg-surface px-4 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Hạn chót</p>
          <p className={`mt-0.5 text-lg font-bold ${deadlineColor}`}>
            {daysLeft === null
              ? 'Chưa đặt'
              : daysLeft < 0
                ? `Quá ${Math.abs(daysLeft)} ngày`
                : daysLeft === 0 ? 'Hôm nay' : `Còn ${daysLeft} ngày`}
          </p>
        </div>
      </div>

      {/* Progress */}
      <Card>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-ink-secondary">Tiến độ tổng thể</span>
          <span className="text-sm font-bold text-ink">{project.progress}%</span>
        </div>
        <ProgressBar value={project.progress} size="sm" />
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: 'Tổng công việc', value: stats.total, color: 'text-ink', icon: ClipboardList, bg: 'bg-slate-50 border-slate-200', iconColor: 'text-slate-600' },
          { label: 'Hoàn thành', value: stats.done, color: 'text-success', icon: CheckCircle2, bg: 'bg-emerald-50/50 border-emerald-100', iconColor: 'text-emerald-600' },
          { label: 'Đang làm', value: stats.inProgress, color: 'text-primary', icon: PlayCircle, bg: 'bg-blue-50/50 border-blue-100', iconColor: 'text-blue-600' },
          { label: 'Thành viên', value: project.members.length, color: 'text-orange-600', icon: Users, bg: 'bg-orange-50/50 border-orange-100', iconColor: 'text-orange-600' },
          { label: 'Ngày còn lại', value: daysLeft === null || daysLeft < 0 ? 0 : daysLeft, color: deadlineColor, icon: Calendar, bg: daysLeft === null || daysLeft < 0 ? 'bg-rose-50/50 border-rose-100' : 'bg-teal-50/50 border-teal-100', iconColor: daysLeft === null || daysLeft < 0 ? 'text-rose-600' : 'text-teal-600' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`rounded-xl border px-4 py-3 flex flex-col justify-between hover:scale-[1.02] transition-transform duration-200 ${s.bg}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-ink-muted tracking-wide uppercase">{s.label}</span>
                <Icon className={`h-4 w-4 ${s.iconColor}`} />
              </div>
              <p className={`text-2xl font-extrabold tracking-tight ${s.color}`}>{s.value}</p>
            </div>
          );
        })}
      </div>

      {/* Alert */}
      {stats.overdue > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-danger/20 bg-rose-50 px-4 py-2.5 text-sm text-rose-800">
          <AlertTriangle className="h-4 w-4 shrink-0 text-danger" />
          <span className="font-medium">{stats.overdue} công việc đang quá hạn</span>
          <Link to="tasks" className="ml-auto text-xs font-medium text-danger hover:underline flex items-center gap-0.5">
            Xem ngay <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* Quick links + Activity */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Quick links */}
        <Card>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <TrendingUp className="h-4 w-4 text-primary" />
            Truy cập nhanh
          </h3>
          <ul className="space-y-1">
            {quickLinks.map(link => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-ink-secondary hover:bg-primary-50 hover:text-primary transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <link.icon className="h-4 w-4" />
                    {link.label}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {link.count !== null && (
                      <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-ink-muted">{link.count}</span>
                    )}
                    <ArrowRight className="h-3.5 w-3.5 opacity-40" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        {/* Team */}
        <Card>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <Users className="h-4 w-4 text-primary" />
            Thành viên
          </h3>
          <ul className="space-y-2">
            {project.members.slice(0, 5).map(({ member, role, isOwner }) => {
              const active = tasks.filter(t => t.assignee?.id === member.id && t.status !== 'DONE').length;
              return (
                <li key={member.id} className="flex items-center gap-2.5">
                  <MemberAvatar src={member.avatar} name={member.fullName} isOwner={isOwner} role={role} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{member.fullName}</p>
                    <p className="text-xs text-ink-muted">{getRoleLabel(role, isOwner)}</p>
                  </div>
                  {active > 0 && (
                    <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary">{active}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>

        {/* Activity */}
        <Card>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <Clock className="h-4 w-4 text-primary" />
            Hoạt động gần đây
          </h3>
          {recent.length === 0 ? (
            <p className="text-sm text-ink-muted">Chưa có hoạt động.</p>
          ) : (
            <ul className="space-y-3">
              {recent.map(act => (
                <li key={act.id} className="flex items-start gap-2">
                  <MemberAvatar src={act.user.avatar} name={act.user.fullName} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-ink-secondary">
                      <span className="font-semibold text-ink">{act.user.fullName}</span> {act.action}{' '}
                      <span className="font-medium text-ink">{act.target}</span>
                    </p>
                    <p className="text-[11px] text-ink-muted">{timeAgo(act.timestamp)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
