import { useCallback, useEffect, useState } from 'react';
import {
  Users,
  FolderKanban,
  ListTodo,
  UserCheck,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import {
  getAdminStats,
  getAdminDashboardRecent,
  type AdminStats,
} from '@/api/admin.api';
import { fetchRevenueChart } from '@/api/payment.api';
import type { RevenueChartPoint } from '@/api/types';
import { useTheme } from '@/contexts/ThemeContext';
import AdminPageHeader from './components/AdminPageHeader';
import { Card, Button } from '@/components/ui';
import {
  ResponsiveContainer,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';

interface RecentPayload {
  recentUsers: Array<{
    id: string;
    fullName: string;
    email: string;
    username: string;
    role: 'ADMIN' | 'CUSTOMER';
    avatar: string | null;
    isBlocked: boolean;
    createdAt: string;
  }>;
  growth: {
    users: Array<{ date: string; count: number }>;
    projects: Array<{ date: string; count: number }>;
  };
  range: string;
}

function pctBadge(p: number) {
  if (p > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600">
        <TrendingUp className="h-3 w-3" /> +{p}%
      </span>
    );
  }
  if (p < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-rose-600">
        <TrendingDown className="h-3 w-3" /> {p}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-slate-500">
      <Minus className="h-3 w-3" /> 0%
    </span>
  );
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (m < 1) return 'vừa xong';
  if (m < 60) return `${m} phút trước`;
  if (h < 24) return `${h} giờ trước`;
  if (d < 30) return `${d} ngày trước`;
  return new Date(ts).toLocaleDateString('vi-VN');
}

function statCard(opts: {
  label: string;
  value: number | string;
  badge: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  theme: 'dark' | 'light';
}) {
  const { label, value, badge, icon: Icon, accent, theme } = opts;
  return (
    <div
      className="rounded-2xl border p-5"
      style={{
        backgroundColor: theme === 'dark' ? '#161c2a' : '#FFFDFB',
        borderColor: theme === 'dark' ? '#1f2937' : '#E8D8CF',
        boxShadow: '0 18px 30px -24px rgba(38, 24, 16, 0.6)',
      }}
    >
      <div className="flex items-start justify-between">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${accent}1f`, color: accent }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-right">{badge}</div>
      </div>
      <p
        className="mt-4 text-3xl font-bold tracking-tight"
        style={{ color: theme === 'dark' ? '#f1f5f9' : '#1F1F1F' }}
      >
        {value}
      </p>
      <p
        className="mt-1 text-sm"
        style={{ color: theme === 'dark' ? '#94a3b8' : '#7D6F66' }}
      >
        {label}
      </p>
    </div>
  );
}

export default function AdminOverviewPage() {
  const { theme } = useTheme();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recent, setRecent] = useState<RecentPayload | null>(null);
  const [revenueChartData, setRevenueChartData] = useState<RevenueChartPoint[]>([]);
  const [range, setRange] = useState<'7d' | '30d' | '90d' | '1y'>('7d');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const days = range === '1y' ? 365 : range === '90d' ? 90 : range === '7d' ? 7 : 30;
      const [s, r, rev] = await Promise.all([
        getAdminStats(), 
        getAdminDashboardRecent(range),
        fetchRevenueChart(days)
      ]);
      setStats(s);
      setRecent(r);
      setRevenueChartData(rev.series);
    } catch {
      setError('Không thể tải dữ liệu dashboard');
    } finally {
      setIsLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#D97853' }} />
        <span className="ml-2" style={{ color: '#7D6F66' }}>Đang tải...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p style={{ color: '#7D6F66' }}>{error}</p>
        <Button variant="primary" size="sm" onClick={fetchData}>
          <RefreshCw className="mr-2 h-4 w-4" /> Thử lại
        </Button>
      </div>
    );
  }

  const totals = stats?.totals;
  const growth = stats?.weeklyGrowth;

  return (
    <div className="space-y-6 p-6">
      <AdminPageHeader
        title="Tổng quan hệ thống"
        description="Cái nhìn nhanh về người dùng, dự án và hoạt động gần đây."
        actions={
          <Button variant="secondary" size="sm" onClick={fetchData}>
            <RefreshCw className="mr-1.5 h-4 w-4" /> Làm mới
          </Button>
        }
      />

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCard({
          label: 'Tổng người dùng',
          value: totals?.users ?? 0,
          badge: pctBadge(growth?.users.percent ?? 0),
          icon: Users,
          accent: '#3b82f6',
          theme,
        })}
        {statCard({
          label: 'Tổng dự án',
          value: totals?.projects ?? 0,
          badge: pctBadge(growth?.projects.percent ?? 0),
          icon: FolderKanban,
          accent: '#10b981',
          theme,
        })}
        {statCard({
          label: 'Tổng công việc',
          value: totals?.tasks ?? 0,
          badge: pctBadge(growth?.tasks.percent ?? 0),
          icon: ListTodo,
          accent: '#f59e0b',
          theme,
        })}
        {statCard({
          label: 'Active hôm nay',
          value: stats?.activeUsersToday ?? 0,
          badge: <span className="text-xs text-slate-500">24h gần nhất</span>,
          icon: UserCheck,
          accent: '#ef4444',
          theme,
        })}
      </div>

      {/* Charts + recent */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card padding="md">
            <div className="mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-800">Tăng trưởng người dùng &amp; dự án</h3>
                <p className="text-xs text-slate-500">Khoảng thời gian {range === '7d' ? '7 ngày' : range === '30d' ? '30 ngày' : range === '90d' ? '90 ngày' : '1 năm'} gần nhất</p>
              </div>
              <div className="flex items-center rounded-xl border bg-white dark:bg-slate-800 dark:border-slate-700 shrink-0 overflow-hidden">
                {(['7d', '30d', '90d', '1y'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRange(r)}
                    className="px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-semibold transition-colors"
                    style={
                      range === r
                        ? { backgroundColor: '#1f2937', color: 'white' }
                        : { color: '#64748b' }
                    }
                  >
                    {r === '7d' ? '7 ngày' : r === '30d' ? '30 ngày' : r === '90d' ? '90 ngày' : '1 năm'}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-[250px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={recent?.growth.users.map((u, i) => ({
                  date: u.date,
                  users: u.count,
                  projects: recent.growth.projects[i]?.count || 0
                })) || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProjects" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Area type="monotone" dataKey="users" name="Người dùng mới" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                  <Area type="monotone" dataKey="projects" name="Dự án mới" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorProjects)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card padding="md">
            <div className="mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-800">Tăng trưởng doanh thu</h3>
                <p className="text-xs text-slate-500">Khoảng thời gian {range === '7d' ? '7 ngày' : range === '30d' ? '30 ngày' : range === '90d' ? '90 ngày' : '1 năm'} gần nhất</p>
              </div>
              <div className="flex items-center rounded-xl border bg-white dark:bg-slate-800 dark:border-slate-700 shrink-0 overflow-hidden">
                {(['7d', '30d', '90d', '1y'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRange(r)}
                    className="px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-semibold transition-colors"
                    style={
                      range === r
                        ? { backgroundColor: '#1f2937', color: 'white' }
                        : { color: '#64748b' }
                    }
                  >
                    {r === '7d' ? '7 ngày' : r === '30d' ? '30 ngày' : r === '90d' ? '90 ngày' : '1 năm'}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-[250px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `₫${(val/1000000).toFixed(1)}M`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value))}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Area type="monotone" dataKey="revenue" name="Doanh thu" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <div>
          <Card padding="none">
            <div className="border-b px-4 py-3" style={{ borderColor: '#E8D8CF' }}>
              <h3 className="text-sm font-semibold" style={{ color: '#1F1F1F' }}>
                Người dùng mới đăng ký
              </h3>
              <p className="text-xs" style={{ color: '#7D6F66' }}>Top 10 gần nhất</p>
            </div>
            {recent?.recentUsers.length ? (
              <ul>
                {recent.recentUsers.map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center gap-3 px-4 py-3"
                    style={{ borderBottom: '1px solid #E8D8CF' }}
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                      style={{
                        background:
                          u.role === 'ADMIN'
                            ? 'linear-gradient(135deg, #ef4444, #b91c1c)'
                            : 'linear-gradient(135deg, #6366f1, #4338ca)',
                      }}
                    >
                      {u.fullName?.charAt(0)?.toUpperCase() ?? u.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium" style={{ color: '#1F1F1F' }}>
                        {u.fullName}{' '}
                        {u.role === 'ADMIN' && (
                          <span className="ml-1 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                            ADMIN
                          </span>
                        )}
                        {u.isBlocked && (
                          <span className="ml-1 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                            BLOCKED
                          </span>
                        )}
                      </p>
                      <p className="truncate text-xs" style={{ color: '#7D6F66' }}>
                        {u.email}
                      </p>
                    </div>
                    <p className="shrink-0 text-[11px]" style={{ color: '#9a9086' }}>
                      {timeAgo(u.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-8 text-center text-sm" style={{ color: '#7D6F66' }}>
                Chưa có người dùng nào.
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}