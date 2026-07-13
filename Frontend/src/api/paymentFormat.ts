import type { Lang } from '@/i18n/dict';
import type { PaymentStatus } from './types';

/**
 * Format số tiền VND/USD. Mặc định VND; English chuyển sang USD theo tỷ giá
 * đơn giản (1 USD = 25.000 VND — đủ cho dashboard, không cần realtime FX).
 */
export function formatCurrency(amount: number, currency = 'VND', lang: Lang = 'vi') {
  if (currency === 'VND') {
    if (lang === 'en') {
      const usd = amount / 25_000;
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(usd);
    }
    return new Intl.NumberFormat('vi-VN').format(amount) + ' \u0111';
  }
  return new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'vi-VN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCurrencyCompact(amount: number, currency = 'VND', lang: Lang = 'vi') {
  if (currency === 'VND' && lang === 'vi') {
    if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)} tỷ`;
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)} tr`;
    if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
    return amount.toString();
  }
  const usdAmount = currency === 'VND' && lang === 'en' ? amount / 25_000 : amount;
  if (usdAmount >= 1_000_000) return `${(usdAmount / 1_000_000).toFixed(1)}M`;
  if (usdAmount >= 1_000) return `${(usdAmount / 1_000).toFixed(1)}K`;
  return usdAmount.toFixed(0);
}

const STATUS_TONE: Record<PaymentStatus, { className: string }> = {
  PAID: { className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  PENDING: { className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  CANCELLED: { className: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  FAILED: { className: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' },
  REFUNDED: { className: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
};

export function paymentStatusTone(status: PaymentStatus) {
  return STATUS_TONE[status] ?? STATUS_TONE.PENDING;
}
