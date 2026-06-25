import { useEffect, useState } from 'react';
import { CheckCircle2, ListChecks, Sparkles, Trash2, Wand2 } from 'lucide-react';
import { Button, Modal } from '@/components/ui';
import { bulkCreateTasks, generateAiTaskDrafts } from '@/api/task.api';
import type { Member, Task, TaskPriority } from '@/types';
import { DatePickerField, PolishedSelect } from './TaskFormControls';

type Draft = {
  id: string;
  selected: boolean;
  title: string;
  description: string;
  deadline: string;
  priority: TaskPriority;
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectDeadline: string | null | undefined;
  members: Member[];
  canGenerateAi: boolean;
  onManualAdd: (task: Omit<Task, 'id' | 'comments' | 'commentsCount' | 'createdAt' | 'updatedAt'>) => void;
  onAiCreated: (tasks: Task[]) => void;
}

const priorityOptions = [
  { value: 'HIGH', label: 'Cao', tone: 'accent' as const },
  { value: 'MEDIUM', label: 'Trung bình', tone: 'muted' as const },
  { value: 'LOW', label: 'Thấp', tone: 'positive' as const },
];

function toDateInput(value: string | null | undefined) {
  return value ? new Date(value).toISOString().slice(0, 10) : '';
}

const inputClass =
  'w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-[#1F1F1F] placeholder:text-ink-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition-all duration-150 hover:border-border-strong focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/14 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-muted';
const labelClass = 'mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.07em] text-ink-secondary';

export default function TaskCreationModal({
  isOpen, onClose, projectId, projectDeadline, members, canGenerateAi, onManualAdd, onAiCreated,
}: Props) {
  const [tab, setTab] = useState<'ai' | 'manual'>('ai');
  const [prompt, setPrompt] = useState('');
  const [count, setCount] = useState(10);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [generating, setGenerating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [manual, setManual] = useState({ title: '', description: '', deadline: '', priority: 'MEDIUM' as TaskPriority, assigneeId: '' });

  useEffect(() => {
    if (!isOpen) return;
    setTab(canGenerateAi ? 'ai' : 'manual');
    setError('');
    setDrafts([]);
  }, [isOpen, canGenerateAi]);

  const selected = drafts.filter((task) => task.selected);
  const deadline = toDateInput(projectDeadline);
  const allSelected = drafts.length > 0 && drafts.every((task) => task.selected);
  const updateDraft = (id: string, patch: Partial<Draft>) => setDrafts((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));

  const generate = async () => {
    if (!prompt.trim() || !deadline || !canGenerateAi) return;
    setGenerating(true);
    setError('');
    try {
      const generated = await generateAiTaskDrafts(projectId, { prompt: prompt.trim(), count });
      setDrafts(generated.map((task, index) => ({
        id: `${Date.now()}-${index}`,
        selected: true,
        title: task.title,
        description: task.description,
        deadline: toDateInput(task.deadline),
        priority: task.priority,
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tạo danh sách công việc bằng AI.');
    } finally {
      setGenerating(false);
    }
  };

  const createSelected = async () => {
    if (selected.length === 0) return;
    setCreating(true);
    setError('');
    try {
      const created = await bulkCreateTasks(projectId, selected.map(({ title, description, deadline: taskDeadline, priority }) => ({ title, description, deadline: taskDeadline, priority })));
      onAiCreated(created);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tạo các công việc đã chọn.');
    } finally {
      setCreating(false);
    }
  };

  const createManual = () => {
    if (!manual.title.trim() || !manual.deadline) return;
    const assignee = members.find((member) => member.id === manual.assigneeId) ?? null;
    onManualAdd({
      projectId,
      title: manual.title.trim(),
      description: manual.description.trim() || null,
      status: 'BACKLOG',
      priority: manual.priority,
      assignee,
      deadline: new Date(manual.deadline).toISOString(),
      requestType: null,
      requestNote: null,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Thêm công việc"
      size="xl"
      panelClassName="max-w-[980px] rounded-[22px] border border-border bg-surface shadow-[0_28px_58px_-34px_rgba(53,31,20,0.54)]"
      headerClassName="border-b border-border bg-surface-muted px-4.5 py-3"
      titleClassName="text-[21px] font-bold tracking-[-0.01em] text-[#1F1F1F]"
      closeButtonClassName="text-ink-secondary hover:bg-surface-muted hover:text-[#1F1F1F] focus:ring-primary/35"
      bodyClassName="bg-surface px-4.5 py-4 text-[#6B7280]"
      backdropClassName="bg-ink/40"
    >
      <div className="mx-auto flex w-full max-w-[900px] flex-col gap-4 text-[#1F1F1F]">
        <div className="flex rounded-xl border border-border bg-surface-muted p-1">
          <button
            type="button"
            onClick={() => setTab('ai')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              tab === 'ai' ? 'bg-white text-primary shadow-sm' : 'text-ink-secondary hover:bg-white/65 hover:text-ink'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            Tạo bằng AI
          </button>
          <button
            type="button"
            onClick={() => setTab('manual')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              tab === 'manual' ? 'bg-white text-primary shadow-sm' : 'text-ink-secondary hover:bg-white/65 hover:text-ink'
            }`}
          >
            <ListChecks className="h-4 w-4" />
            Tạo thủ công
          </button>
        </div>

        {tab === 'ai' ? (
          <div className="space-y-4">
            {!canGenerateAi && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Chỉ Leader hoặc Supervisor mới có thể tạo danh sách công việc bằng AI. Bạn vẫn có thể tạo một công việc thủ công.</p>}
            {!deadline && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Dự án cần có deadline trước khi AI có thể tạo công việc.</p>}

            <section className="rounded-2xl border border-border bg-white/80 p-4 shadow-[0_18px_36px_-32px_rgba(53,31,20,0.45)]">
              <div className="grid gap-3 md:grid-cols-[1fr_128px]">
                <div>
                  <label className={labelClass}>Yêu cầu cho AI</label>
                  <textarea
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    disabled={!canGenerateAi || !deadline || generating}
                    rows={4}
                    placeholder="Ví dụ: Chia nhỏ lộ trình học Flutter trong 2 tuần, có nghiên cứu, thực hành UI và mini project..."
                    className={`${inputClass} min-h-[116px] resize-none`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Số lượng</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={count}
                    onChange={(event) => setCount(Math.max(1, Math.min(20, Number(event.target.value) || 1)))}
                    disabled={!canGenerateAi || !deadline || generating}
                    className={`${inputClass} h-10`}
                  />
                  <div className="mt-2 rounded-xl bg-primary-50 px-3 py-2 text-xs font-medium leading-5 text-primary-dark">
                    Task mới vào Backlog và chưa gán người phụ trách.
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-ink-secondary">AI dùng tên, mô tả/chủ đề và deadline dự án để đề xuất task.</p>
                <Button
                  variant="primary"
                  onClick={generate}
                  disabled={!prompt.trim() || !deadline || !canGenerateAi || generating}
                  className="!rounded-xl !px-4"
                >
                  <Wand2 className="mr-2 h-4 w-4" />
                  {generating ? 'Đang tạo...' : 'Generate task by AI'}
                </Button>
              </div>
            </section>

            {drafts.length > 0 && (
              <section className="space-y-3 rounded-2xl border border-border bg-surface-muted/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="flex items-center gap-2 text-base font-bold text-ink">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Xem trước
                    </h3>
                    <p className="mt-0.5 text-xs text-ink-secondary">{selected.length}/{drafts.length} task đã chọn để tạo.</p>
                  </div>
                  <button
                    type="button"
                    className="rounded-lg px-3 py-1.5 text-sm font-semibold text-primary transition hover:bg-primary-50"
                    onClick={() => setDrafts((items) => items.map((item) => ({ ...item, selected: !allSelected })))}
                  >
                    {allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  </button>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  {drafts.map((task, index) => (
                    <article
                      key={task.id}
                      className={`rounded-2xl border bg-white p-3 shadow-sm transition ${
                        task.selected ? 'border-primary/35 ring-1 ring-primary/10' : 'border-border opacity-75'
                      }`}
                    >
                      <div className="mb-3 flex items-start gap-2">
                        <input
                          aria-label={`Chọn ${task.title}`}
                          type="checkbox"
                          checked={task.selected}
                          onChange={(event) => updateDraft(task.id, { selected: event.target.checked })}
                          className="mt-2 h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-ink-muted">#{index + 1}</span>
                            <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-semibold text-primary">{task.priority}</span>
                          </div>
                          <input
                            value={task.title}
                            onChange={(event) => updateDraft(task.id, { title: event.target.value })}
                            className="w-full rounded-lg border border-transparent bg-transparent px-1 py-1 text-[15px] font-bold text-ink transition hover:border-border hover:bg-surface focus:border-primary focus:bg-surface focus:outline-none focus:ring-3 focus:ring-primary/12"
                          />
                        </div>
                        <button
                          type="button"
                          aria-label="Xóa task"
                          onClick={() => setDrafts((items) => items.filter((item) => item.id !== task.id))}
                          className="rounded-lg p-2 text-danger transition hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <textarea
                        value={task.description}
                        onChange={(event) => updateDraft(task.id, { description: event.target.value })}
                        rows={2}
                        className={`${inputClass} min-h-[74px] resize-none`}
                      />

                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <DatePickerField
                          label="Deadline"
                          value={task.deadline}
                          onChange={(value) => updateDraft(task.id, { deadline: value })}
                          max={deadline}
                          size="compact"
                        />
                        <PolishedSelect
                          label="Ưu tiên"
                          value={task.priority}
                          onChange={(value) => updateDraft(task.id, { priority: value as TaskPriority })}
                          options={priorityOptions}
                          size="compact"
                        />
                      </div>
                    </article>
                  ))}
                </div>

                <div className="sticky bottom-0 -mx-4 -mb-4 flex items-center justify-between border-t border-border bg-surface/95 px-4 py-3 backdrop-blur">
                  <p className="text-sm text-ink-secondary">{selected.length > 0 ? `Sẵn sàng tạo ${selected.length} công việc.` : 'Chọn ít nhất một task để tạo.'}</p>
                  <Button variant="primary" onClick={createSelected} disabled={selected.length === 0 || creating} className="!rounded-xl !px-5">
                    {creating ? 'Đang tạo...' : `Tạo ${selected.length} công việc`}
                  </Button>
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className="space-y-3 rounded-2xl border border-border bg-white/80 p-4">
            <div>
              <label className={labelClass}>Tiêu đề *</label>
              <input value={manual.title} onChange={(event) => setManual((value) => ({ ...value, title: event.target.value }))} className={inputClass} placeholder="Tên công việc" />
            </div>
            <div>
              <label className={labelClass}>Mô tả</label>
              <textarea value={manual.description} onChange={(event) => setManual((value) => ({ ...value, description: event.target.value }))} rows={3} className={`${inputClass} resize-none`} placeholder="Mô tả ngắn gọn" />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <DatePickerField label="Hạn chót" required value={manual.deadline} onChange={(value) => setManual((current) => ({ ...current, deadline: value }))} max={deadline || undefined} />
              <PolishedSelect label="Ưu tiên" value={manual.priority} onChange={(value) => setManual((current) => ({ ...current, priority: value as TaskPriority }))} options={priorityOptions} />
              <label className="text-sm font-semibold text-ink">
                <span className={labelClass}>Người phụ trách</span>
                <select value={manual.assigneeId} onChange={(event) => setManual((value) => ({ ...value, assigneeId: event.target.value }))} className={inputClass}>
                  <option value="">Chưa giao</option>
                  {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                </select>
              </label>
            </div>
            <div className="flex justify-end border-t border-border pt-3">
              <Button variant="primary" onClick={createManual} disabled={!manual.title.trim() || !manual.deadline} className="!rounded-xl !px-5">Tạo công việc</Button>
            </div>
          </div>
        )}

        {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </div>
    </Modal>
  );
}
