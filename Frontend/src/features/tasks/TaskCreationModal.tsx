import { useEffect, useState } from 'react';
import { Sparkles, Trash2 } from 'lucide-react';
import { Button, Modal } from '@/components/ui';
import { bulkCreateTasks, generateAiTaskDrafts } from '@/api/task.api';
import type { Member, Task, TaskPriority } from '@/types';

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

const priorities: TaskPriority[] = ['HIGH', 'MEDIUM', 'LOW'];

function toDateInput(value: string | null | undefined) {
  return value ? new Date(value).toISOString().slice(0, 10) : '';
}

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
    <Modal isOpen={isOpen} onClose={onClose} title="Thêm công việc" size="xl" panelClassName="max-w-4xl">
      <div className="space-y-4">
        <div className="flex gap-2 border-b border-border">
          <button type="button" onClick={() => setTab('ai')} className={`border-b-2 px-3 py-2 text-sm font-semibold ${tab === 'ai' ? 'border-primary text-primary' : 'border-transparent text-ink-secondary'}`}>
            <Sparkles className="mr-1 inline h-4 w-4" />Tạo bằng AI
          </button>
          <button type="button" onClick={() => setTab('manual')} className={`border-b-2 px-3 py-2 text-sm font-semibold ${tab === 'manual' ? 'border-primary text-primary' : 'border-transparent text-ink-secondary'}`}>
            Tạo thủ công
          </button>
        </div>

        {tab === 'ai' ? (
          <div className="space-y-4">
            {!canGenerateAi && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Chỉ Leader hoặc Supervisor mới có thể tạo danh sách công việc bằng AI. Bạn vẫn có thể tạo một công việc thủ công.</p>}
            {!deadline && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Dự án cần có deadline trước khi AI có thể tạo công việc.</p>}
            <div className="grid gap-4 md:grid-cols-[1fr_150px]">
              <label className="block text-sm font-semibold text-ink">Yêu cầu cho AI
                <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} disabled={!canGenerateAi || !deadline || generating} rows={4} placeholder="Ví dụ: Chia nhỏ công việc để hoàn thành đồ án nghiên cứu người dùng..." className="mt-1 w-full rounded-lg border border-border p-3 font-normal disabled:bg-surface-muted" />
              </label>
              <label className="block text-sm font-semibold text-ink">Số lượng
                <input type="number" min={1} max={20} value={count} onChange={(event) => setCount(Math.max(1, Math.min(20, Number(event.target.value) || 1)))} disabled={!canGenerateAi || !deadline || generating} className="mt-1 w-full rounded-lg border border-border p-3 font-normal disabled:bg-surface-muted" />
              </label>
            </div>
            <p className="text-xs text-ink-secondary">AI sử dụng tên, mô tả/chủ đề và deadline dự án. Task mới sẽ vào cột Chưa bắt đầu, chưa gán người phụ trách.</p>
            <Button variant="primary" onClick={generate} disabled={!prompt.trim() || !deadline || !canGenerateAi || generating}>{generating ? 'Đang tạo...' : 'Generate task by AI'}</Button>

            {drafts.length > 0 && <div className="space-y-3 border-t border-border pt-4">
              <div className="flex items-center justify-between"><h3 className="font-semibold text-ink">Xem trước ({selected.length}/{drafts.length} task đã chọn)</h3><button type="button" className="text-sm text-primary" onClick={() => setDrafts((items) => items.map((item) => ({ ...item, selected: !items.every((draft) => draft.selected) })))}>{drafts.every((task) => task.selected) ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}</button></div>
              {drafts.map((task) => <div key={task.id} className="rounded-xl border border-border p-3">
                <div className="mb-2 flex items-center gap-2"><input aria-label={`Chọn ${task.title}`} type="checkbox" checked={task.selected} onChange={(event) => updateDraft(task.id, { selected: event.target.checked })} /><input value={task.title} onChange={(event) => updateDraft(task.id, { title: event.target.value })} className="min-w-0 flex-1 rounded border border-border px-2 py-1 font-semibold" /><button type="button" aria-label="Xóa task" onClick={() => setDrafts((items) => items.filter((item) => item.id !== task.id))} className="text-danger"><Trash2 className="h-4 w-4" /></button></div>
                <textarea value={task.description} onChange={(event) => updateDraft(task.id, { description: event.target.value })} rows={2} className="mb-2 w-full rounded border border-border p-2 text-sm" />
                <div className="grid gap-2 sm:grid-cols-2"><input type="date" value={task.deadline} max={deadline} onChange={(event) => updateDraft(task.id, { deadline: event.target.value })} className="rounded border border-border p-2 text-sm" /><select value={task.priority} onChange={(event) => updateDraft(task.id, { priority: event.target.value as TaskPriority })} className="rounded border border-border p-2 text-sm">{priorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select></div>
              </div>)}
              <div className="flex justify-end"><Button variant="primary" onClick={createSelected} disabled={selected.length === 0 || creating}>{creating ? 'Đang tạo...' : `Tạo ${selected.length} công việc đã chọn`}</Button></div>
            </div>}
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-ink">Tiêu đề *<input value={manual.title} onChange={(event) => setManual((value) => ({ ...value, title: event.target.value }))} className="mt-1 w-full rounded-lg border border-border p-3 font-normal" placeholder="Tên công việc" /></label>
            <label className="block text-sm font-semibold text-ink">Mô tả<textarea value={manual.description} onChange={(event) => setManual((value) => ({ ...value, description: event.target.value }))} rows={3} className="mt-1 w-full rounded-lg border border-border p-3 font-normal" placeholder="Mô tả ngắn gọn" /></label>
            <div className="grid gap-3 sm:grid-cols-3"><label className="text-sm font-semibold text-ink">Hạn chót *<input type="date" value={manual.deadline} onChange={(event) => setManual((value) => ({ ...value, deadline: event.target.value }))} max={deadline || undefined} className="mt-1 w-full rounded-lg border border-border p-3 font-normal" /></label><label className="text-sm font-semibold text-ink">Ưu tiên<select value={manual.priority} onChange={(event) => setManual((value) => ({ ...value, priority: event.target.value as TaskPriority }))} className="mt-1 w-full rounded-lg border border-border p-3 font-normal">{priorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select></label><label className="text-sm font-semibold text-ink">Người phụ trách<select value={manual.assigneeId} onChange={(event) => setManual((value) => ({ ...value, assigneeId: event.target.value }))} className="mt-1 w-full rounded-lg border border-border p-3 font-normal"><option value="">Chưa giao</option>{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label></div>
            <div className="flex justify-end"><Button variant="primary" onClick={createManual} disabled={!manual.title.trim() || !manual.deadline}>Tạo công việc</Button></div>
          </div>
        )}
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </div>
    </Modal>
  );
}
