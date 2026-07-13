import { Card } from '@/components/ui';
import {
  TrendingUp, TrendingDown,
  DollarSign, Activity, Users,
  CreditCard, CheckCircle, Clock, AlertTriangle, RotateCcw
} from 'lucide-react';
import type { RevenueOverview } from '@/api/types';

interface RevenueKPIWidgetsProps {
  data: RevenueOverview;
}

function formatVnd(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

function GrowthBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return <span className="text-xs text-slate-500 font-medium">Chưa có dữ liệu</span>;
  const growth = ((current - previous) / previous) * 100;
  const isUp = growth >= 0;
  const Icon = isUp ? TrendingUp : TrendingDown;
  const colorClass = isUp ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50';

  return (
    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${colorClass}`}>
      <Icon className="w-3 h-3" />
      <span>{Math.abs(growth).toFixed(1)}%</span>
    </div>
  );
}

export function RevenueKPIWidgets({ data }: RevenueKPIWidgetsProps) {
  const kpis = [
    {
      title: 'Tổng doanh thu',
      value: formatVnd(data.totalRevenue),
      icon: DollarSign,
      color: 'text-orange-500',
      bg: 'bg-orange-100',
      growth: <GrowthBadge current={data.revenueThisMonth} previous={data.revenueLastMonth} />,
      subtext: 'so với tháng trước'
    },
    {
      title: 'Doanh thu hôm nay',
      value: formatVnd(data.revenueToday),
      icon: Activity,
      color: 'text-emerald-500',
      bg: 'bg-emerald-100',
      growth: <GrowthBadge current={data.revenueToday} previous={data.revenueYesterday} />,
      subtext: 'so với hôm qua'
    },
    {
      title: 'Tuần này',
      value: formatVnd(data.revenueThisWeek),
      icon: CreditCard,
      color: 'text-blue-500',
      bg: 'bg-blue-100',
      growth: <GrowthBadge current={data.revenueThisWeek} previous={data.revenueLastWeek} />,
      subtext: 'so với tuần trước'
    },
    {
      title: 'Tháng này',
      value: formatVnd(data.revenueThisMonth),
      icon: DollarSign,
      color: 'text-violet-500',
      bg: 'bg-violet-100',
      growth: <GrowthBadge current={data.revenueThisMonth} previous={data.revenueLastMonth} />,
      subtext: 'so với tháng trước'
    },
    {
      title: 'GTHĐ Trung bình',
      value: formatVnd(data.aov),
      icon: CheckCircle,
      color: 'text-amber-500',
      bg: 'bg-amber-100',
    }
  ];

  const paymentStats = [
    { title: 'Thanh toán thành công', value: data.successfulPayments, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { title: 'Chờ thanh toán', value: data.pendingPayments, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
    { title: 'Thanh toán thất bại', value: data.failedPayments, icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-50' },
    { title: 'Tiền hoàn trả', value: formatVnd(data.refundedRevenue), icon: RotateCcw, color: 'text-slate-500', bg: 'bg-slate-100' },
  ];

  const subStats = [
    { title: 'Đang đăng ký', value: data.activeSubscribers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Mua mới hôm nay', value: data.newToday, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'Gia hạn hôm nay', value: data.renewToday, icon: RotateCcw, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { title: 'Nâng cấp hôm nay', value: data.upgradeToday, icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Top 5 Revenue KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((k, i) => (
          <Card key={i} className="p-5 flex flex-col gap-3 group hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className={`p-2.5 rounded-xl ${k.bg}`}>
                <k.icon className={`w-5 h-5 ${k.color} group-hover:scale-110 transition-transform`} />
              </div>
              {k.growth && <div className="flex flex-col items-end gap-1">
                {k.growth}
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{k.subtext}</span>
              </div>}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500">{k.title}</p>
              <h3 className="text-xl lg:text-2xl font-bold text-slate-800 mt-1">{k.value}</h3>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Status KPIs */}
        <Card className="p-6">
          <h3 className="text-base font-bold text-slate-800 mb-4">Payment Status Overview</h3>
          <div className="grid grid-cols-2 gap-4">
            {paymentStats.map((p, i) => (
              <div key={i} className={`p-4 rounded-xl border flex items-center gap-4 ${p.bg} border-transparent hover:border-slate-200 transition-colors`}>
                <p.icon className={`w-8 h-8 ${p.color}`} />
                <div>
                  <p className="text-sm font-semibold text-slate-600">{p.title}</p>
                  <p className="text-xl font-bold text-slate-800">{p.value}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Subscription KPIs */}
        <Card className="p-6">
          <h3 className="text-base font-bold text-slate-800 mb-4">Subscription Activity</h3>
          <div className="grid grid-cols-2 gap-4">
            {subStats.map((s, i) => (
              <div key={i} className={`p-4 rounded-xl border flex items-center gap-4 ${s.bg} border-transparent hover:border-slate-200 transition-colors`}>
                <s.icon className={`w-8 h-8 ${s.color}`} />
                <div>
                  <p className="text-sm font-semibold text-slate-600">{s.title}</p>
                  <p className="text-xl font-bold text-slate-800">{s.value}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
