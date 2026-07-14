import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search,
  Download,
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Shield,
  ShieldOff,
  Mail,
  CalendarDays,
  Briefcase,
  User as UserIcon,
} from 'lucide-react';
import {
  getAdminUsers,
  getAdminUser,
  blockAdminUser,
  unblockAdminUser,
  exportAdminUsers,
  formatBlockRemaining,
  type AdminUser,
  type AdminUserDetail,
  type AdminUserFilters,
} from '@/api/admin.api';
import { useToast, Modal, Button, Avatar } from '@/components/ui';
import AdminPageHeader from './components/AdminPageHeader';

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const d = Math.floor(diff / 86_400_000);
  if (d < 1) return 'Hôm nay';
  if (d < 7) return `${d} ngày trước`;
  return new Date(ts).toLocaleDateString('vi-VN');
}

export default function AdminUsersPage() {
  const { toast } = useToast();
  const [filters, setFilters] = useState<AdminUserFilters>({ page: 1, limit: 15 });
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');

  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [blockTarget, setBlockTarget] = useState<AdminUser | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [blockDurationHours, setBlockDurationHours] = useState<number | null>(24);
  const [isBlocking, setIsBlocking] = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getAdminUsers(filters);
      setUsers(res.data);
      setPagination(res.pagination);
    } catch {
      setError('Không thể tải danh sách người dùng');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const onSearch = () => {
    setFilters((p) => ({ ...p, search: searchInput || undefined, page: 1 }));
  };

  const onStatusFilter = (status?: 'active' | 'blocked') => {
    setFilters((p) => ({ ...p, status, page: 1 }));
  };

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const d = await getAdminUser(id);
      setDetail(d);
    } catch (e) {
      toast('Không thể tải thông tin người dùng', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const submitBlock = async () => {
    if (!blockTarget) return;
    setIsBlocking(true);
    try {
      await blockAdminUser(blockTarget.id, {
        reason: blockReason || undefined,
        durationHours: blockDurationHours ?? undefined,
      });
      toast(
        blockDurationHours
          ? `Đã tạm khóa tài khoản ${blockTarget.fullName} (${formatBlockRemaining(new Date(Date.now() + blockDurationHours * 3600_000).toISOString())})`
          : `Đã tạm khóa vĩnh viễn tài khoản ${blockTarget.fullName}`,
        'success',
      );
      setBlockTarget(null);
      setBlockReason('');
      setBlockDurationHours(24);
      void fetchUsers();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Không thể khóa tài khoản';
      toast(msg, 'error');
    } finally {
      setIsBlocking(false);
    }
  };

  const handleUnblock = async (u: AdminUser) => {
    try {
      await unblockAdminUser(u.id);
      toast(`Đã mở khóa tài khoản ${u.fullName}`, 'success');
      void fetchUsers();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Không thể mở khóa';
      toast(msg, 'error');
    }
  };

  const handleExport = async () => {
    try {
      const blob = await exportAdminUsers(filters);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast('Xuất CSV thất bại', 'error');
    }
  };

  const totalBadge = useMemo(() => {
    if (isLoading) return 'Đang tải...';
    return `${pagination.total} người dùng`;
  }, [pagination.total, isLoading]);

  return (
    <div className="space-y-6 p-6">
      <AdminPageHeader
        title="Quản lý người dùng"
        description="Xem, tìm kiếm và tạm khóa tài khoản người dùng."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => void fetchUsers()}>
              <RefreshCw className="mr-1.5 h-4 w-4" /> Làm mới
            </Button>
            <Button variant="primary" size="sm" onClick={handleExport}>
              <Download className="mr-1.5 h-4 w-4" /> Xuất CSV
            </Button>
          </>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white shadow-sm p-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSearch();
            }}
            placeholder="Tìm theo tên, username hoặc email..."
            className="h-9 w-full rounded-lg border bg-white pl-9 pr-3 text-sm focus:outline-none"
           
          />
        </div>
        <div className="flex items-center rounded-lg border bg-white">
          {[
            { value: undefined, label: 'Tất cả' },
            { value: 'active', label: 'Đang hoạt động' },
            { value: 'blocked', label: 'Đã khóa' },
          ].map((s) => {
            const active = filters.status === s.value;
            return (
              <button
                key={s.label}
                type="button"
                onClick={() => onStatusFilter(s.value as 'active' | 'blocked' | undefined)}
                className={`px-3 py-1.5 text-xs font-semibold transition-all rounded-md ${active ? "bg-slate-800 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100"}`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center rounded-lg border bg-white">
          <select
            value={filters.planKey || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, planKey: e.target.value || undefined, page: 1 }))}
            className="h-8 px-2 text-xs font-semibold text-slate-700 bg-transparent outline-none cursor-pointer"
          >
            <option value="">Tất cả gói</option>
            <option value="free">Gói Free</option>
            <option value="pro">Gói Pro</option>
            <option value="ultra">Gói Ultra</option>
          </select>
        </div>
        <span className="ml-auto text-xs text-slate-500">{totalBadge}</span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Người dùng</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Vai trò</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Ngày tạo</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <p className="text-slate-500">{error}</p>
                  <Button variant="primary" size="sm" className="mt-3" onClick={() => void fetchUsers()}>
                    Thử lại
                  </Button>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                  Không có người dùng nào.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => void openDetail(u.id)}
                      className="flex items-center gap-3 text-left"
                    >
                      <Avatar src={u.avatar ?? undefined} name={u.fullName} size="sm" planKey={u.currentPlan} />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-slate-800">{u.fullName}</p>
                          {u.currentPlan && u.currentPlan !== 'FREE' && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${u.currentPlan === 'ULTRA' ? 'bg-fuchsia-100 text-fuchsia-700' : 'bg-amber-100 text-amber-700'}`}>
                              {u.currentPlan}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">@{u.username}</p>
                      </div>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3">
                    {u.role === 'ADMIN' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                        <Shield className="h-3 w-3" /> Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        Khách hàng
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.isBlocked ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
                          <ShieldOff className="h-3 w-3" /> Đã khóa
                        </span>
                        {u.blockedUntil && (
                          <span className="text-[11px] text-slate-500">
                            Còn {formatBlockRemaining(u.blockedUntil)}
                          </span>
                        )}
                        {!u.blockedUntil && (
                          <span className="text-[11px] text-slate-500">Vĩnh viễn</span>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        Đang hoạt động
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{timeAgo(u.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    {u.isBlocked ? (
                      <button
                        type="button"
                        onClick={() => void handleUnblock(u)}
                        className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                      >
                        Mở khóa
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={u.role === 'ADMIN'}
                        onClick={() => {
                          setBlockTarget(u);
                          setBlockReason('');
                          setBlockDurationHours(24);
                        }}
                        className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                        title={u.role === 'ADMIN' ? 'Không thể khóa admin khác' : 'Tạm khóa tài khoản'}
                      >
                        Khóa
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-slate-500">
            <span>
              Trang {pagination.page}/{pagination.totalPages}
            </span>
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

      {/* Detail modal */}
      <Modal
        isOpen={!!detail || detailLoading}
        onClose={() => setDetail(null)}
        title="Chi tiết người dùng"
        size="lg"
      >
        {detailLoading || !detail ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <DetailBody detail={detail} />
        )}
      </Modal>

      {/* Block modal */}
      <Modal isOpen={!!blockTarget} onClose={() => setBlockTarget(null)} title="Tạm khóa tài khoản" size="md">
        {blockTarget && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Bạn sắp tạm khóa tài khoản <strong>{blockTarget.fullName}</strong> ({blockTarget.email}).
              Người dùng sẽ không thể đăng nhập cho đến khi hết thời hạn hoặc được mở khóa.
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-700">Thời hạn khoá</label>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {[
                  { v: 1, label: '1 giờ' },
                  { v: 24, label: '24 giờ' },
                  { v: 24 * 7, label: '7 ngày' },
                  { v: 24 * 30, label: '30 ngày' },
                  { v: null, label: 'Vĩnh viễn' },
                ].map((p) => {
                  const active = blockDurationHours === p.v;
                  return (
                    <button
                      key={String(p.v ?? 'perm')}
                      type="button"
                      onClick={() => setBlockDurationHours(p.v)}
                      className="rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors"
                      style={
                        active
                          ? { backgroundColor: '#1f2937', color: 'white', borderColor: '#1f2937' }
                          : { borderColor: '#E8D8CF', color: '#635648' }
                      }
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <label className="text-xs text-slate-500">Hoặc nhập số giờ:</label>
                <input
                  type="number"
                  min={1}
                  max={8760}
                  value={blockDurationHours ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === '') {
                      setBlockDurationHours(null);
                    } else {
                      const n = Number(v);
                      setBlockDurationHours(Number.isFinite(n) && n > 0 ? n : null);
                    }
                  }}
                  className="w-24 rounded-md border bg-white px-2 py-1 text-sm focus:outline-none"
                 
                />
                <span className="text-xs text-slate-400">giờ (tối đa 8760 = 1 năm)</span>
              </div>
              {blockDurationHours ? (
                <p className="mt-2 text-xs text-slate-500">
                  Tài khoản sẽ tự động mở sau khoảng&nbsp;
                  <strong>{formatBlockRemaining(new Date(Date.now() + blockDurationHours * 3600_000).toISOString())}</strong>.
                </p>
              ) : (
                <p className="mt-2 text-xs text-rose-600">
                  Khoá vĩnh viễn — chỉ admin mới có thể mở khoá thủ công.
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Lý do (tuỳ chọn)</label>
              <textarea
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Nhập lý do khóa tài khoản..."
                className="mt-1 w-full rounded-lg border bg-white p-2.5 text-sm focus:outline-none"
               
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="md" onClick={() => setBlockTarget(null)}>
                Huỷ
              </Button>
              <Button variant="danger" size="md" onClick={submitBlock} disabled={isBlocking}>
                {isBlocking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Xác nhận khóa'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function DetailBody({ detail }: { detail: AdminUserDetail }) {
  const u = detail.user;
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <Avatar src={u.avatar ?? undefined} name={u.fullName} size="lg" />
        <div>
          <p className="text-lg font-semibold text-slate-800">{u.fullName}</p>
          <p className="text-sm text-slate-500">@{u.username} · {u.email}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {u.role === 'ADMIN' && (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">Admin</span>
            )}
            {u.isBlocked ? (
              <div className="flex flex-col gap-0.5">
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">Đã khóa</span>
                {u.blockedUntil && (
                  <span className="text-[11px] text-slate-500">
                    Còn {formatBlockRemaining(u.blockedUntil)}
                  </span>
                )}
                {!u.blockedUntil && (
                  <span className="text-[11px] text-slate-500">Vĩnh viễn</span>
                )}
                {u.blockedReason && (
                  <span className="text-[11px] italic text-slate-500">Lý do: {u.blockedReason}</span>
                )}
              </div>
            ) : (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Đang hoạt động</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <InfoRow icon={Mail} label="Email" value={u.email} />
        <InfoRow icon={CalendarDays} label="Ngày đăng ký" value={new Date(u.createdAt).toLocaleString('vi-VN')} />
        {u.department && <InfoRow icon={Briefcase} label="Phòng ban" value={u.department} />}
        {u.position && <InfoRow icon={UserIcon} label="Chức vụ" value={u.position} />}
      </div>

      <Section title={`Dự án đang tham gia (${detail.projects.length})`}>
        {detail.projects.length === 0 ? (
          <p className="text-xs text-slate-500">Chưa tham gia dự án nào.</p>
        ) : (
          <ul className="divide-y">
            {detail.projects.slice(0, 5).map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                <span className="truncate font-medium text-slate-700">{p.name}</span>
                <span className="text-xs text-slate-500">{p.status}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Hoạt động gần đây (${detail.recentActivities.length})`}>
        {detail.recentActivities.length === 0 ? (
          <p className="text-xs text-slate-500">Chưa có hoạt động.</p>
        ) : (
          <ul className="space-y-1.5">
            {detail.recentActivities.slice(0, 10).map((a) => (
              <li key={a.id} className="flex items-center justify-between text-xs">
                <span className="truncate text-slate-700">
                  <span className="font-medium">{a.action}</span> {a.target}
                </span>
                <span className="text-slate-400">{timeAgo(a.timestamp)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3">
      <Icon className="mt-0.5 h-4 w-4 text-slate-400" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wider text-slate-400">{label}</p>
        <p className="truncate text-sm font-medium text-slate-700">{value}</p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</h4>
      <div className="rounded-lg border bg-white p-3">
        {children}
      </div>
    </div>
  );
}