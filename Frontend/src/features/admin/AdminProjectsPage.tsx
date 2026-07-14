import { useCallback, useEffect, useState } from 'react';
import {
  Search,
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Users,
  ListTodo,
  CalendarDays,
} from 'lucide-react';
import {
  getAdminProjects,
  type AdminProject,
  type AdminProjectFilters,
} from '@/api/admin.api';
import AdminPageHeader from './components/AdminPageHeader';

function timeAgo(ts: string): string {
  const d = Math.floor((Date.now() - new Date(ts).getTime()) / 86_400_000);
  if (d < 1) return 'Hôm nay';
  if (d < 7) return `${d} ngày trước`;
  return new Date(ts).toLocaleDateString('vi-VN');
}

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  ACTIVE: { bg: '#dcfce7', text: '#15803d', label: 'Đang hoạt động' },
  COMPLETED: { bg: '#dbeafe', text: '#1d4ed8', label: 'Hoàn thành' },
  ARCHIVED: { bg: '#f1f5f9', text: '#475569', label: 'Đã lưu trữ' },
};

export default function AdminProjectsPage() {
  const [filters, setFilters] = useState<AdminProjectFilters>({ page: 1, limit: 15 });
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getAdminProjects(filters);
      setProjects(res.data);
      setPagination(res.pagination);
    } catch {
      setError('Không thể tải danh sách dự án');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  return (
    <div className="space-y-6 p-6">
      <AdminPageHeader
        title="Quản lý dự án"
        description="Theo dõi tất cả dự án trong hệ thống."
        actions={
          <button
            type="button"
            onClick={() => void fetchProjects()}
            className="inline-flex items-center gap-1.5 rounded-xl border bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
           
          >
            <RefreshCw className="h-4 w-4" /> Làm mới
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white shadow-sm p-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setFilters((p) => ({ ...p, search: searchInput || undefined, page: 1 }));
              }
            }}
            placeholder="Tìm theo tên dự án..."
            className="h-9 w-full rounded-lg border bg-white pl-9 pr-3 text-sm focus:outline-none"
           
          />
        </div>
        <div className="flex items-center rounded-lg border bg-white">
          {[
            { v: undefined, l: 'Tất cả' },
            { v: 'ACTIVE', l: STATUS_STYLE.ACTIVE.label },
            { v: 'COMPLETED', l: STATUS_STYLE.COMPLETED.label },
            { v: 'ARCHIVED', l: STATUS_STYLE.ARCHIVED.label },
          ].map((s) => {
            const active = filters.status === s.v;
            return (
              <button
                key={s.l}
                type="button"
                onClick={() =>
                  setFilters((p) => ({
                    ...p,
                    status: s.v as 'ACTIVE' | 'COMPLETED' | 'ARCHIVED' | undefined,
                    page: 1,
                  }))
                }
                className={`px-3 py-1.5 text-xs font-semibold transition-all rounded-md ${active ? "bg-slate-800 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100"}`}
              >
                {s.l}
              </button>
            );
          })}
        </div>
        <span className="ml-auto text-xs text-slate-500">{pagination.total} dự án</span>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Tên dự án</th>
              <th className="px-4 py-3">Chủ sở hữu</th>
              <th className="px-4 py-3 text-center">Thành viên</th>
              <th className="px-4 py-3 text-center">Công việc</th>
              <th className="px-4 py-3">Ngày tạo</th>
              <th className="px-4 py-3">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <p className="text-slate-500">{error}</p>
                  <button
                    type="button"
                    onClick={() => void fetchProjects()}
                    className="mt-3 inline-flex items-center rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    Thử lại
                  </button>
                </td>
              </tr>
            ) : projects.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                  Không có dự án nào.
                </td>
              </tr>
            ) : (
              projects.map((p) => {
                const st = STATUS_STYLE[p.status] ?? STATUS_STYLE.ACTIVE;
                return (
                  <tr key={p.id} className="border-t hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{p.name}</p>
                      {p.description && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{p.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>
                        <p className="text-sm font-medium">{p.ownerId.fullName}</p>
                        <p className="text-xs text-slate-400">{p.ownerId.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        {p.memberCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <ListTodo className="h-3.5 w-3.5 text-slate-400" />
                        {p.taskCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                        {timeAgo(p.createdAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold"
                        style={{ backgroundColor: st.bg, color: st.text }}
                      >
                        {st.label}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-slate-500">
            <span>Trang {pagination.page}/{pagination.totalPages}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => setFilters((p) => ({ ...p, page: (p.page ?? 1) - 1 }))}
                className="rounded-md p-1.5 hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setFilters((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}
                className="rounded-md p-1.5 hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}