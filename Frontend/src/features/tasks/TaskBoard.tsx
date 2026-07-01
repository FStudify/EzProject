import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Filter, LayoutGrid, GanttChart, AlertTriangle, Clock, ClipboardList, Plus, CheckCircle2 } from 'lucide-react';
import { projectService } from '@/services';
import { getTasks, createTask as apiCreateTask, updateTask as apiUpdateTask, deleteTask as apiDeleteTask } from '@/api/task.api';
import type { Task, TaskStatus } from '@/types';
import { Button, useToast, Skeleton } from '@/components/ui';
import Avatar from '@/components/ui/Avatar';
import { ChatPanel } from '@/features/chat';
import TaskColumn from './TaskColumn';
import TaskTimeline from './TaskTimeline';
import TaskModal from './TaskModal';
import TaskCreationModal from './TaskCreationModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

type ViewMode = 'kanban' | 'timeline' | 'reminders';

const COLUMNS: { status: TaskStatus; titleKey: 'status_backlog' | 'status_in_progress' | 'status_review' | 'status_done' | 'status_paused' }[] = [
  { status: 'BACKLOG',     titleKey: 'status_backlog'     },
  { status: 'IN_PROGRESS', titleKey: 'status_in_progress' },
  { status: 'REVIEW',      titleKey: 'status_review'      },
  { status: 'DONE',        titleKey: 'status_done'         },
  { status: 'PAUSED',      titleKey: 'status_paused'      },
];

interface Filters {
  assigneeId: string;
  priority: string;
  deadlineBefore: string;
  deadlineAfter: string;
  deadlineWithinDays: string;
  search: string;
  hashtag: string;
}

const emptyFilters: Filters = {
  assigneeId: '',
  priority: '',
  deadlineBefore: '',
  deadlineAfter: '',
  deadlineWithinDays: '',
  search: '',
  hashtag: '',
};

export default function TaskBoard() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const { projectId } = useParams<{ projectId: string }>();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [project, setProject] = useState<Awaited<ReturnType<typeof projectService.getById>> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [now, setNow] = useState(() => Date.now());
  const filterRef = useRef<HTMLDivElement>(null);

  const members = project?.members.map((pm) => pm.member) ?? [];
  const currentMembership = project?.members.find((pm) => pm.member.id === user?.id);
  const currentRole = currentMembership?.role ?? 'MEMBER';
  const isOwner = currentMembership?.isOwner === true;
  const isLeader = isOwner || currentRole === 'LEADER';
  const isViceLeader = currentRole === 'VICE_LEADER';
  const isLeaderOrVice = isLeader || isViceLeader;
  // AI generation: leader, vice-leader, supervisor, owner
  const canGenerateAi = Boolean(currentMembership && (isOwner || currentRole === 'LEADER' || currentRole === 'SUPERVISOR' || currentRole === 'VICE_LEADER'));
  // Can drag to DONE/PAUSED: leader or vice-leader only
  const canDragToRestricted = isLeaderOrVice;
  // Can edit task fields (title, description, etc.): leader or vice-leader only
  const canEditTask = isLeaderOrVice;

  const hasActiveFilters = Object.values(filters).some((v) => v !== '');

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter((t) => t.title.toLowerCase().includes(q));
    }
    if (filters.assigneeId) {
      result = result.filter((t) => t.assignee?.id === filters.assigneeId);
    }
    if (filters.priority) {
      result = result.filter((t) => t.priority === filters.priority);
    }
    if (filters.deadlineAfter) {
      const d = new Date(filters.deadlineAfter).getTime();
      result = result.filter((t) => t.deadline && new Date(t.deadline).getTime() >= d);
    }
    if (filters.deadlineBefore) {
      const d = new Date(filters.deadlineBefore).getTime();
      result = result.filter((t) => t.deadline && new Date(t.deadline).getTime() <= d);
    }
    if (filters.deadlineWithinDays) {
      const n = parseInt(filters.deadlineWithinDays, 10);
      if (!Number.isNaN(n) && n >= 0) {
        const nowDate = new Date();
        const startOfToday = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()).getTime();
        const endOfTarget = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate() + n + 1).getTime() - 1;
        result = result.filter(
          (t) =>
            t.status !== 'DONE' &&
            t.status !== 'CANCELLED' &&
            t.deadline &&
            new Date(t.deadline).getTime() >= startOfToday &&
            new Date(t.deadline).getTime() <= endOfTarget
        );
      }
    }
    if (filters.hashtag) {
      const tag = filters.hashtag.toLowerCase();
      result = result.filter((t) => t.hashtags?.some((h) => h.toLowerCase().includes(tag)));
    }
    return result;
  }, [tasks, filters]);

  const getTasksByStatus = (status: TaskStatus) =>
    filteredTasks.filter((t) => {
      if (status === 'DONE') return t.status === 'DONE' || t.status === 'CANCELLED';
      if (status === 'BACKLOG')     return t.status === 'BACKLOG';
      if (status === 'IN_PROGRESS') return t.status === 'IN_PROGRESS';
      if (status === 'REVIEW')      return t.status === 'REVIEW';
      if (status === 'PAUSED')      return t.status === 'PAUSED';
      return t.status === status;
    });

  // Reminders: overdue + due in 3 days
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfDay3 = startOfToday.getTime() + 4 * 24 * 60 * 60 * 1000 - 1;
  const overdueTasks = tasks.filter(
    (t) =>
      t.status !== 'DONE' &&
      t.status !== 'CANCELLED' &&
      t.deadline &&
      new Date(t.deadline).getTime() < now
  );
  const dueSoonTasks = tasks.filter(
    (t) =>
      t.status !== 'DONE' &&
      t.status !== 'CANCELLED' &&
      t.deadline &&
      new Date(t.deadline).getTime() >= now &&
      new Date(t.deadline).getTime() <= endOfDay3
  );

  const handleAddTask = useCallback(async (task: Omit<Task, 'id' | 'comments' | 'commentsCount' | 'createdAt' | 'updatedAt'>) => {
    if (!projectId) return;
    try {
      const created = await apiCreateTask(projectId, {
        title: task.title,
        description: task.description ?? undefined,
        priority: task.priority,
        assigneeId: task.assignee?.id,
        deadline: task.deadline ?? undefined,
        hashtags: task.hashtags ?? undefined,
      });
      setTasks((prev) => [...prev, created]);
      toast(t('task_created') || 'Đã tạo công việc thành công', 'success');
    } catch (err) {
      console.error('Failed to create task:', err);
      toast(t('error') || 'Có lỗi xảy ra. Vui lòng thử lại', 'error');
    }
  }, [projectId, t, toast]);

  const handleDeleteTask = useCallback(async (task: Task) => {
    if (!projectId) return;
    try {
      await apiDeleteTask(projectId, task.id);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      setSelectedTask(null);
      setIsDetailOpen(false);
      toast(t('task_deleted') || 'Đã xóa công việc thành công', 'success');
    } catch (err) {
      console.error('Failed to delete task:', err);
      toast(t('error') || 'Có lỗi xảy ra. Vui lòng thử lại', 'error');
    }
  }, [projectId, t, toast]);

  const handleStatusChange = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    if (!projectId) return;

    // Frontend guard: only leader/vice-leader can drag to DONE or PAUSED
    if ((newStatus === 'DONE' || newStatus === 'PAUSED') && !canDragToRestricted) {
      toast('Chỉ Leader hoặc Vice Leader mới có thể di chuyển công việc vào cột này', 'warning');
      return;
    }

    try {
      const updated = await apiUpdateTask(projectId, taskId, { status: newStatus });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      toast(t('task_updated') || 'Đã cập nhật công việc thành công', 'success');
    } catch (err) {
      console.error('Failed to update task status:', err);
      toast(t('error') || 'Có lỗi xảy ra. Vui lòng thử lại', 'error');
    }
  }, [projectId, t, toast, canDragToRestricted]);

  const handleSaveTask = useCallback(async (updated: Task) => {
    if (!projectId) return;
    try {
      const saved = await apiUpdateTask(projectId, updated.id, {
        title: updated.title,
        description: updated.description ?? undefined,
        status: updated.status,
        priority: updated.priority,
        assigneeId: updated.assignee?.id,
        deadline: updated.deadline ?? undefined,
        hashtags: updated.hashtags,
      });
      setTasks((prev) => prev.map((t) => (t.id === saved.id ? saved : t)));
      setSelectedTask(saved);
      toast(t('task_updated') || 'Đã cập nhật công việc thành công', 'success');
    } catch (err) {
      console.error('Failed to save task:', err);
      toast(t('error') || 'Có lỗi xảy ra. Vui lòng thử lại', 'error');
    }
  }, [projectId, t, toast]);

  useEffect(() => {
    if (!projectId) {
      setTasks([]);
      setProject(null);
      return;
    }

    setIsLoading(true);
    Promise.all([
      getTasks(projectId),
      projectService.getById(projectId),
    ])
      .then(([tasksData, projectData]) => {
        setTasks(tasksData);
        setProject(projectData);
      })
      .catch((err) => {
        console.error('Failed to load tasks or project:', err);
        setTasks([]);
        setProject(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [projectId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showFilters && filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilters(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilters]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const selectClass =
    'rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

  return (
    <div className="flex h-[calc(100dvh-13.35rem)] min-h-[420px] gap-0 overflow-hidden">
      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden pr-3">
        {/* Header row */}
        <div className="mb-2 flex shrink-0 flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg border border-border bg-surface-muted p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[13px] font-medium transition-colors ${
                  viewMode === 'kanban' ? 'bg-primary-50 text-primary-dark' : 'text-slate-600 hover:bg-surface-muted'
                }`}
              >
                <LayoutGrid className="h-4 w-4" /> {t('kanban_view')}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('timeline')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[13px] font-medium transition-colors ${
                  viewMode === 'timeline' ? 'bg-primary-50 text-primary-dark' : 'text-slate-600 hover:bg-surface-muted'
                }`}
              >
                <GanttChart className="h-4 w-4" /> {t('timeline_view')}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('reminders')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[13px] font-medium transition-colors ${
                  viewMode === 'reminders' ? 'bg-primary-50 text-primary-dark' : 'text-slate-600 hover:bg-surface-muted'
                }`}
              >
                <AlertTriangle className="h-4 w-4" /> {t('reminders')}
              </button>
            </div>
          </div>
          {viewMode === 'kanban' && (
            <div className="flex items-center gap-2" ref={filterRef}>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowFilters((p) => !p)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors ${
                    hasActiveFilters
                      ? 'border-primary/30 bg-primary-50 text-primary-dark'
                      : 'border-border text-slate-600 hover:bg-surface-muted'
                  }`}
                >
                  <Filter className="h-4 w-4" />
                  {t('filters')}
                  {hasActiveFilters && (
                    <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-white">
                      {Object.values(filters).filter((v) => v !== '').length}
                    </span>
                  )}
                </button>
                {showFilters && (
                  <div className="absolute right-full top-0 z-50 mr-2 min-w-[320px] rounded-xl border border-border bg-surface p-3 shadow-[0_20px_32px_-28px_rgba(61,38,25,0.7)]">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700">{t('filters')}</span>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={() => setFilters(emptyFilters)}
                          className="text-xs font-medium text-red-600 hover:text-red-700"
                        >
                          {t('clear_all')}
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-0.5 block text-xs font-medium text-slate-500">{t('search')}</label>
                        <input
                          type="text"
                          value={filters.search}
                          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                          placeholder={t('task_name')}
                          className={selectClass + ' w-full'}
                        />
                      </div>
                      <div>
                        <label className="mb-0.5 block text-xs font-medium text-slate-500">{t('member')}</label>
                        <select
                          value={filters.assigneeId}
                          onChange={(e) => setFilters((f) => ({ ...f, assigneeId: e.target.value }))}
                          className={selectClass + ' w-full'}
                        >
                          <option value="">{t('all_members')}</option>
                          {members.map((m) => (
                            <option key={m.id} value={m.id}>{m.fullName}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-0.5 block text-xs font-medium text-slate-500">{t('priority_label')}</label>
                        <select
                          value={filters.priority}
                          onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}
                          className={selectClass + ' w-full'}
                        >
                          <option value="">{t('all')}</option>
                          <option value="HIGH">{t('priority_high')}</option>
                          <option value="MEDIUM">{t('priority_medium')}</option>
                          <option value="LOW">{t('priority_low')}</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-0.5 block text-xs font-medium text-slate-500">{t('deadline_from')}</label>
                        <input
                          type="date"
                          value={filters.deadlineAfter}
                          onChange={(e) => setFilters((f) => ({ ...f, deadlineAfter: e.target.value }))}
                          className={selectClass + ' w-full'}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="mb-0.5 block text-xs font-medium text-slate-500">{t('deadline_to')}</label>
                        <input
                          type="date"
                          value={filters.deadlineBefore}
                          onChange={(e) => setFilters((f) => ({ ...f, deadlineBefore: e.target.value }))}
                          className={selectClass + ' w-full'}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="mb-0.5 block text-xs font-medium text-slate-500">
                          {t('within_n_days')}
                        </label>
                        <input
                          type="number"
                          min={0}
                          placeholder={t('days_example')}
                          value={filters.deadlineWithinDays}
                          onChange={(e) => setFilters((f) => ({ ...f, deadlineWithinDays: e.target.value }))}
                          className={selectClass + ' w-full'}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="mb-0.5 block text-xs font-medium text-slate-500">Hashtag</label>
                        <input
                          type="text"
                          value={filters.hashtag}
                          onChange={(e) => setFilters((f) => ({ ...f, hashtag: e.target.value }))}
                          placeholder="Lọc theo hashtag..."
                          className={selectClass + ' w-full'}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAddOpen(true)}
                className="!bg-primary !py-1.5 !text-[13px] hover:!bg-primary-dark"
              >
                {t('add_task')}
              </Button>
            </div>
          )}
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="grid w-full min-w-[1280px] grid-cols-5 gap-2.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-surface p-4 space-y-4">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ))}
          </div>
        )}

        {/* Views */}
        {!isLoading && tasks.length === 0 ? (
          <div className="flex flex-1 items-center justify-center overflow-hidden rounded-xl border border-[#E8D8CF] bg-[#FFFDFB] p-6 shadow-[0_18px_36px_-30px_rgba(63,38,22,0.52)]">
            <div className="w-full max-w-3xl">
              <div className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FFF5EC] text-[#D97853] shadow-[0_16px_28px_-24px_rgba(201,107,72,0.85)]">
                <ClipboardList className="h-8 w-8" aria-hidden />
              </div>

              <div className="text-center">
                <h3 className="text-xl font-bold text-[#1F1F1F]">{t('no_tasks_title')}</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#7D6F66]">
                  {t('no_tasks_description')}
                </p>
                <Button
                  variant="accent"
                  size="sm"
                  onClick={() => setIsAddOpen(true)}
                  className="mt-5 !inline-flex !items-center !gap-2"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  {t('add_task')}
                </Button>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  { label: t('task_empty_backlog'), dot: '#D97853', icon: ClipboardList },
                  { label: t('task_empty_progress'), dot: '#0651A0', icon: Clock },
                  { label: t('task_empty_done'), dot: '#3F9A5F', icon: CheckCircle2 },
                ].map(({ label, dot, icon: Icon }) => (
                  <div key={label} className="rounded-xl border border-[#E8D8CF] bg-[#FFF8F3] px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: dot }} />
                      <span className="text-sm font-semibold text-[#1F1F1F]">{label}</span>
                      <Icon className="ml-auto h-4 w-4 text-[#8D7B70]" aria-hidden />
                    </div>
                    <div className="mt-3 space-y-2">
                      <div className="h-2 rounded-full bg-white" />
                      <div className="h-2 w-2/3 rounded-full bg-white" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {!isLoading && viewMode === 'reminders' && (
              <div className="flex flex-1 gap-6 overflow-hidden min-h-0">
                <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-surface">
                  <h3 className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3 text-base font-semibold text-slate-900">
                    <AlertTriangle className="h-4 w-4 text-rose-500" />
                    {t('overdue')} ({overdueTasks.length})
                  </h3>
                  <div className="ez-task-scrollbar flex-1 overflow-auto p-4">
                    {overdueTasks.length === 0 ? (
                      <p className="text-sm text-slate-500">{t('no_overdue')}</p>
                    ) : (
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-600">
                            <th className="py-2 pr-3 font-semibold">{t('task')}</th>
                            <th className="py-2 pr-3 font-semibold">{t('assigned_to')}</th>
                            <th className="py-2 font-semibold">{t('due')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {overdueTasks.map((task) => (
                            <tr
                              key={task.id}
                              className="border-b border-slate-100 last:border-0 hover:bg-rose-50/50 cursor-pointer"
                              onClick={() => { setSelectedTask(task); setIsDetailOpen(true); }}
                            >
                              <td className="py-2.5 pr-3 font-medium text-slate-900">{task.title}</td>
                              <td className="py-2.5 pr-3">
                                <div className="flex items-center gap-2">
                                  {task.assignee && (
                                    <>
                                      <Avatar name={task.assignee.fullName} src={task.assignee.avatar ?? undefined} size="sm" />
                                      <span className="text-slate-600">{task.assignee.fullName}</span>
                                    </>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 text-slate-600">
                                {task.deadline && new Date(task.deadline).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
                <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-surface">
                  <h3 className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3 text-base font-semibold text-slate-900">
                    <Clock className="h-4 w-4 text-amber-500" />
                    {t('due_soon_3_days')} ({dueSoonTasks.length})
                  </h3>
                  <div className="ez-task-scrollbar flex-1 overflow-auto p-4">
                    {dueSoonTasks.length === 0 ? (
                      <p className="text-sm text-slate-500">{t('no_due_soon')}</p>
                    ) : (
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-600">
                            <th className="py-2 pr-3 font-semibold">{t('task')}</th>
                            <th className="py-2 pr-3 font-semibold">{t('assigned_to')}</th>
                            <th className="py-2 font-semibold">{t('due')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dueSoonTasks.map((task) => (
                            <tr
                              key={task.id}
                              className="border-b border-slate-100 last:border-0 hover:bg-amber-50/50 cursor-pointer"
                              onClick={() => { setSelectedTask(task); setIsDetailOpen(true); }}
                            >
                              <td className="py-2.5 pr-3 font-medium text-slate-900">{task.title}</td>
                              <td className="py-2.5 pr-3">
                                <div className="flex items-center gap-2">
                                  {task.assignee && (
                                    <>
                                      <Avatar name={task.assignee.fullName} src={task.assignee.avatar ?? undefined} size="sm" />
                                      <span className="text-slate-600">{task.assignee.fullName}</span>
                                    </>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 text-slate-600">
                                {task.deadline && new Date(task.deadline).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!isLoading && viewMode === 'kanban' && (
              <div className="kanban-scroll ez-task-scrollbar flex flex-1 min-h-0 overflow-x-auto overflow-y-hidden pb-2">
                <div className="grid w-full min-w-[1280px] grid-cols-5 gap-2.5">
                  {COLUMNS.map(({ status, titleKey }) => (
                    <TaskColumn
                      key={status}
                      status={status}
                      title={t(titleKey)}
                      tasks={getTasksByStatus(status)}
                      onTaskClick={(task) => {
                        setSelectedTask(task);
                        setIsDetailOpen(true);
                      }}
                      onDrop={handleStatusChange}
                    />
                  ))}
                </div>
              </div>
            )}

            {!isLoading && viewMode === 'timeline' && (
              <div className="ez-task-scrollbar flex-1 overflow-y-auto pb-4">
                {project && (
                  <TaskTimeline
                    tasks={filteredTasks}
                    projectStart={project.createdAt ?? ''}
                    projectDeadline={project.deadline ?? ''}
                    onTaskClick={(task) => {
                      setSelectedTask(task);
                      setIsDetailOpen(true);
                    }}
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Chat panel */}
      {projectId && <ChatPanel projectId={projectId} channel="task" />}

      {/* Modals */}
      <TaskModal
        task={selectedTask}
        isOpen={isDetailOpen}
        onClose={() => { setIsDetailOpen(false); setSelectedTask(null); }}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        members={members}
        projectMembers={project?.members ?? []}
        currentUser={members[0]}
        canEditTask={canEditTask}
        canDeleteTask={canEditTask}
      />
      {projectId && (
        <TaskCreationModal
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          projectId={projectId}
          members={members}
          projectDeadline={project?.deadline}
          projectName={project?.name}
          projectDescription={project?.description}
          canGenerateAi={canGenerateAi}
          onManualAdd={handleAddTask}
          onAiCreated={(created) => {
            setTasks((prev) => [...prev, ...created]);
            toast(`${created.length} công việc đã được tạo`, 'success');
          }}
        />
      )}
    </div>
  );
}
