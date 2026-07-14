import { api } from './config';
import { Endpoints } from './endpoints';
import type {
  CreatePaymentResult,
  Paginated,
  Payment,
  Plan,
  RevenueChart,
  RevenueOverview,
  RevenuePaymentRow,
  RevenuePlanBreakdown,
  Subscription,
} from './types';

/**
 * Payment / Plan / Subscription API — chỉ re-export fetch từ `api` wrapper.
 *
 * Lưu ý: KHÔNG có helper nào nhận `amount`/`currency` từ client — mọi giá đều
 * do server tính từ Plan. Client chỉ gửi `planKey`.
 */

// ── Public catalog ────────────────────────────────────────────
export async function fetchPlans(): Promise<Plan[]> {
  const data = await api.get<{ plans: Plan[] }>(Endpoints.PLANS);
  return data.plans ?? [];
}

// ── User subscription ─────────────────────────────────────────
export async function fetchMyCurrentSubscription(): Promise<Subscription | null> {
  const data = await api.get<{ subscription: Subscription | null }>(Endpoints.PAYMENT_ME_CURRENT);
  return data.subscription ?? null;
}

// ── Create payment ────────────────────────────────────────────
export async function createPayment(planKey: string, voucherCode?: string): Promise<CreatePaymentResult> {
  return api.post<CreatePaymentResult>(Endpoints.PAYMENT_CREATE, { planKey, voucherCode });
}

// ── Validate Voucher ─────────────────────────────────────────
export async function validateVoucher(planKey: string, code: string): Promise<import('./types').VoucherValidationResult> {
  return api.post<import('./types').VoucherValidationResult>(Endpoints.PAYMENT_VOUCHER_VALIDATE, { planKey, code });
}

// ── Payment history ───────────────────────────────────────────
export interface PaymentHistoryQuery {
  status?: Payment['status'];
  page?: number;
  limit?: number;
}

export async function fetchMyPaymentHistory(
  query: PaymentHistoryQuery = {},
): Promise<Paginated<Payment>> {
  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  const qs = params.toString();
  return api.get<Paginated<Payment>>(
    `${Endpoints.PAYMENT_ME_HISTORY}${qs ? `?${qs}` : ''}`,
  );
}

export async function fetchPaymentStatus(orderCode: string): Promise<Payment> {
  const data = await api.get<{ payment: Payment }>(Endpoints.PAYMENT_ME_STATUS(orderCode));
  return data.payment;
}

export async function cancelPayment(orderCode: string): Promise<Payment> {
  const data = await api.post<{ payment: Payment }>(Endpoints.PAYMENT_ME_CANCEL(orderCode), {});
  return data.payment;
}

// ── Admin revenue dashboard ──────────────────────────────────
export async function fetchRevenueOverview(): Promise<RevenueOverview> {
  const data = await api.get<{ totals: RevenueOverview }>(Endpoints.ADMIN_REVENUE_OVERVIEW);
  return data.totals;
}

export async function fetchRevenueChart(days = 30): Promise<RevenueChart> {
  return api.get<RevenueChart>(`${Endpoints.ADMIN_REVENUE_CHART}?days=${days}`);
}

export async function fetchRevenuePlans(days = 30): Promise<{ plans: RevenuePlanBreakdown[] }> {
  return api.get<{ plans: RevenuePlanBreakdown[] }>(`${Endpoints.ADMIN_REVENUE_PLANS}?days=${days}`);
}

export interface StatusDistribution {
  PENDING: number;
  PAID: number;
  CANCELLED: number;
  FAILED: number;
  REFUNDED: number;
}

export async function fetchRevenueStatus(): Promise<StatusDistribution> {
  const data = await api.get<{ distribution: StatusDistribution }>(Endpoints.ADMIN_REVENUE_STATUS);
  return data.distribution;
}

export interface RevenuePaymentsQuery {
  from?: string;
  to?: string;
  planKey?: string;
  status?: Payment['status'];
  search?: string;
  page?: number;
  limit?: number;
}

export async function fetchRevenuePayments(
  query: RevenuePaymentsQuery = {},
): Promise<Paginated<RevenuePaymentRow>> {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  });
  const qs = params.toString();
  return api.get<Paginated<RevenuePaymentRow>>(
    `${Endpoints.ADMIN_REVENUE_PAYMENTS}${qs ? `?${qs}` : ''}`,
  );
}

export interface ExpiringSubscription {
  id: string;
  user: {
    id: string;
    email: string;
    username: string;
    fullName: string;
  } | null;
  planKey: string;
  planName: string;
  priceVnd: number;
  startedAt: string;
  expiresAt: string;
}

export async function fetchExpiringSubscriptions(): Promise<ExpiringSubscription[]> {
  const data = await api.get<{ items: ExpiringSubscription[] }>(Endpoints.ADMIN_REVENUE_EXPIRING);
  return data.items;
}

export function getExportCsvUrl(query: { status?: string; from?: string; to?: string }): string {
  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  const qs = params.toString();
  return `${api.getBaseUrl()}${Endpoints.ADMIN_REVENUE_EXPORT}${qs ? `?${qs}` : ''}`;
}

export interface AdminSubscriptionsQuery {
  planKey?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export async function fetchAdminSubscriptions(
  query: AdminSubscriptionsQuery = {},
): Promise<Paginated<import('./types').AdminSubscriptionRow>> {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  });
  const qs = params.toString();
  return api.get<Paginated<import('./types').AdminSubscriptionRow>>(
    `${Endpoints.ADMIN_REVENUE_SUBSCRIPTIONS}${qs ? `?${qs}` : ''}`,
  );
}

export async function fetchAdminTopCustomers(): Promise<import('./types').AdminTopCustomer[]> {
  return api.get<import('./types').AdminTopCustomer[]>(Endpoints.ADMIN_REVENUE_TOP_CUSTOMERS);
}

// ── Admin Pricing Management ──────────────────────────────
export async function fetchAdminPricingData(): Promise<import('./types').AdminPricingData> {
  return api.get<import('./types').AdminPricingData>(Endpoints.ADMIN_PRICING);
}

export async function createAdminPlan(data: any): Promise<{ plan: Plan }> {
  return api.post<{ plan: Plan }>(Endpoints.ADMIN_PRICING_PLANS, data);
}

export async function updateAdminPlan(planKey: string, data: any): Promise<{ plan: Plan }> {
  return api.put<{ plan: Plan }>(Endpoints.ADMIN_PRICING_PLAN(planKey), data);
}

export async function deleteAdminPlan(planKey: string): Promise<void> {
  await api.delete(Endpoints.ADMIN_PRICING_PLAN(planKey));
}

export async function createAdminPromotion(data: any): Promise<{ promotion: import('./types').Promotion }> {
  return api.post<{ promotion: import('./types').Promotion }>(Endpoints.ADMIN_PRICING_PROMOTIONS, data);
}

export async function updateAdminPromotion(id: string, data: any): Promise<{ promotion: import('./types').Promotion }> {
  return api.put<{ promotion: import('./types').Promotion }>(Endpoints.ADMIN_PRICING_PROMOTION_DETAIL(id), data);
}

export async function deleteAdminPromotion(id: string): Promise<void> {
  await api.delete(Endpoints.ADMIN_PRICING_PROMOTION_DETAIL(id));
}

export async function createAdminVoucher(data: any): Promise<{ voucher: import('./types').Voucher }> {
  return api.post<{ voucher: import('./types').Voucher }>(Endpoints.ADMIN_PRICING_VOUCHERS, data);
}

export async function updateAdminVoucher(id: string, data: any): Promise<{ voucher: import('./types').Voucher }> {
  return api.put<{ voucher: import('./types').Voucher }>(Endpoints.ADMIN_PRICING_VOUCHER_DETAIL(id), data);
}

export async function deleteAdminVoucher(id: string): Promise<void> {
  await api.delete(Endpoints.ADMIN_PRICING_VOUCHER_DETAIL(id));
}
