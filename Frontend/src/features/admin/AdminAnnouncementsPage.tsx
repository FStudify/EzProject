import { useCallback, useEffect, useState } from 'react';
import {
  Plus,
  RefreshCw,
  Loader2,
  Pencil,
  Trash2,
  Info,
  AlertTriangle,
  Wrench,
  Eye,
  EyeOff,
  CalendarDays,
} from 'lucide-react';
import {
  getAdminAnnouncements,
  createAdminAnnouncement,
  updateAdminAnnouncement,
  deleteAdminAnnouncement,
  type AdminAnnouncement,
  type AnnouncementType,
} from '@/api/admin.api';
import { useToast, Modal, Button } from '@/components/ui';
import AdminPageHeader from './components/AdminPageHeader';

const TYPE_STYLE: Record<AnnouncementType, { bg: string; text: string; icon: React.ComponentType<{ className?: string }>; label: string }> = {
  INFO: { bg: '#dbeafe', text: '#1d4ed8', icon: Info, label: 'Thông tin' },
  WARNING: { bg: '#fef3c7', text: '#a16207', icon: AlertTriangle, label: 'Cảnh báo' },
  MAINTENANCE: { bg: '#fee2e2', text: '#b91c1c', icon: Wrench, label: 'Bảo trì' },
};

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(v: string): string | undefined {
  if (!v) return undefined;
  return new Date(v).toISOString();
}

interface FormState {
  id: string | null;
  title: string;
  content: string;
  type: AnnouncementType;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
}

const emptyForm: FormState = {
  id: null,
  title: '',
  content: '',
  type: 'INFO',
  startsAt: '',
  endsAt: '',
  isActive: true,
};

export default function AdminAnnouncementsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<AdminAnnouncement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminAnnouncement | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getAdminAnnouncements({ page: 1, limit: 50 });
      setItems(res.data);
    } catch {
      setError('Không thể tải danh sách thông báo');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  const openCreate = () => {
    setForm(emptyForm);
    setIsFormOpen(true);
  };

  const openEdit = (a: AdminAnnouncement) => {
    setForm({
      id: a.id,
      title: a.title,
      content: a.content,
      type: a.type,
      startsAt: toLocalInput(a.startsAt),
      endsAt: toLocalInput(a.endsAt),
      isActive: a.isActive,
    });
    setIsFormOpen(true);
  };

  const submitForm = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast('Vui lòng nhập tiêu đề và nội dung', 'error');
      return;
    }
    if (form.startsAt && form.endsAt && new Date(form.startsAt) >= new Date(form.endsAt)) {
      toast('Thời gian kết thúc phải sau thời gian bắt đầu', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        type: form.type,
        startsAt: fromLocalInput(form.startsAt),
        endsAt: fromLocalInput(form.endsAt),
        isActive: form.isActive,
      };
      if (form.id) {
        await updateAdminAnnouncement(form.id, payload);
        toast('Đã cập nhật thông báo', 'success');
      } else {
        await createAdminAnnouncement(payload);
        toast('Đã tạo thông báo mới', 'success');
      }
      setIsFormOpen(false);
      void fetch();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Không thể lưu thông báo';
      toast(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActive = async (a: AdminAnnouncement) => {
    try {
      await updateAdminAnnouncement(a.id, { isActive: !a.isActive });
      void fetch();
    } catch {
      toast('Không thể cập nhật', 'error');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteAdminAnnouncement(deleteTarget.id);
      toast('Đã xóa thông báo', 'success');
      setDeleteTarget(null);
      void fetch();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Không thể xóa';
      toast(msg, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <AdminPageHeader
        title="Quản lý thông báo"
        description="Tạo và quản lý banner hiển thị cho tất cả người dùng."
        actions={
          <>
            <button
              type="button"
              onClick={() => void fetch()}
              className="inline-flex items-center gap-1.5 rounded-xl border bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              style={{ borderColor: '#E8D8CF' }}
            >
              <RefreshCw className="h-4 w-4" /> Làm mới
            </button>
            <Button variant="primary" size="sm" onClick={openCreate}>
              <Plus className="mr-1.5 h-4 w-4" /> Tạo thông báo
            </Button>
          </>
        }
      />

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border bg-white p-12 text-center" style={{ borderColor: '#E8D8CF' }}>
          <p className="text-slate-500">{error}</p>
          <button
            type="button"
            onClick={() => void fetch()}
            className="mt-3 inline-flex items-center rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
          >
            Thử lại
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed bg-white p-12 text-center" style={{ borderColor: '#E8D8CF' }}>
          <Info className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-700">Chưa có thông báo nào.</p>
          <p className="mt-1 text-xs text-slate-500">Bấm "Tạo thông báo" để bắt đầu.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((a) => {
            const t = TYPE_STYLE[a.type];
            const Icon = t.icon;
            return (
              <li
                key={a.id}
                className="rounded-2xl border bg-white p-4"
                style={{ borderColor: '#E8D8CF' }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: t.bg, color: t.text }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-800">{a.title}</h3>
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                        style={{ backgroundColor: t.bg, color: t.text }}
                      >
                        {t.label}
                      </span>
                      {a.visibleNow ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          Đang hiển thị
                        </span>
                      ) : a.isActive ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                          Đang chờ / hết hạn
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                          Đã tắt
                        </span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">{a.content}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      {a.startsAt && (
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          Từ: {new Date(a.startsAt).toLocaleString('vi-VN')}
                        </span>
                      )}
                      {a.endsAt && (
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          Đến: {new Date(a.endsAt).toLocaleString('vi-VN')}
                        </span>
                      )}
                      <span>
                        Bởi {a.createdBy?.fullName ?? 'N/A'} · {new Date(a.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => void toggleActive(a)}
                      className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                      title={a.isActive ? 'Tắt thông báo' : 'Bật thông báo'}
                    >
                      {a.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(a)}
                      className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                      title="Chỉnh sửa"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(a)}
                      className="rounded-lg p-2 text-rose-500 hover:bg-rose-50"
                      title="Xóa"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Form modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={form.id ? 'Chỉnh sửa thông báo' : 'Tạo thông báo mới'}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700">Tiêu đề</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              maxLength={200}
              className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none"
              style={{ borderColor: '#E8D8CF' }}
              placeholder="VD: Bảo trì hệ thống"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700">Nội dung</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={4}
              maxLength={5000}
              className="mt-1 w-full rounded-lg border bg-white p-2.5 text-sm focus:outline-none"
              style={{ borderColor: '#E8D8CF' }}
              placeholder="Mô tả chi tiết thông báo..."
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700">Loại</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {(Object.keys(TYPE_STYLE) as AnnouncementType[]).map((tp) => {
                const s = TYPE_STYLE[tp];
                const active = form.type === tp;
                return (
                  <button
                    key={tp}
                    type="button"
                    onClick={() => setForm({ ...form, type: tp })}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all"
                    style={
                      active
                        ? { backgroundColor: s.bg, color: s.text, outline: `2px solid ${s.text}` }
                        : { backgroundColor: '#f1f5f9', color: '#475569' }
                    }
                  >
                    <s.icon className="h-3.5 w-3.5" /> {s.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-700">Hiển thị từ</label>
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none"
                style={{ borderColor: '#E8D8CF' }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Đến</label>
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none"
                style={{ borderColor: '#E8D8CF' }}
              />
            </div>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="h-4 w-4 rounded"
            />
            <span>Kích hoạt ngay</span>
          </label>
          <div className="flex justify-end gap-2 border-t pt-4" style={{ borderColor: '#E8D8CF' }}>
            <Button variant="ghost" onClick={() => setIsFormOpen(false)}>
              Huỷ
            </Button>
            <Button variant="primary" onClick={submitForm} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : form.id ? 'Cập nhật' : 'Tạo'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Xóa thông báo" size="md">
        <p className="text-sm text-slate-600">
          Bạn có chắc muốn xóa thông báo <strong>"{deleteTarget?.title}"</strong>? Hành động này không thể hoàn tác.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
            Huỷ
          </Button>
          <Button variant="danger" onClick={confirmDelete} disabled={isDeleting}>
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Xóa'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}