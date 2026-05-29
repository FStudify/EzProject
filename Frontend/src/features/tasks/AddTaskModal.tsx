import { useMemo, useState } from 'react';
import { Modal, Button } from '@/components/ui';
import type { Task, TaskStatus, TaskPriority, Member } from '@/types';
import { DatePickerField, PolishedSelect } from './TaskFormControls';

type ModalSelectOption = {
  value: string;
  label: string;
  tone?: 'accent' | 'positive' | 'muted';
};

function getTodayDateInput() {
  const date = new Date();
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (task: Task) => void;
  projectId: string;
  members: Member[];
}

const STATUS_OPTIONS: ModalSelectOption[] = [
  { value: 'BACKLOG', label: 'Backlog', tone: 'muted' },
  { value: 'IN_PROGRESS', label: 'Đang làm', tone: 'accent' },
  { value: 'REVIEW', label: 'Chờ review', tone: 'muted' },
  { value: 'DONE', label: 'Hoàn thành', tone: 'positive' },
  { value: 'ON_HOLD', label: 'Tạm dừng', tone: 'muted' },
  { value: 'CANCELLED', label: 'Đã hủy', tone: 'muted' },
];

const PRIORITY_OPTIONS: ModalSelectOption[] = [
  { value: 'HIGH', label: 'Cao', tone: 'accent' },
  { value: 'MEDIUM', label: 'Trung bình', tone: 'muted' },
  { value: 'LOW', label: 'Thấp', tone: 'positive' },
];

export default function AddTaskModal({ isOpen, onClose, onAdd, projectId, members }: AddTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('BACKLOG');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [assigneeId, setAssigneeId] = useState(members[0]?.id ?? '');
  const [startDate, setStartDate] = useState(() => getTodayDateInput());
  const [deadline, setDeadline] = useState('');
  const [requestType, setRequestType] = useState<'none' | 'review' | 'pause'>('none');
  const [requestNote, setRequestNote] = useState('');

  const assigneeOptions = useMemo<ModalSelectOption[]>(
    () => members.map((member) => ({ value: member.id, label: member.name, tone: 'muted' })),
    [members],
  );

  const handleSubmit = () => {
    if (!title.trim() || !startDate || !deadline || !assigneeId) return;
    const assignee = members.find((m) => m.id === assigneeId) ?? members[0];
    const newTask: Task = {
      id: `task-new-${Date.now()}`,
      projectId,
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      assignee,
      deadline: new Date(deadline).toISOString(),
      createdAt: new Date(startDate).toISOString(),
      requestType: requestType !== 'none' ? requestType : undefined,
      requestNote: requestNote.trim() || undefined,
    };
    onAdd(newTask);
    setTitle('');
    setDescription('');
    setStatus('BACKLOG');
    setPriority('MEDIUM');
    setAssigneeId(members[0]?.id ?? '');
    setStartDate(getTodayDateInput());
    setDeadline('');
    setRequestType('none');
    setRequestNote('');
    onClose();
  };

  const inputClass =
    'w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-[#1F1F1F] placeholder:text-ink-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition-all duration-150 hover:border-border-strong focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/14';
  const labelClass = 'mb-1 block text-[12px] font-semibold uppercase tracking-[0.07em] text-ink-secondary';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Thêm công việc mới"
      size="xl"
      bodyScrollable={false}
      panelOverflow="visible"
      panelClassName="max-w-[820px] rounded-[22px] border border-border bg-surface shadow-[0_28px_58px_-34px_rgba(53,31,20,0.54)]"
      headerClassName="border-b border-border bg-surface-muted px-4.5 py-3"
      titleClassName="text-[21px] font-bold tracking-[-0.01em] text-[#1F1F1F]"
      closeButtonClassName="text-ink-secondary hover:bg-surface-muted hover:text-[#1F1F1F] focus:ring-primary/35"
      bodyClassName="bg-surface px-4.5 py-3.5 text-[#6B7280]"
      backdropClassName="bg-ink/40"
    >
      <div className="mx-auto flex h-full w-full max-w-[760px] flex-col text-[#1F1F1F]">
        <div className="space-y-2.5">
          <div>
            <label className={labelClass}>Tiêu đề *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tên công việc..."
              className={`${inputClass} h-10`}
            />
          </div>

          <div>
            <label className={labelClass}>Mô tả</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả ngắn gọn..."
              rows={2}
              className={`${inputClass} min-h-[68px] resize-none`}
            />
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            <PolishedSelect
              label="Trạng thái"
              value={status}
              onChange={(nextStatus) => setStatus(nextStatus as TaskStatus)}
              options={STATUS_OPTIONS}
            />
            <PolishedSelect
              label="Ưu tiên"
              value={priority}
              onChange={(nextPriority) => setPriority(nextPriority as TaskPriority)}
              options={PRIORITY_OPTIONS}
            />
          </div>

          <div className="grid gap-2.5 sm:grid-cols-3">
            <PolishedSelect
              label="Người phụ trách"
              required
              value={assigneeId}
              onChange={setAssigneeId}
              options={assigneeOptions}
              placeholder="Chọn thành viên"
            />
            <DatePickerField
              label="Ngày bắt đầu"
              required
              value={startDate}
              onChange={setStartDate}
            />
            <DatePickerField
              label="Hạn chót"
              required
              value={deadline}
              onChange={setDeadline}
              min={startDate || undefined}
            />
          </div>

          <div className="grid gap-2.5 sm:grid-cols-[1fr_1fr]">
            <div>
              <label className={labelClass}>Loại yêu cầu</label>
              <div className="grid gap-2 rounded-xl border border-border bg-surface p-3">
                {[
                  { value: 'none', label: 'Không có yêu cầu' },
                  { value: 'review', label: 'Yêu cầu kiểm duyệt' },
                  { value: 'pause', label: 'Yêu cầu tạm dừng' },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setRequestType(item.value as 'none' | 'review' | 'pause')}
                    className={`rounded-lg px-3 py-2 text-left text-sm transition ${
                      requestType === item.value
                        ? 'bg-primary-50 text-primary-dark'
                        : 'bg-white text-slate-700 hover:bg-primary-50'
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
                placeholder="Ghi chú cho yêu cầu kiểm duyệt hoặc tạm dừng..."
                rows={3}
                className={`${inputClass} min-h-[90px] resize-none`}
              />
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-end border-t border-border pt-2.5">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="md"
              onClick={onClose}
              className="!rounded-xl !border !border-border !bg-transparent !px-4 !text-ink-secondary hover:!bg-surface-muted"
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleSubmit}
              disabled={!title.trim() || !startDate || !deadline || !assigneeId}
              className="!rounded-xl !bg-primary !px-5 !text-white hover:!bg-primary-dark"
            >
              Tạo công việc
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
