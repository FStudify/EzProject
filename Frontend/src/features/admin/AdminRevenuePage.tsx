import { useEffect, useState } from 'react';
import {
  Banknote,
  Calendar,
  Users,
  RefreshCw,
  Loader2,
  Trophy,
} from 'lucide-react';
import { useToast } from '@/components/ui';
import {
  fetchRevenueOverview,
  fetchRevenueChart,
  fetchRevenuePlans,
  fetchRevenueStatus,
  fetchRevenuePayments,
  fetchAdminSubscriptions,
  fetchAdminTopCustomers
} from '@/api/payment.api';
import type { StatusDistribution } from '@/api/payment.api';
import type { 
  RevenueOverview, 
  RevenueChartPoint, 
  RevenuePlanBreakdown,
  RevenuePaymentRow,
  AdminSubscriptionRow,
  AdminTopCustomer
} from '@/api/types';
import AdminPageHeader from './components/AdminPageHeader';
import { RevenueKPIWidgets } from './components/RevenueKPIWidgets';
import { RevenueCharts } from './components/RevenueCharts';
import { PaymentListTable } from './components/PaymentListTable';
import { SubscriptionListTable } from './components/SubscriptionListTable';

type Tab = 'overview' | 'subscriptions' | 'payments';

export default function AdminRevenuePage() {
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [range, setRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  // Overview Data
  const [overview, setOverview] = useState<RevenueOverview | null>(null);
  const [chartData, setChartData] = useState<RevenueChartPoint[]>([]);
  const [planData, setPlanData] = useState<RevenuePlanBreakdown[]>([]);
  const [statusData, setStatusData] = useState<StatusDistribution | null>(null);
  const [topCustomers, setTopCustomers] = useState<AdminTopCustomer[]>([]);

  // Subscriptions Data
  const [subs, setSubs] = useState<AdminSubscriptionRow[]>([]);
  const [isSubsLoading, setIsSubsLoading] = useState(false);

  // Payments Data
  const [payments, setPayments] = useState<RevenuePaymentRow[]>([]);
  const [isPaymentsLoading, setIsPaymentsLoading] = useState(false);

  const loadOverview = async (r: string = range) => {
    try {
      const days = r === '1y' ? 365 : r === '90d' ? 90 : r === '7d' ? 7 : 30;
      const [ov, ch, pl, st, tc] = await Promise.all([
        fetchRevenueOverview(),
        fetchRevenueChart(days),
        fetchRevenuePlans(days),
        fetchRevenueStatus(),
        fetchAdminTopCustomers()
      ]);
      setOverview(ov);
      setChartData(ch.series);
      setPlanData(pl.plans);
      setStatusData(st);
      setTopCustomers(tc);
    } catch (err: any) {
      toast(err.message, 'error');
    }
  };

  const loadSubscriptions = async () => {
    setIsSubsLoading(true);
    try {
      const res = await fetchAdminSubscriptions({ limit: 500 });
      setSubs(res.items);
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setIsSubsLoading(false);
    }
  };

  const loadPayments = async () => {
    setIsPaymentsLoading(true);
    try {
      const res = await fetchRevenuePayments({ limit: 500 });
      setPayments(res.items);
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setIsPaymentsLoading(false);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    await Promise.all([
      loadOverview(),
      loadSubscriptions(),
      loadPayments()
    ]);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRangeChange = async (r: '7d' | '30d' | '90d' | '1y') => {
    setRange(r);
    const days = r === '1y' ? 365 : r === '90d' ? 90 : r === '7d' ? 7 : 30;
    try {
      const [ch, pl] = await Promise.all([
        fetchRevenueChart(days),
        fetchRevenuePlans(days)
      ]);
      setChartData(ch.series);
      setPlanData(pl.plans);
    } catch (err: any) {
      toast(err.message, 'error');
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50 overflow-hidden pb-4 px-2 sm:px-4 lg:px-6">
      <AdminPageHeader
        title="Quản lý Doanh thu"
        description="Theo dõi tăng trưởng doanh thu, gói dịch vụ và trạng thái thanh toán."
        actions={
          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Làm mới
          </button>
        }
      />

      <div className="mt-4 px-1 pb-6 overflow-y-auto min-h-0">
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl shadow-sm border w-max mb-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'overview' ? 'bg-orange-100 text-orange-700 shadow-sm' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-2"><Banknote className="w-4 h-4" /> Tổng quan</div>
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'subscriptions' ? 'bg-blue-100 text-blue-700 shadow-sm' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-2"><Users className="w-4 h-4" /> Gói đăng ký</div>
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'payments' ? 'bg-emerald-100 text-emerald-700 shadow-sm' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Giao dịch</div>
          </button>
        </div>

        {activeTab === 'overview' && overview && statusData && (
          <div className="space-y-6">
            {overview && <RevenueKPIWidgets data={overview} />}
            {statusData && (
              <RevenueCharts 
                trendData={chartData} 
                planData={planData} 
                statusData={statusData} 
                range={range}
                onRangeChange={handleRangeChange}
              />
            )}
            
            {/* Top Customers Section */}
            {topCustomers?.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-yellow-100 text-yellow-600 rounded-lg">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800">Khách hàng mua nhiều nhất</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {topCustomers?.map((c, i) => (
                    <div key={c.userId} className="p-4 border rounded-xl hover:border-slate-300 transition-colors flex flex-col items-center text-center">
                      <div className="relative mb-3">
                        {i === 0 && <span className="absolute -top-3 -right-3 text-xl">👑</span>}
                        <img src={c.user.avatar || `https://ui-avatars.com/api/?name=${c.user.fullName}`} alt={c.user.fullName} className="w-14 h-14 rounded-full border-2 border-white shadow-sm" />
                      </div>
                      <p className="font-bold text-slate-800 line-clamp-1">{c.user.fullName}</p>
                      <p className="text-xs text-slate-500 mb-2 truncate w-full">{c.user.email}</p>
                      <div className="mt-auto pt-3 border-t w-full flex justify-between items-center">
                        <span className="text-xs text-slate-500">{c.paymentCount} đơn</span>
                        <span className="font-bold text-orange-600 text-sm">
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(c.totalSpent)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'subscriptions' && (
          <SubscriptionListTable data={subs} isLoading={isSubsLoading} />
        )}

        {activeTab === 'payments' && (
          <PaymentListTable data={payments} isLoading={isPaymentsLoading} />
        )}

        {isLoading && activeTab === 'overview' && !overview && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-4" />
            <p className="text-slate-500 font-medium">Đang tải dữ liệu...</p>
          </div>
        )}
      </div>
    </div>
  );
}
