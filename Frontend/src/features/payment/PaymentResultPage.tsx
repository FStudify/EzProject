import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, AlertTriangle, Receipt, ArrowRight, RefreshCcw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast, Button } from '@/components/ui';
import { fetchPaymentStatus } from '@/api/payment.api';
import { formatCurrency, paymentStatusTone } from '@/api/paymentFormat';
import type { Payment, PaymentStatus } from '@/api/types';

type ResultKey = 'success' | 'cancelled' | 'failed' | 'unknown';

function deriveResultKey(params: URLSearchParams, status: PaymentStatus | null): ResultKey {
  const explicit = params.get('status');
  if (explicit === 'cancelled' || explicit === 'cancel') return 'cancelled';
  if (explicit === 'success' || explicit === 'PAID') return 'success';
  if (explicit === 'failed') return 'failed';
  if (status === 'PAID') return 'success';
  if (status === 'CANCELLED') return 'cancelled';
  if (status === 'FAILED') return 'failed';
  if (status === 'PENDING') return 'unknown';
  if (status === 'REFUNDED') return 'cancelled';
  return 'unknown';
}

export default function PaymentResultPage() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const orderCode = params.get('orderCode');
  const [payment, setPayment] = useState<Payment | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      // Trang này chỉ dành cho user đã đăng nhập.
      navigate(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`, { replace: true });
      return;
    }
    if (!orderCode) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    fetchPaymentStatus(orderCode)
      .then((p) => {
        if (!cancelled) setPayment(p);
      })
      .catch((err) => {
        if (!cancelled) toast(err.message ?? 'Cannot load payment', 'error');
      })
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [orderCode, user, navigate, toast]);

  // Nếu payment đang PENDING mà user vừa quay lại (status=success param),
  // poll trong vài giây để chờ webhook xử lý.
  useEffect(() => {
    if (!payment || payment.status !== 'PENDING') return undefined;
    const explicit = params.get('status');
    if (explicit !== 'success') return undefined;
    const handle = setInterval(async () => {
      try {
        const updated = await fetchPaymentStatus(payment.orderCode);
        setPayment(updated);
      } catch {
        // ignore polling errors
      }
    }, 3000);
    const stop = setTimeout(() => clearInterval(handle), 15_000);
    return () => {
      clearInterval(handle);
      clearTimeout(stop);
    };
  }, [payment, params]);

  const resultKey: ResultKey = useMemo(() => deriveResultKey(params, payment?.status ?? null), [params, payment]);

  if (!user) return null;

  if (isLoading) {
    return (
      <CenteredCard>
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-sm font-medium text-[#5C514A] dark:text-slate-400">
          {lang === 'en' ? 'Confirming your payment...' : 'Đang xác nhận thanh toán...'}
        </p>
      </CenteredCard>
    );
  }

  if (!orderCode) {
    return (
      <CenteredCard>
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <h1 className="mt-4 text-xl font-bold text-[#1F1F1F] dark:text-slate-100">
          {lang === 'en' ? 'Missing payment reference' : 'Thiếu mã thanh toán'}
        </h1>
        <p className="mt-2 text-sm text-[#5C514A] dark:text-slate-400">
          {lang === 'en' ? 'No orderCode provided in URL.' : 'Không tìm thấy orderCode trong URL.'}
        </p>
        <Link to="/app" className="mt-6">
          <Button variant="accent" size="md">
            {lang === 'en' ? 'Back' : 'Trở về'}
          </Button>
        </Link>
      </CenteredCard>
    );
  }

  const tone = payment ? paymentStatusTone(payment.status) : null;

  return (
    <CenteredCard>
      {resultKey === 'success' && <CheckCircle2 className="h-16 w-16 text-emerald-500" />}
      {resultKey === 'cancelled' && <XCircle className="h-16 w-16 text-slate-400" />}
      {resultKey === 'failed' && <XCircle className="h-16 w-16 text-rose-500" />}
      {resultKey === 'unknown' && (payment?.status === 'PENDING'
        ? <Loader2 className="h-16 w-16 animate-spin text-amber-500" />
        : <AlertTriangle className="h-16 w-16 text-amber-500" />)}

      <h1 className="mt-5 text-2xl font-black tracking-tight text-[#1F1F1F] dark:text-slate-100">
        {resultKey === 'success' && (lang === 'en' ? 'Payment successful' : 'Thanh toán thành công')}
        {resultKey === 'cancelled' && (lang === 'en' ? 'Payment cancelled' : 'Đã huỷ thanh toán')}
        {resultKey === 'failed' && (lang === 'en' ? 'Payment failed' : 'Thanh toán thất bại')}
        {resultKey === 'unknown' && payment?.status === 'PENDING'
          && (lang === 'en' ? 'Awaiting confirmation' : 'Đang chờ xác nhận')}
        {resultKey === 'unknown' && payment && payment.status !== 'PENDING'
          && (lang === 'en' ? 'Payment updated' : 'Đã cập nhật thanh toán')}
      </h1>

      <p className="mt-2 max-w-md text-sm text-[#5C514A] dark:text-slate-400">
        {resultKey === 'success' && (lang === 'en'
          ? `Your ${payment?.planName ?? 'plan'} subscription is now active. Enjoy the new features!`
          : `Gói ${payment?.planName ?? ''} của bạn đã được kích hoạt. Tận hưởng các tính năng mới!`)}
        {resultKey === 'cancelled' && (lang === 'en'
          ? 'You cancelled the payment. No charge was made.'
          : 'Bạn đã huỷ thanh toán. Không có khoản phí nào được thực hiện.')}
        {resultKey === 'failed' && (lang === 'en'
          ? 'Something went wrong with your payment. Please try again or contact support.'
          : 'Thanh toán gặp lỗi. Vui lòng thử lại hoặc liên hệ hỗ trợ.')}
        {resultKey === 'unknown' && payment?.status === 'PENDING' && (lang === 'en'
          ? 'PayOS is still confirming your payment. We will update automatically in a few seconds.'
          : 'PayOS đang xác nhận thanh toán. Trang sẽ tự cập nhật sau vài giây.')}
      </p>

      {payment && (
        <div className="mt-6 w-full max-w-md rounded-2xl border border-[#E8D8CF] bg-white p-5 text-left dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#5C514A] dark:text-slate-400">
              <Receipt className="h-3.5 w-3.5" />
              {lang === 'en' ? 'Receipt' : 'Hoá đơn'}
            </div>
            {tone && (
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${tone.className}`}>
                {payment.status}
              </span>
            )}
          </div>
          <dl className="divide-y divide-[#F2E8DD] text-sm dark:divide-slate-700">
            <Row label={lang === 'en' ? 'Order code' : 'Mã đơn'} value={payment.orderCode} />
            <Row label={lang === 'en' ? 'Plan' : 'Gói'} value={payment.planName} />
            <Row label={lang === 'en' ? 'Amount' : 'Số tiền'} value={formatCurrency(payment.amount, payment.currency, lang)} />
            <Row label={lang === 'en' ? 'Method' : 'Phương thức'} value="PayOS" />
            <Row
              label={lang === 'en' ? 'Created at' : 'Tạo lúc'}
              value={new Date(payment.createdAt).toLocaleString(lang === 'en' ? 'en-US' : 'vi-VN')}
            />
            {payment.paidAt && (
              <Row
                label={lang === 'en' ? 'Paid at' : 'Thanh toán lúc'}
                value={new Date(payment.paidAt).toLocaleString(lang === 'en' ? 'en-US' : 'vi-VN')}
              />
            )}
          </dl>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {resultKey === 'success' && (
          <Link to="/app">
            <Button variant="accent" size="md" className="gap-1.5">
              {lang === 'en' ? 'Go to workspace' : 'Tới workspace'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        )}
        {resultKey === 'failed' && (
          <Link to="/app">
            <Button variant="accent" size="md" className="gap-1.5">
              <RefreshCcw className="h-4 w-4" />
              {lang === 'en' ? 'Back' : 'Trở về'}
            </Button>
          </Link>
        )}
        {(resultKey === 'cancelled' || (resultKey === 'unknown' && payment?.status !== 'PENDING')) && (
          <Link to="/app">
            <Button variant="accent" size="md" className="gap-1.5">
              <ArrowRight className="h-4 w-4" />
              {lang === 'en' ? 'Back' : 'Trở về'}
            </Button>
          </Link>
        )}
        <Link to="/app/payments">
          <Button variant="secondary" size="md">
            {lang === 'en' ? 'Payment history' : 'Lịch sử thanh toán'}
          </Button>
        </Link>
      </div>
    </CenteredCard>
  );
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12 transition-colors">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dt className="text-xs font-semibold uppercase tracking-wide text-[#7D6F66] dark:text-slate-400">{label}</dt>
      <dd className="text-right font-mono text-sm font-semibold text-[#1F1F1F] dark:text-slate-100">{value}</dd>
    </div>
  );
}
