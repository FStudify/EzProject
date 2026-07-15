
import { useState, useCallback } from 'react';
import { Card } from '@/components/ui';
import {
  ResponsiveContainer,
  BarChart, Bar,
  PieChart, Pie, Cell, Label,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import type { RevenueChartPoint, RevenuePlanBreakdown } from '@/api/types';
import type { StatusDistribution } from '@/api/payment.api';
import { fetchRevenueChart, fetchRevenuePlans } from '@/api/payment.api';

interface RevenueChartsProps {
  trendData: RevenueChartPoint[];
  planData: RevenuePlanBreakdown[];
  statusData: StatusDistribution;
  range: '7d' | '30d' | '90d' | '1y';
  onRangeChange: (r: '7d' | '30d' | '90d' | '1y') => void;
}

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#f43f5e', '#64748b'];

function formatVnd(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

const RADIAN = Math.PI / 180;
function renderCustomizedLabel({ cx, cy, midAngle, innerRadius, outerRadius, value }: any) {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (value === 0) return null;
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700}>
      {value}
    </text>
  );
}

export function RevenueCharts({ trendData: initialTrendData, planData: initialPlanData, statusData, range: initialRange }: RevenueChartsProps) {
  // Independent range states
  const [trendRange, setTrendRange] = useState(initialRange);
  const [planRange, setPlanRange] = useState(initialRange);
  const [subRange, setSubRange] = useState(initialRange);

  const [localTrendData, setLocalTrendData] = useState(initialTrendData);
  const [localPlanData, setLocalPlanData] = useState(initialPlanData);

  const handleTrendRangeChange = useCallback(async (r: '7d' | '30d' | '90d' | '1y') => {
    setTrendRange(r);
    try {
      const days = r === '1y' ? 365 : r === '90d' ? 90 : r === '7d' ? 7 : 30;
      const res = await fetchRevenueChart(days);
      setLocalTrendData(res.series);
    } catch { /* ignore */ }
  }, []);

  const handlePlanRangeChange = useCallback(async (r: '7d' | '30d' | '90d' | '1y') => {
    setPlanRange(r);
    try {
      const days = r === '1y' ? 365 : r === '90d' ? 90 : r === '7d' ? 7 : 30;
      const res = await fetchRevenuePlans(days);
      setLocalPlanData(res.plans);
    } catch { /* ignore */ }
  }, []);

  const statusChartData = [
    { name: 'Thành công', value: statusData.PAID },
    { name: 'Đang xử lý', value: statusData.PENDING },
    { name: 'Đã huỷ', value: statusData.CANCELLED },
    { name: 'Thất bại', value: statusData.FAILED },
    { name: 'Hoàn tiền', value: statusData.REFUNDED },
  ].filter(d => d.value > 0);

  const subDistributionData = localPlanData.map(p => ({
    name: p.planName,
    value: p.activeSubscribers
  })).filter(d => d.value > 0);

  const totalStatusCount = statusChartData.reduce((sum, item) => sum + item.value, 0);
  const totalSubCount = subDistributionData.reduce((sum, item) => sum + item.value, 0);

  const rangeLabel = (r: string) => r === '7d' ? '7 ngày' : r === '30d' ? '30 ngày' : r === '90d' ? '90 ngày' : '1 năm';

  function RangeSelector({ value, onChange }: { value: string; onChange: (r: '7d' | '30d' | '90d' | '1y') => void }) {
    return (
      <div className="flex items-center rounded-xl border bg-white dark:bg-slate-800 dark:border-slate-700 shrink-0 overflow-hidden" style={{ borderColor: '#E8D8CF' }}>
        {(['7d', '30d', '90d', '1y'] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => onChange(r)}
            className="px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-semibold transition-colors"
            style={
              value === r
                ? { backgroundColor: '#1f2937', color: 'white' }
                : { color: '#635648' }
            }
          >
            {rangeLabel(r)}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend (Bar) */}
        <Card className="p-6">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-base font-bold text-slate-800">Biểu đồ tăng trưởng doanh thu</h3>
            <RangeSelector value={trendRange} onChange={handleTrendRangeChange} />
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={localTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} tickFormatter={(v) => { const p = v.split('-'); return `${p[2]}/${p[1]}`; }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `₫${(val/1000000).toFixed(1)}M`} />
                <Tooltip 
                  formatter={(value: any) => [formatVnd(value), 'Doanh thu']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="revenue" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Revenue by Plan (Bar) */}
        <Card className="p-6">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-base font-bold text-slate-800">Doanh thu theo gói</h3>
            <RangeSelector value={planRange} onChange={handlePlanRangeChange} />
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={localPlanData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="planName" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `₫${(val/1000000).toFixed(1)}M`} />
                <Tooltip 
                  formatter={(value: any) => [formatVnd(value), 'Doanh thu']}
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Status (Donut) */}
        <Card className="p-6">
          <h3 className="text-base font-bold text-slate-800 mb-6">Trạng thái thanh toán</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={3}
                  dataKey="value"
                  label={renderCustomizedLabel}
                  labelLine={false}
                >
                  <Label 
                    value={totalStatusCount} 
                    position="center" 
                    className="text-3xl font-bold fill-slate-800" 
                  />
                  {statusChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Subscription Distribution (Donut) */}
        <Card className="p-6">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-base font-bold text-slate-800">Phân bổ người đăng ký</h3>
            <RangeSelector value={subRange} onChange={(r) => { setSubRange(r); handlePlanRangeChange(r); }} />
          </div>
          <div className="h-[300px] w-full flex items-center justify-center">
            {subDistributionData.length === 0 ? (
              <div className="text-slate-400 font-medium">Chưa có người đăng ký</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={subDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={3}
                    dataKey="value"
                    label={renderCustomizedLabel}
                    labelLine={false}
                  >
                    <Label 
                      value={totalSubCount} 
                      position="center" 
                      className="text-3xl font-bold fill-slate-800" 
                    />
                    {subDistributionData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={['#64748b', '#3b82f6', '#f97316'][index % 3]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
