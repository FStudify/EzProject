import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderKanban,
  ListTodo,
  CalendarCheck,
  AlertTriangle,
  Video,
  Clock,
  CheckCircle2,
  Users,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { getProjects } from '@/api/project.api';
import { getTasks } from '@/api/task.api';
import { getActivities } from '@/api/member.api';
import { getMeetings } from '@/api/meeting.api';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTimeGreeting } from '@/lib/greeting';
import { Card, Button } from '@/components/ui';
import type { Project, Task, Activity, Meeting, TaskPriority } from '@/api/types';

type Filter = 'all' | 'mine' | 'team';

function priorityLabel(p: TaskPriority) {
  if (p === 'HIGH') return 'Cao';
  if (p === 'MEDIUM') return 'TB';
  return 'Thấp';
}

function priorityStyle(p: TaskPriority) {
  if (p === 'HIGH') return { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' };
  if (p === 'MEDIUM') return { bg: '#FDF0E8', text: '#B76442', border: '#EFC8B4' };
  return { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' };
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  if (m < 1) return 'vừa';
  if (m < 60) return `${m}m`;
  if (h < 24) return `${h}h`;
  return `${d}d`;
}

function getProjectTheme(value: number) {
  if (value >= 70) return { bar: '#6DBE45', text: '#4B9331', pillBg: '#EFF9E8', pillBorder: '#CDE8BF' };
  if (value >= 40) return { bar: '#D97853', text: '#B76442', pillBg: '#FDF0E8', pillBorder: '#EFC8B4' };
  return { bar: '#274C7D', text: '#31527F', pillBg: '#EDF3FB', pillBorder: '#C9D6E8' };
}

export default function DashboardPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activityFilter, setActivityFilter] = useState<Filter>('all');

  const userId = user?.id;
  const now = Date.now();
  const endOfTodayMs = (() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  })();
  const displayName = user?.fullName?.split(' ').pop() ?? user?.fullName?.split(' ')[0] ?? 'bạn';

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const projectsRes = await getProjects();
      const projectList: Project[] = projectsRes.data ?? [];

      const [tasksData, activitiesData, meetingsData] = await Promise.all([
        Promise.all(projectList.map((p) => getTasks(p.id))),
        Promise.all(projectList.map((p) => getActivities(p.id))),
        Promise.all(projectList.map((p) => getMeetings(p.id))),
      ]);

      setProjects(projectList);
      setTasks(tasksData.flat());
      setActivities(activitiesData.flat());
      setMeetings(meetingsData.flat());
    } catch {
      setError(t('error_load_data') || 'Không thể tải dữ liệu');
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status !== 'COMPLETED' && p.status !== 'ARCHIVED'),
    [projects],
  );

  const todayTasks = useMemo(
    () =>
      tasks
        .filter(
          (t) =>
            userId && t.assignee?.id === userId &&
            t.status !== 'DONE' &&
            t.status !== 'CANCELLED' &&
            t.deadline != null &&
            new Date(t.deadline).getTime() <= endOfTodayMs,
        )
        .sort((a, b) => {
          const pa = a.priority === 'HIGH' ? 0 : a.priority === 'MEDIUM' ? 1 : 2;
          const pb = b.priority === 'HIGH' ? 0 : b.priority === 'MEDIUM' ? 1 : 2;
          const da = new Date(a.deadline ?? 0).getTime() - now;
          const db = new Date(b.deadline ?? 0).getTime() - now;
          return pa - pb || da - db;
        })
        .slice(0, 6),
    [tasks, userId, endOfTodayMs, now],
  );

  const upcomingMeetingsSorted = meetings
    .filter((m) => {
      const start = new Date(m.startTime).getTime();
      return m.status === 'SCHEDULED' && start >= now && start <= now + 48 * 3600000;
    })
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 2);

  const weekDeadlines = useMemo(() => {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const startMs = dayStart.getTime();
    const endMs = startMs + 7 * 86400000;
    const filtered = tasks.filter(
      (t) =>
        t.status !== 'DONE' && t.status !== 'CANCELLED' &&
        t.deadline != null &&
        new Date(t.deadline).getTime() >= startMs &&
        new Date(t.deadline).getTime() < endMs,
    );
    const groups = new Map<string, Task[]>();
    filtered.forEach((t) => {
      const key = new Date(t.deadline ?? 0).toDateString();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(t);
    });
    return Array.from(groups.entries()).map(([k, items]) => ({
      date: new Date(k),
      tasks: items.sort((a, b) => new Date(a.deadline ?? 0).getTime() - new Date(b.deadline ?? 0).getTime()),
    }));
  }, [tasks]);

  const activityFeed = useMemo(() => {
    let list = [...activities].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    if (activityFilter === 'mine' && userId) list = list.filter((a) => a.user?.id === userId);
    if (activityFilter === 'team' && userId) list = list.filter((a) => a.user?.id !== userId);
    return list.slice(0, 5);
  }, [activities, activityFilter, userId]);

  const myTasksCount = useMemo(
    () => tasks.filter((t) => userId && t.assignee?.id === userId && t.status !== 'DONE' && t.status !== 'CANCELLED').length,
    [tasks, userId],
  );
  const doneTasks = useMemo(
    () => tasks.filter((t) => userId && t.assignee?.id === userId && t.status === 'DONE').length,
    [tasks, userId],
  );
  const overdueCount = useMemo(
    () => tasks.filter((t) => userId && t.assignee?.id === userId && t.status !== 'DONE' && t.deadline != null && new Date(t.deadline).getTime() < now).length,
    [tasks, userId, now],
  );

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#D97853' }} />
        <span className="ml-2" style={{ color: '#7D6F66' }}>Đang tải...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p style={{ color: '#7D6F66' }}>{error}</p>
        <Button variant="primary" size="sm" onClick={fetchData}>Thử lại</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1F1F1F' }}>
            {getTimeGreeting()}, {displayName}!
          </h1>
          <p className="mt-1 text-sm" style={{ color: '#7D6F66' }}>
            {todayTasks.length > 0 ? (
              <>{t('my_tasks')}: <span className="font-semibold" style={{ color: '#0651A0' }}>{todayTasks.length}</span></>
            ) : overdueCount > 0 ? (
              <><span className="font-semibold" style={{ color: '#ef4444' }}>{overdueCount}</span> {t('overdue_tasks')}</>
            ) : t('no_projects')}
          </p>
        </div>
        <Link to="/app/projects">
          <Button variant="accent" size="sm">+ {t('create_project')}</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            icon: FolderKanban,
            label: t('nav_projects'),
            value: activeProjects.length,
            sub: t('active'),
            iconBg: 'bg-primary-50 text-primary',
          },
          {
            icon: ListTodo,
            label: t('my_tasks'),
            value: myTasksCount,
            sub: `${t('completed_tasks')}: ${doneTasks}`,
            iconBg: 'bg-primary-50 text-primary-dark',
          },
          {
            icon: AlertTriangle,
            label: t('overdue_tasks'),
            value: overdueCount,
            sub: overdueCount > 0 ? t('need_attention') : t('no'),
            iconBg: 'bg-primary-50 text-primary-dark',
          },
          {
            icon: CalendarCheck,
            label: t('of_total').replace(':total', ''),
            value: '88%',
            sub: t('this_month'),
            iconBg: 'bg-primary-50 text-primary',
          },
        ].map(({ icon: Icon, label, value, sub, iconBg }) => (
          <div key={label} className="ez-stat-card">
            <div className={"mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl " + (iconBg || '')}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold" style={{ color: '#1F1F1F' }}>{value}</p>
            <p className="text-xs font-medium" style={{ color: '#1F1F1F' }}>{label}</p>
            <p className="text-xs" style={{ color: '#7D6F66' }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Tasks */}
        <div className="space-y-4 lg:col-span-2">
          {/* Tasks */}
          <Card padding="none">
            <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: '#E8D8CF' }}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" style={{ color: '#D97853' }} />
                <h2 className="text-sm font-semibold" style={{ color: '#1F1F1F' }}>{t('my_tasks')}</h2>
                {todayTasks.length > 0 && (
                  <span className="rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ backgroundColor: '#D97853' }}>
                    {todayTasks.length}
                  </span>
                )}
              </div>
            </div>
            {todayTasks.length === 0 ? (
              <div className="flex items-center justify-center p-8">
                <p className="text-sm" style={{ color: '#7D6F66' }}>{t('no_projects')}</p>
              </div>
            ) : (
              <ul>
                {todayTasks.map((task) => {
                  const project = projects.find((p) => p.id === task.projectId);
                  const overdue = task.deadline != null && new Date(task.deadline).getTime() < now;
                  const ps = priorityStyle(task.priority);
                  return (
                    <li key={task.id}>
                      <Link
                        to={`/app/projects/${task.projectId}/tasks`}
                        className="flex items-center gap-3 px-4 py-3 transition-colors"
                        style={{ borderBottom: '1px solid #E8D8CF' }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FFF8F3'; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; }}
                      >
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: overdue ? '#ef4444' : '#D97853' }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate" style={{ color: '#1F1F1F' }}>{task.title}</p>
                          <p className="text-xs truncate" style={{ color: '#7D6F66' }}>{project?.name}</p>
                        </div>
                        <span
                          className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{ backgroundColor: ps.bg, color: ps.text, border: `1px solid ${ps.border}` }}
                        >
                          {priorityLabel(task.priority)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Upcoming meetings */}
            {upcomingMeetingsSorted.length > 0 && (
              <Card padding="none">
                <div className="flex items-center gap-2 border-b px-4 py-3" style={{ borderColor: '#E8D8CF' }}>
                  <Video className="h-4 w-4" style={{ color: '#0651A0' }} />
                  <h2 className="text-sm font-semibold" style={{ color: '#1F1F1F' }}>{t('upcoming_meetings')}</h2>
                </div>
                <ul>
                  {upcomingMeetingsSorted.map((m) => (
                    <li key={m.id} className="px-4 py-3" style={{ borderBottom: '1px solid #E8D8CF' }}>
                      <p className="text-sm font-medium" style={{ color: '#1F1F1F' }}>{m.title}</p>
                      <p className="mt-0.5 text-xs" style={{ color: '#7D6F66' }}>
                        {new Date(m.startTime).toLocaleString('vi-VN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Recent projects */}
            <Card padding="none">
              <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: '#E8D8CF' }}>
                <h2 className="text-sm font-semibold" style={{ color: '#1F1F1F' }}>{t('nav_projects')}</h2>
                <Link
                  to="/app/projects"
                  className="flex items-center gap-1 text-xs font-medium transition-colors"
                  style={{ color: '#0651A0' }}
                >
                  {t('view_all')} <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <ul>
                {activeProjects.slice(0, 3).map((p) => (
                  <li key={p.id}>
                    <Link
                      to={`/app/projects/${p.id}`}
                      className="flex items-center gap-3 px-4 py-3 transition-colors"
                      style={{ borderBottom: '1px solid #E8D8CF' }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FFF8F3'; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; }}
                    >
                      <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: '#D97853' }} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium" style={{ color: '#1F1F1F' }}>{p.name}</p>
                        <p className="text-xs" style={{ color: '#7D6F66' }}>{p.progress}% {t('completed')}</p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0" style={{ color: '#7D6F66' }} />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>

        {/* Right: Deadline + Activity */}
        <div className="space-y-4">
          {/* Week deadlines */}
          <Card padding="none">
            <div className="flex items-center gap-2 border-b px-4 py-3" style={{ borderColor: '#E8D8CF' }}>
              <Clock className="h-4 w-4" style={{ color: '#D97853' }} />
              <h2 className="text-sm font-semibold" style={{ color: '#1F1F1F' }}>{t('due_date')}</h2>
            </div>
            {weekDeadlines.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs" style={{ color: '#7D6F66' }}>{t('no_projects')}</p>
            ) : (
              <div>
                {weekDeadlines.map(({ date, tasks: dlTasks }) => {
                  const today = new Date(); today.setHours(0,0,0,0);
                  const diff = Math.round((date.getTime() - today.getTime()) / 86400000);
                  const dayLabel = diff === 0 ? t('today') : diff === 1 ? t('tomorrow') : date.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'short' });
                  return (
                    <div key={date.toISOString()} className="px-4 py-3" style={{ borderBottom: '1px solid #E8D8CF' }}>
                      <p className="text-xs font-semibold" style={{ color: '#7D6F66' }}>{dayLabel}</p>
                      <ul className="mt-1.5 space-y-1">
                        {dlTasks.slice(0, 3).map((tl) => {
                          const overdue = tl.deadline != null && new Date(tl.deadline).getTime() < now;
                          return (
                            <li key={tl.id} className="flex items-start gap-1.5 text-xs">
                              <span
                                className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                                style={{ backgroundColor: overdue ? '#ef4444' : '#D97853' }}
                              />
                              <span style={{ color: overdue ? '#ef4444' : '#635648', fontWeight: overdue ? 500 : 400 }}>
                                {tl.title}
                              </span>
                            </li>
                          );
                        })}
                        {dlTasks.length > 3 && (
                          <li className="pl-3 text-xs" style={{ color: '#7D6F66' }}>+{dlTasks.length - 3} {t('nav_tasks')}</li>
                        )}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Activity */}
          <Card padding="none">
            <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: '#E8D8CF' }}>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" style={{ color: '#008DDE' }} />
                <h2 className="text-sm font-semibold" style={{ color: '#1F1F1F' }}>{t('recent_activity')}</h2>
              </div>
              <div className="flex gap-1">
                {(['all', 'mine', 'team'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setActivityFilter(f)}
                    className="rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors"
                    style={
                      activityFilter === f
                        ? { backgroundColor: '#D97853', color: 'white' }
                        : { backgroundColor: '#F4F8FC', color: '#7D6F66' }
                    }
                  >
                    {f === 'all' ? t('all') : f === 'mine' ? t('my_tasks') : t('nav_members')}
                  </button>
                ))}
              </div>
            </div>
            <ul>
              {activityFeed.map((act) => (
                <li key={act.id} className="px-4 py-3" style={{ borderBottom: '1px solid #E8D8CF' }}>
                  <p className="text-xs" style={{ color: '#635648' }}>
                    <span className="font-semibold" style={{ color: '#1F1F1F' }}>{act.user?.fullName}</span>{' '}
                    {act.action}{' '}
                    <span style={{ color: '#1F1F1F', fontWeight: 500 }}>{act.target}</span>
                  </p>
                  <p className="mt-0.5 text-[11px]" style={{ color: '#7D6F66' }}>
                    {timeAgo(act.timestamp)} {t('previous')}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
