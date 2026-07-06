import { useMemo, useState, useEffect } from 'react';
import { MessageSquare, Send, Timer, Share2 } from 'lucide-react';
import type { Task, TaskStatus, TaskPriority, TaskComment, Member, ProjectMember } from '@/types';
import { Modal, Button, ProjectMemberAvatar } from '@/components/ui';
import { DatePickerField, PolishedSelect } from './TaskFormControls';
import { addTaskComment } from '@/api/task.api';
import { useLanguage } from '@/contexts/LanguageContext';
import ShareDialog from '../chat/components/ShareDialog';

type ModalSelectOption = {
  value: string;
  label: string;
  tone?: 'accent' | 'positive' | 'muted';
};

const PRIORITY_OPTIONS: ModalSelectOption[] = [
  { value: 'HIGH', label: 'Cao', tone: 'accent' },
  { value: 'MEDIUM', label: 'Trung bình', tone: 'muted' },
  { value: 'LOW', label: 'Thấp', tone: 'positive' },
];

const QUICK_UPDATES = [
  'Đã hoàn thành phần này.',
  'Đang tiến hành...',
  'Gặp vấn đề, cần hỗ trợ.',
  'Đã sửa lỗi.',
  'Đang review code.',
];

interface TaskModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  members?: Member[];
  projectMembers?: ProjectMember[];
  currentUser?: Member;
  projectId: string;
  /** Chỉ leader / vice-leader mới được sửa task fields */
  canEditTask?: boolean;
  /** Chỉ leader / vice-leader mới được xóa task */
  canDeleteTask?: boolean;
}

interface TaskModalContentProps extends Omit<TaskModalProps, 'task'> {
  task: Task;
}

export default function TaskModal({ task, ...props }: TaskModalProps) {
  if (!task) return null;
  return <TaskModalContent key={task.id} task={task} {...props} />;
}

function TaskModalContent({
  task,
  isOpen,
  onClose,
  onSave,
  onDelete,
  members = [],
  projectMembers = [],
  currentUser,
  canEditTask = false,
  canDeleteTask = false,
  projectId,
}: TaskModalContentProps) {
  const { t } = useLanguage();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [assigneeId, setAssigneeId] = useState(task.assignee?.id ?? '');
  const [startDate, setStartDate] = useState(task.startDate ? task.startDate.slice(0, 10) : task.createdAt.slice(0, 10));
  const [deadline, setDeadline] = useState((task.deadline ?? '').slice(0, 10));
  const [requestType, setRequestType] = useState<'none' | 'review' | 'pause' | string>((task.requestType as string) ?? 'none');
  const [requestNote, setRequestNote] = useState(task.requestNote ?? '');
  const [hashtags, setHashtags] = useState(task.hashtags?.join(', ') ?? '');
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<TaskComment[]>(task.comments ?? []);
  const [activeTab, setActiveTab] = useState<'details' | 'focus'>('details');
  const [dateError, setDateError] = useState<string | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);

  const todayValue = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}-${`${now.getDate()}`.padStart(2, '0')}`;
  }, []);

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    setDateError(null);
    if (deadline && value && deadline < value) {
      setDeadline(value);
    }
  };

  const handleDeadlineChange = (value: string) => {
    setDeadline(value);
    setDateError(null);
  };

  const assigneeOptions = useMemo<ModalSelectOption[]>(
    () => members.map((member) => ({ value: member.id, label: member.name, tone: 'muted' })),
    [members],
  );
  const statusOptions = useMemo<ModalSelectOption[]>(
    () => [
      { value: 'BACKLOG',     label: t('status_backlog'),     tone: 'muted' },
      { value: 'IN_PROGRESS', label: t('status_in_progress'), tone: 'accent' },
      { value: 'REVIEW',      label: t('status_review'),      tone: 'muted' },
      { value: 'DONE',        label: t('status_done'),        tone: 'positive' },
      { value: 'PAUSED',      label: t('status_paused'),     tone: 'muted' },
    ],
    [t],
  );
  const commenter = currentUser ?? members[0] ?? task.assignee;

  const assignee = members.find((member) => member.id === assigneeId) ?? task.assignee ?? null;

  const handleSave = () => {
    const safeStartDate = startDate || task.createdAt.slice(0, 10);
    const safeDeadline = deadline || (task.deadline ?? '').slice(0, 10);

    if (safeStartDate < todayValue) {
      setDateError('Ngày bắt đầu phải lớn hơn hoặc bằng ngày hiện tại.');
      return;
    }
    if (safeDeadline && safeDeadline < safeStartDate) {
      setDateError('Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.');
      return;
    }

    const updated: Task = {
      ...task,
      id: task.id,
      title,
      description,
      status,
      priority,
      assignee,
      startDate: safeStartDate ? new Date(safeStartDate).toISOString() : null,
      updatedAt: new Date().toISOString(),
      deadline: safeDeadline ? new Date(safeDeadline).toISOString() : null,
      requestType: requestType !== 'none' ? requestType : null,
      requestNote: requestNote.trim() || null,
      comments,
      hashtags: hashtags
        .split(/[,\s#]+/)
        .map((h) => h.trim().toLowerCase())
        .filter(Boolean),
    };

    setDateError(null);
    onSave?.(updated);
    onClose();
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      const savedComment = await addTaskComment(projectId, task.id, { content: newComment.trim() });
      setComments((prev) => [...prev, savedComment]);
      setNewComment('');
      onSave?.({ ...task, comments: [...comments, savedComment] });
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  const handleQuickUpdate = (text: string) => {
    setNewComment(text);
  };

  const inputClass =
    'w-full rounded-lg border border-border bg-white/84 px-3 py-2 text-[14px] text-[#1F1F1F] placeholder:text-ink-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-all duration-150 hover:border-border-strong focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/18';
  const labelClass = 'mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-secondary';

  const selectedAssignee = members.find(m => m.id === assigneeId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Chi tiết công việc" size="xl" panelClassName="!max-h-[88vh]">
      <div className="flex w-full flex-col text-[#1F1F1F]">
        <div className="mb-4 flex items-center justify-between shrink-0">
          <div className="inline-flex rounded-lg border border-border bg-surface-muted p-0.5">
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
                activeTab === 'details'
                  ? 'bg-primary-50 text-primary-dark shadow-sm'
                  : 'text-[#77695F] hover:text-[#3A332D]'
              }`}
            >
              Chi tiết
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('focus')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
                activeTab === 'focus'
                  ? 'bg-primary-50 text-primary-dark shadow-sm'
                  : 'text-[#77695F] hover:text-[#3A332D]'
              }`}
            >
              <Timer className="h-3.5 w-3.5" />
              Focus
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto pb-4 pr-1">
          {activeTab === 'details' && (
            <div className="space-y-4">
              {/* Title */}
              <div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={!canEditTask}
                  className="w-full text-xl font-bold text-ink bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none py-1 transition-all disabled:cursor-default disabled:hover:border-transparent"
                  placeholder="Tiêu đề công việc"
                />
              </div>

              {/* Badges Grid */}
              <div className="grid grid-cols-2 gap-4">
                <PolishedSelect
                  label="Trạng thái"
                  value={status}
                  onChange={(nextStatus) => setStatus(nextStatus as TaskStatus)}
                  options={statusOptions}
                  size="compact"
                  disabled={!canEditTask}
                />
                <PolishedSelect
                  label="Độ ưu tiên"
                  value={priority}
                  onChange={(nextPriority) => setPriority(nextPriority as TaskPriority)}
                  options={PRIORITY_OPTIONS}
                  size="compact"
                  disabled={!canEditTask}
                />
              </div>

              {/* Assignee & Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Người phụ trách</label>
                  <div className="flex items-center gap-2.5">
                    {selectedAssignee || task.assignee ? (
                      <ProjectMemberAvatar member={(selectedAssignee || task.assignee)!} projectMembers={projectMembers} size="sm" />
                    ) : (
                      <div className="h-8 w-8 shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-400 border border-dashed border-slate-300">
                        ?
                      </div>
                    )}
                    <div className="flex-1">
                      <PolishedSelect
                        label=""
                        value={assigneeId}
                        onChange={setAssigneeId}
                        options={assigneeOptions}
                        placeholder="Chọn thành viên"
                        size="compact"
                        disabled={!canEditTask}
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <DatePickerField
                    label="Bắt đầu"
                    value={startDate}
                    onChange={handleStartDateChange}
                    min={todayValue}
                    size="compact"
                    disabled={!canEditTask}
                  />
                  <DatePickerField
                    label="Hạn chót"
                    value={deadline}
                    onChange={handleDeadlineChange}
                    min={startDate || todayValue}
                    size="compact"
                    disabled={!canEditTask}
                  />
                </div>
                {dateError && (
                  <p className="text-xs font-bold text-rose-500">{dateError}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className={labelClass}>Mô tả</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!canEditTask}
                  rows={2}
                  placeholder="Mô tả công việc..."
                  className={`${inputClass} min-h-[62px] resize-none disabled:cursor-default disabled:bg-surface-muted/50`}
                />
              </div>

              {/* Hashtags */}
              <div>
                <label className={labelClass}>Hashtags</label>
                <input
                  type="text"
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  disabled={!canEditTask}
                  placeholder="ví dụ: backend, api, urgent (phân cách bằng dấu phẩy)"
                  className={`${inputClass} h-9 disabled:cursor-default disabled:bg-surface-muted/50`}
                />
                {hashtags.split(/[,\s#]+/).filter(Boolean).length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {hashtags.split(/[,\s#]+/).map((h) => h.trim()).filter(Boolean).map((tag) => (
                      <span key={tag} className="inline-flex items-center rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Requests Section */}
              <div className="grid gap-3 sm:grid-cols-[1.2fr_1.8fr]">
                <div>
                  <label className={labelClass}>Loại yêu cầu</label>
                  <div className="grid gap-1.5 rounded-xl border border-border bg-surface p-2">
                    {[
                      { value: 'none', label: 'Không có yêu cầu' },
                      { value: 'review', label: 'Yêu cầu kiểm duyệt' },
                      { value: 'pause', label: 'Yêu cầu tạm dừng' },
                    ].map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        disabled={!canEditTask}
                        onClick={() => setRequestType(item.value)}
                        className={`rounded-lg px-2.5 py-1.5 text-left text-xs transition font-semibold disabled:cursor-default ${
                          requestType === item.value
                            ? 'bg-primary-50 text-primary-dark'
                            : 'bg-white text-slate-600 hover:bg-primary-50'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Ghi chú yêu cầu</label>
                  <textarea
                    value={requestNote}
                    onChange={(e) => setRequestNote(e.target.value)}
                    disabled={!canEditTask}
                    placeholder="Ghi chú yêu cầu..."
                    rows={3}
                    className={`${inputClass} min-h-[86px] resize-none disabled:cursor-default disabled:bg-surface-muted/50`}
                  />
                </div>
              </div>

              {/* Divider & Comments section */}
              <hr className="my-6 border-border" />

              <div className="space-y-4">
                <p className="text-sm font-bold text-ink-secondary uppercase tracking-wider">Cập nhật & hoạt động</p>

                <div>
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.07em] text-ink-secondary">Cập nhật nhanh</p>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_UPDATES.map((text) => (
                      <button
                        key={text}
                        type="button"
                        onClick={() => handleQuickUpdate(text)}
                        className="rounded-full border border-border bg-white px-3 py-1 text-xs text-ink-secondary transition-colors hover:border-primary/30 hover:bg-primary-50 hover:text-primary-dark"
                      >
                        {text}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-2">
                  <div className="shrink-0">
                    <ProjectMemberAvatar member={commenter} projectMembers={projectMembers} size="sm" />
                  </div>
                  <div className="flex-1">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Để lại cập nhật tiến độ, vấn đề gặp phải..."
                      rows={2}
                      className={`${inputClass} min-h-[64px] resize-none`}
                    />
                    <div className="mt-2 flex justify-end">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleAddComment}
                        disabled={!newComment.trim()}
                        className="!rounded-xl !bg-primary hover:!bg-primary-dark"
                      >
                        <Send className="mr-1.5 h-3.5 w-3.5" />
                        Gửi
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-surface-muted/75 p-3">
                  <p className="mb-2 text-sm font-semibold text-[#4A4039]">
                    {comments.length} cập nhật
                  </p>

                  <div className={`ez-task-scrollbar space-y-2 ${comments.length > 3 ? 'max-h-56 overflow-y-auto pr-1' : ''}`}>
                    {comments.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border bg-surface py-5 text-center text-sm text-ink-muted">
                        <MessageSquare className="mx-auto mb-1.5 h-7 w-7 text-[#CDB9AA]" />
                        Chưa có cập nhật. Chia sẻ tiến độ của bạn!
                      </div>
                    ) : (
                      [...comments].reverse().map((commentItem) => (
                        <div key={commentItem.id} className="flex gap-2.5 rounded-lg border border-border bg-surface p-2.5">
                          <div className="shrink-0">
                            <ProjectMemberAvatar member={commentItem.author} projectMembers={projectMembers} size="sm" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-ink text-sm">{commentItem.author.name}</span>
                              <span className="text-xs text-ink-muted">
                                {new Date(commentItem.createdAt).toLocaleString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <p className="mt-0.5 text-sm text-ink-secondary">{commentItem.content}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'focus' && (
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-6">
              <Timer className="h-12 w-12 text-primary animate-pulse" />
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-ink">Pomodoro Focus Timer</h3>
                <p className="text-sm text-ink-muted max-w-[280px]">Tập trung cao độ giải quyết công việc này trong 25 phút.</p>
              </div>
              <FocusTimer />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5 shrink-0">
          {canDeleteTask ? (
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                onDelete?.(task);
                onClose();
              }}
              className="!rounded-lg !border !border-border !bg-transparent !px-3.5 !text-danger hover:!bg-red-50"
            >
              Xóa
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowShareDialog(true)}
              className="!rounded-lg !border !border-border !bg-transparent !px-3.5 !text-primary hover:!bg-primary/10"
            >
              <Share2 className="mr-1.5 h-3.5 w-3.5" />
              Share
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="!rounded-lg !border !border-border !bg-transparent !px-3.5 !text-ink-secondary hover:!bg-surface-muted"
            >
              Hủy
            </Button>
            {canEditTask && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                className="!rounded-lg !bg-primary !px-4 !text-white hover:!bg-primary-dark"
              >
                Lưu thay đổi
              </Button>
            )}
          </div>
        </div>
        {showShareDialog && (
          <ShareDialog
            title="Share Task"
            sharePayload={`[${task.title}](task://${task.id})`}
            onClose={() => setShowShareDialog(false)}
          />
        )}
      </div>
    </Modal>
  );
}

function FocusTimer() {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isActive) {
      interval = setInterval(() => {
        if (seconds > 0) {
          setSeconds(seconds - 1);
        } else if (minutes > 0) {
          setMinutes(minutes - 1);
          setSeconds(59);
        } else {
          setIsActive(false);
          clearInterval(interval);
        }
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, minutes, seconds]);

  const toggle = () => setIsActive(!isActive);
  const reset = () => {
    setMinutes(25);
    setSeconds(0);
    setIsActive(false);
  };

  return (
    <div className="flex flex-col items-center space-y-4 bg-surface-muted p-5 rounded-2xl border border-border w-full max-w-[280px]">
      <div className="text-4xl font-extrabold text-ink tracking-tight tabular-nums">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </div>
      <div className="flex gap-2.5 w-full">
        <Button
          variant={isActive ? 'danger' : 'primary'}
          size="sm"
          className="flex-1"
          onClick={toggle}
        >
          {isActive ? 'Tạm dừng' : 'Bắt đầu'}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="flex-1"
          onClick={reset}
        >
          Đặt lại
        </Button>
      </div>
    </div>
  );
}
