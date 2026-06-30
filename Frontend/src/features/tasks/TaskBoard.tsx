import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Filter, LayoutGrid, GanttChart, AlertTriangle, Clock } from 'lucide-react';
import { projectService } from '@/services';
import {
  addTaskComment,
  approveTask as apiApproveTask,
  getTask,
  getTasks,
  rejectTask as apiRejectTask,
  createTask as apiCreateTask,
  updateTask as apiUpdateTask,
  deleteTask as apiDeleteTask,
} from '@/api/task.api';
import type { Task, TaskStatus } from '@/types';
import { Button, EmptyState, useToast, Skeleton } from '@/components/ui';
import Avatar from '@/components/ui/Avatar';
import { ChatPanel } from '@/features/chat';
import TaskColumn from './TaskColumn';
import TaskTimeline from './TaskTimeline';
import TaskModal from './TaskModal';
import AddTaskModal from './AddTaskModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import ReviewModal from '@/components/modals/ReviewModal';
import RejectReasonModal from '@/components/modals/RejectReasonModal';
import { STATUS_COLUMNS, groupTasksByColumn } from '@/utils/taskGrouping';

type ViewMode = 'kanban' | 'timeline' | 'reminders';

interface Filters {
  assigneeId: string;
  priority: string;
  deadlineBefore: string;
  deadlineAfter: string;
  deadlineWithinDays: string;
  search: string;
}

const emptyFilters: Filters = {
  assigneeId: '',
  priority: '',
  deadlineBefore: '',
  deadlineAfter: '',
  deadlineWithinDays: '',
  search: '',
};

export default function TaskBoard() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const { projectId } = useParams<{ projectId: string }>();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [project, setProject] = useState<Awaited<ReturnType<typeof projectService.getById>> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [reviewTask, setReviewTask] = useState<Task | null>(null);
  const [rejectTask, setRejectTask] = useState<Task | null>(null);
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<string>>(() => new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [now, setNow] = useState(() => Date.now());
  const filterRef = useRef<HTMLDivElement>(null);

  const members = project?.members.map((pm) => pm.member) ?? [];
  const currentMember = useMemo(() => {
    if (!user) return undefined;
    return members.find((member) => member.id === user.id) ?? {
      id: user.id,
      name: user.fullName,
      fullName: user.fullName,
      email: user.email ?? '',
      avatar: user.avatar ?? null,
    };
  }, [members, user]);

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
    return result;
  }, [tasks, filters]);
  const groupedTasks = useMemo(() => groupTasksByColumn(filteredTasks), [filteredTasks]);

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
      });
      setTasks((prev) => [...prev, created]);
      toast(t('task_created') || 'ÄÃ£ táº¡o cÃ´ng viá»‡c thÃ nh cÃ´ng', 'success');
    } catch (err) {
      console.error('Failed to create task:', err);
      toast(t('error') || 'CÃ³ lá»—i xáº£y ra. Vui lÃ²ng thá»­ láº¡i', 'error');
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

  const markTaskPending = useCallback((taskId: string, pending: boolean) => {
    setPendingTaskIds((prev) => {
      const next = new Set(prev);
      if (pending) next.add(taskId);
      else next.delete(taskId);
      return next;
    });
  }, []);

  const replaceTask = useCallback((updated: Task) => {
    setTasks((prev) => prev.map((task) => (task.id === updated.id ? updated : task)));
    setSelectedTask((prev) => (prev?.id === updated.id ? updated : prev));
  }, []);

  const handleStatusChange = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    if (!projectId) return;
    const originalTask = tasks.find((task) => task.id === taskId);
    if (!originalTask) return;
    if (newStatus === 'REVIEW') {
      setReviewTask(originalTask);
      return;
    }

    markTaskPending(taskId, true);
    setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, status: newStatus } : task)));
    try {
      const updated = await apiUpdateTask(projectId, taskId, { status: newStatus });
      replaceTask(updated);
      toast(t('task_updated') || 'Đã cập nhật công việc thành công', 'success');
    } catch (err) {
      console.error('Failed to update task status:', err);
      setTasks((prev) => prev.map((task) => (task.id === taskId ? originalTask : task)));
      setSelectedTask((prev) => (prev?.id === taskId ? originalTask : prev));
      toast(t('error') || 'Có lỗi xảy ra. Vui lòng thử lại', 'error');
    } finally {
      markTaskPending(taskId, false);
    }
  }, [markTaskPending, projectId, replaceTask, t, tasks, toast]);

  const confirmReviewAssignment = useCallback(async (reviewerId: string) => {
    if (!projectId || !reviewTask) return;
    const originalTask = reviewTask;
    const reviewer = members.find((member) => member.id === reviewerId) ?? null;

    markTaskPending(reviewTask.id, true);
    setTasks((prev) =>
      prev.map((task) =>
        task.id === reviewTask.id ? { ...task, status: 'REVIEW', reviewer } : task,
      ),
    );

    try {
      const updated = await apiUpdateTask(projectId, reviewTask.id, {
        status: 'REVIEW',
        reviewerId,
      });
      replaceTask(updated);
      setReviewTask(null);
      toast('Đã gửi công việc để đánh giá.', 'success');
    } catch (err) {
      console.error('Failed to assign reviewer:', err);
      setTasks((prev) => prev.map((task) => (task.id === reviewTask.id ? originalTask : task)));
      toast(t('error') || 'Không thể gửi đánh giá', 'error');
      throw err;
    } finally {
      markTaskPending(reviewTask.id, false);
    }
  }, [markTaskPending, members, projectId, replaceTask, reviewTask, t, toast]);

  const handleApproveTask = useCallback(async (task: Task) => {
    if (!projectId) return;
    const originalTask = task;
    markTaskPending(task.id, true);
    setTasks((prev) => prev.map((item) => (item.id === task.id ? { ...item, status: 'DONE' } : item)));

    try {
      const updated = await apiApproveTask(projectId, task.id);
      replaceTask(updated);
      toast('Đã phê duyệt công việc.', 'success');
    } catch (err) {
      console.error('Failed to approve task:', err);
      setTasks((prev) => prev.map((item) => (item.id === task.id ? originalTask : item)));
      toast(t('error') || 'Không thể phê duyệt công việc', 'error');
    } finally {
      markTaskPending(task.id, false);
    }
  }, [markTaskPending, projectId, replaceTask, t, toast]);

  const confirmRejectTask = useCallback(async (reason: string) => {
    if (!projectId || !rejectTask) return;
    const originalTask = rejectTask;
    markTaskPending(rejectTask.id, true);
    setTasks((prev) =>
      prev.map((item) =>
        item.id === rejectTask.id
          ? { ...item, status: 'IN_PROGRESS', rejectionReason: reason }
          : item,
      ),
    );

    try {
      const updated = await apiRejectTask(projectId, rejectTask.id, reason);
      replaceTask(updated);
      setRejectTask(null);
      toast('Đã từ chối và trả công việc về Đang làm.', 'success');
    } catch (err) {
      console.error('Failed to reject task:', err);
      setTasks((prev) => prev.map((item) => (item.id === rejectTask.id ? originalTask : item)));
      toast(t('error') || 'Không thể từ chối công việc', 'error');
      throw err;
    } finally {
      markTaskPending(rejectTask.id, false);
    }
  }, [markTaskPending, projectId, rejectTask, replaceTask, t, toast]);

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
      });
      setTasks((prev) => prev.map((t) => (t.id === saved.id ? saved : t)));
      setSelectedTask(saved);
      toast(t('task_updated') || 'ÄÃ£ cáº­p nháº­t cÃ´ng viá»‡c thÃ nh cÃ´ng', 'success');
    } catch (err) {
      console.error('Failed to save task:', err);
      toast(t('error') || 'CÃ³ lá»—i xáº£y ra. Vui lÃ²ng thá»­ láº¡i', 'error');
    }
  }, [markTaskPending, projectId, replaceTask, t, tasks, toast]);

  const openTaskDetail = useCallback(async (task: Task) => {
    if (!projectId) {
      setSelectedTask(task);
      setIsDetailOpen(true);
      return;
    }

    setSelectedTask(task);
    setIsDetailOpen(true);
    try {
      const freshTask = await getTask(projectId, task.id);
      setTasks((prev) => prev.map((item) => (item.id === freshTask.id ? freshTask : item)));
      setSelectedTask(freshTask);
    } catch (err) {
      console.error('Failed to load task detail:', err);
      toast(t('error') || 'KhÃ´ng thá»ƒ táº£i chi tiáº¿t cÃ´ng viá»‡c má»›i nháº¥t', 'error');
    }
  }, [projectId, t, toast]);

  const handleAddTaskComment = useCallback(async (task: Task, content: string, mentions?: string[]) => {
    if (!projectId) return task;
    try {
      await addTaskComment(projectId, task.id, { content, mentions });
      const freshTask = await getTask(projectId, task.id);
      setTasks((prev) => prev.map((item) => (item.id === freshTask.id ? freshTask : item)));
      setSelectedTask(freshTask);
      return freshTask;
    } catch (err) {
      console.error('Failed to add task comment:', err);
      toast(t('error') || 'KhÃ´ng thá»ƒ gá»­i cáº­p nháº­t. Vui lÃ²ng thá»­ láº¡i', 'error');
      throw err;
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
          <div className="grid w-full min-w-[1020px] grid-cols-4 gap-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
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
          <div className="flex flex-1 items-center justify-center bg-surface rounded-xl border border-border p-8">
            <EmptyState
              title={t('no_tasks_title') || 'ChÆ°a cÃ³ cÃ´ng viá»‡c nÃ o'}
              description={t('no_tasks_description') || 'Táº¡o cÃ´ng viá»‡c Ä‘áº§u tiÃªn Ä‘á»ƒ báº¯t Ä‘áº§u quáº£n lÃ½ dá»± Ã¡n!'}
              actionLabel={t('add_task') || 'ThÃªm cÃ´ng viá»‡c'}
              onAction={() => setIsAddOpen(true)}
            />
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
                              onClick={() => { void openTaskDetail(task); }}
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
                              onClick={() => { void openTaskDetail(task); }}
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
                <div className="grid w-full min-w-[1020px] grid-cols-4 gap-2.5">
                  {STATUS_COLUMNS.map((column) => (
                    <TaskColumn
                      key={column.id}
                      status={column.targetStatus}
                      title={column.title}
                      tasks={groupedTasks[column.id]}
                      onTaskClick={(task) => { void openTaskDetail(task); }}
                      onDrop={handleStatusChange}
                      onQuickAction={handleStatusChange}
                      onApprove={handleApproveTask}
                      onReject={setRejectTask}
                      currentUserId={user?.id}
                      pendingTaskIds={pendingTaskIds}
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
                    onTaskClick={(task) => { void openTaskDetail(task); }}
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
        onAddComment={handleAddTaskComment}
        onDelete={handleDeleteTask}
        members={members}
        projectMembers={project?.members ?? []}
        currentUser={currentMember}
      />
      <ReviewModal
        isOpen={!!reviewTask}
        task={reviewTask}
        projectMembers={project?.members ?? []}
        currentUserId={user?.id}
        onConfirm={confirmReviewAssignment}
        onCancel={() => setReviewTask(null)}
      />
      <RejectReasonModal
        isOpen={!!rejectTask}
        task={rejectTask}
        onConfirm={confirmRejectTask}
        onCancel={() => setRejectTask(null)}
      />
      {projectId && (
        <AddTaskModal
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          onAdd={handleAddTask}
          projectId={projectId}
          members={members}
        />
      )}
    </div>
  );
}
