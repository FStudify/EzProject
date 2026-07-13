import { useCallback, useEffect, useMemo, useState } from 'react';

import SubscriptionModal from '@/components/payment/SubscriptionModal';
import { Loader2, Receipt, ChevronLeft, ChevronRight, Filter, ShoppingBag } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast, Modal } from '@/components/ui';
import { fetchMyPaymentHistory } from '@/api/payment.api';
import { formatCurrency, paymentStatusTone } from '@/api/paymentFormat';
import type { Payment, PaymentStatus } from '@/api/types';

const STATUS_FILTERS: Array<{ value: PaymentStatus | 'ALL'; labelKey: string }> = [
  { value: 'ALL', labelKey: 'status_filter_all' },
  { value: 'PAID', labelKey: 'payment_status_paid' },
  { value: 'PENDING', labelKey: 'payment_status_pending' },
  { value: 'CANCELLED', labelKey: 'payment_status_cancelled' },
  { value: 'FAILED', labelKey: 'payment_status_failed' },
];

interface PaymentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PaymentHistoryModal({ isOpen, onClose }: PaymentHistoryModalProps) {
  const { lang } = useLanguage();
  const { toast } = useToast();

  const [items, setItems] = useState<Payment[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<PaymentStatus | 'ALL'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const limit = 10;

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchMyPaymentHistory({
        status: status === 'ALL' ? undefined : status,
        page,
        limit,
      });
      setItems(data.items);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load';
      toast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [page, status, toast]);

  useEffect(() => {
    if (isOpen) {
      void reload();
    }
  }, [reload, isOpen]);

  useEffect(() => {
    setPage(1);
  }, [status]);

  const headerText = useMemo(() => {
    if (total === 0) return lang === 'en' ? 'No payments yet' : 'Chưa có thanh toán nào';
    return lang === 'en'
      ? `${total} payment${total === 1 ? '' : 's'}`
      : `${total} thanh toán`;
  }, [total, lang]);

  return (
    <>
      <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        title={lang === 'en' ? 'Payment History' : 'Lịch sử thanh toán'}
        size="lg"
      >
        <div className="space-y-6">
          {/* Header */}
          <header className="flex flex-wrap items-end justify-between gap-3 border-b border-[#E8D8CF] pb-5 dark:border-slate-700">
            <div>
              <p className="mt-1 text-sm text-[#5C514A] dark:text-slate-400">
                {headerText}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5 hover:shadow-primary/30"
            >
              <ShoppingBag className="h-4 w-4" />
              {lang === 'en' ? 'Upgrade plan' : 'Nâng cấp gói'}
            </button>
          </header>

          {/* Filter */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-[#7D6F66] dark:text-slate-400" />
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setStatus(f.value)}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all ${
              status === f.value
                ? 'border-primary bg-primary text-white shadow-sm'
                : 'border-[#E8D8CF] bg-white text-[#5C514A] hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {labelOf(f.value, lang)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-[#E8D8CF] bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#FFF8F3] text-left text-[11px] font-extrabold uppercase tracking-wider text-[#7D6F66] dark:bg-slate-700/50 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3">{lang === 'en' ? 'Order' : 'Mã đơn'}</th>
                <th className="px-4 py-3">{lang === 'en' ? 'Plan' : 'Gói'}</th>
                <th className="px-4 py-3 text-right">{lang === 'en' ? 'Amount' : 'Số tiền'}</th>
                <th className="px-4 py-3">{lang === 'en' ? 'Method' : 'Phương thức'}</th>
                <th className="px-4 py-3">{lang === 'en' ? 'Status' : 'Trạng thái'}</th>
                <th className="px-4 py-3">{lang === 'en' ? 'Time' : 'Thời gian'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2E8DD] dark:divide-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <Receipt className="mx-auto mb-2 h-8 w-8 text-[#9C8F86] dark:text-slate-500" />
                    <p className="text-sm text-[#5C514A] dark:text-slate-400">
                      {lang === 'en' ? 'No payments match this filter.' : 'Không có thanh toán nào khớp bộ lọc.'}
                    </p>
                  </td>
                </tr>
              ) : (
                items.map((p) => {
                  const tone = paymentStatusTone(p.status);
                  return (
                    <tr key={p.id} className="transition-colors hover:bg-[#FFF8F3] dark:hover:bg-slate-700/40">
                      <td className="px-4 py-3 font-mono text-xs text-[#1F1F1F] dark:text-slate-200">
                        {p.orderCode}
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#1F1F1F] dark:text-slate-100">
                        {p.planName}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-[#1F1F1F] dark:text-slate-100">
                        {formatCurrency(p.amount, p.currency, lang)}
                      </td>
                      <td className="px-4 py-3 text-[#5C514A] dark:text-slate-400">PayOS</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${tone.className}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#5C514A] dark:text-slate-400">
                        {new Date(p.createdAt).toLocaleString(lang === 'en' ? 'en-US' : 'vi-VN')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="inline-flex items-center gap-1 rounded-lg border border-[#E8D8CF] bg-white px-3 py-1.5 text-sm font-semibold text-[#5C514A] transition-all hover:border-primary hover:text-primary disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            <ChevronLeft className="h-4 w-4" />
            {lang === 'en' ? 'Previous' : 'Trước'}
          </button>
          <span className="rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-bold text-primary">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="inline-flex items-center gap-1 rounded-lg border border-[#E8D8CF] bg-white px-3 py-1.5 text-sm font-semibold text-[#5C514A] transition-all hover:border-primary hover:text-primary disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            {lang === 'en' ? 'Next' : 'Sau'}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

        </div>
      </Modal>

      <SubscriptionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}

function labelOf(value: PaymentStatus | 'ALL', lang: 'vi' | 'en'): string {
  const map: Record<string, string> = {
    ALL: lang === 'en' ? 'All' : 'Tất cả',
    PAID: lang === 'en' ? 'Paid' : 'Đã thanh toán',
    PENDING: lang === 'en' ? 'Pending' : 'Đang chờ',
    CANCELLED: lang === 'en' ? 'Cancelled' : 'Đã huỷ',
    FAILED: lang === 'en' ? 'Failed' : 'Thất bại',
    REFUNDED: lang === 'en' ? 'Refunded' : 'Hoàn tiền',
  };
  // Ưu tiên map tĩnh tránh cache key issue với t() trên dict chưa có sẵn.
  return map[value] ?? value;
}
