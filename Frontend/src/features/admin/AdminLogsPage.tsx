import { useCallback, useEffect, useState } from 'react';
import {
  Search,
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
} from 'lucide-react';
import {
  getAdminLogs,
  type AdminActivityLog,
  type AdminLogFilters,
} from '@/api/admin.api';
import AdminPageHeader from './components/AdminPageHeader';

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (m < 1) return 'vừa xong';
  if (m < 60) return `${m} phút trước`;
  if (h < 24) return `${h} giờ trước`;
  if (d < 30) return `${d} ngày trước`;
  return new Date(ts).toLocaleString('vi-VN');
}

export default function AdminLogsPage() {
  const [filters, setFilters] = useState<AdminLogFilters>({ page: 1, limit: 30 });
  const [logs, setLogs] = useState<AdminActivityLog[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 30, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [actionInput, setActionInput] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getAdminLogs(filters);
      setLogs(res.data);
      setPagination(res.pagination);
    } catch {
      setError('Không thể tải nhật ký hoạt động');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  const applyFilters = () => {
    setFilters((p) => ({
      ...p,
      action: actionInput || undefined,
      from: from || undefined,
      to: to || undefined,
      page: 1,
    }));
  };

  const resetFilters = () => {
    setActionInput('');
    setFrom('');
    setTo('');
    setFilters({ page: 1, limit: 30 });
  };

  return (
    <div className="space-y-6 p-6">
      <AdminPageHeader
        title="Nhật ký hoạt động"
        description="Lịch sử thao tác của người dùng trong toàn hệ thống."
        actions={
          <>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 rounded-xl border bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
             
            >
              Đặt lại
            </button>
            <button
              type="button"
              onClick={() => void fetchLogs()}
              className="inline-flex items-center gap-1.5 rounded-xl border bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
             
            >
              <RefreshCw className="h-4 w-4" /> Làm mới
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white shadow-sm p-3 md:grid-cols-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={actionInput}
            onChange={(e) => setActionInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            placeholder="Lọc theo hành động (VD: created, blocked...)"
            className="h-9 w-full rounded-lg border bg-white pl-9 pr-3 text-sm focus:outline-none"
           
          />
        </div>
        <div>
          <input
            type="datetime-local"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-9 w-full rounded-lg border bg-white px-3 text-sm focus:outline-none"
           
            placeholder="Từ ngày"
          />
        </div>
        <div>
          <input
            type="datetime-local"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-9 w-full rounded-lg border bg-white px-3 text-sm focus:outline-none"
           
            placeholder="Đến ngày"
          />
        </div>
        <button
          type="button"
          onClick={applyFilters}
          className="h-9 rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Áp dụng
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : error ? (
          <div className="px-4 py-12 text-center">
            <p className="text-slate-500">{error}</p>
            <button
              type="button"
              onClick={() => void fetchLogs()}
              className="mt-3 inline-flex items-center rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Thử lại
            </button>
          </div>
        ) : logs.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-slate-500">Không có log nào.</p>
        ) : (
          <ul className="divide-y">
            {logs.map((log) => (
              <li key={log.id} className="flex items-start gap-3 px-4 py-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
                  style={{
                    background: 'linear-gradient(135deg, #475569, #1f2937)',
                  }}
                >
                  {log.userId?.fullName?.charAt(0)?.toUpperCase() ?? '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-700">
                    <span className="font-semibold">{log.userId?.fullName ?? 'Hệ thống'}</span>{' '}
                    <span className="text-slate-500">{log.action}</span>{' '}
                    <span className="font-medium text-slate-800">{log.target}</span>
                    {log.projectId && (
                      <span className="ml-1 inline-flex items-center gap-1 text-xs text-slate-500">
                        <FolderKanban className="h-3 w-3" /> {log.projectId.name}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {timeAgo(log.timestamp)} · {new Date(log.timestamp).toLocaleString('vi-VN')}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-slate-500">
            <span>Trang {pagination.page}/{pagination.totalPages} · {pagination.total} log</span>
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