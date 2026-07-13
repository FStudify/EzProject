import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Check,
  Loader2,
  Sparkles,
  X as XIcon,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui';
import {
  createPayment,
  fetchMyCurrentSubscription,
  fetchPlans,
} from '@/api/payment.api';
import type { Plan, PlanKey, Subscription } from '@/api/types';

const PLAN_FEATURES: Record<PlanKey, { included: string[]; excluded: string[] }> = {
  free: {
    included: ['pricing_limit_projects_free', 'pricing_limit_tasks_free', 'pricing_limit_members_free', 'pricing_feature_kanban'],
    excluded: ['pricing_feature_timeline', 'pricing_feature_perf', 'pricing_feature_ai_pro', 'pricing_feature_eval_leader'],
  },
  pro: {
    included: [
      'pricing_limit_projects_pro',
      'pricing_limit_tasks_pro',
      'pricing_limit_members_pro',
      'pricing_feature_kanban',
      'pricing_feature_timeline',
      'pricing_feature_perf',
      'pricing_feature_eval_leader',
    ],
    excluded: ['pricing_feature_ai_premium', 'pricing_feature_export', 'pricing_feature_support'],
  },
  ultra: {
    included: [
      'pricing_limit_projects_premium',
      'pricing_limit_tasks_premium',
      'pricing_limit_members_premium',
      'pricing_feature_kanban',
      'pricing_feature_timeline',
      'pricing_feature_perf',
      'pricing_feature_eval_leader',
      'pricing_feature_eval_supervisor',
      'pricing_feature_ai_premium',
      'pricing_feature_export',
      'pricing_feature_support',
    ],
    excluded: [],
  },
};

export default function PricingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const { toast } = useToast();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingPlanKey, setProcessingPlanKey] = useState<string | null>(null);
  const [currentSub, setCurrentSub] = useState<Subscription | null>(null);
  const pendingPlanKeyRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    Promise.all([fetchPlans().catch(() => []), fetchMyCurrentSubscription().catch(() => null)])
      .then(([list, sub]) => {
        if (!mounted) return;
        setPlans(list);
        setCurrentSub(sub);
      })
      .finally(() => mounted && setIsLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  // Sau khi user vừa login thành công và được redirect về /pricing,
  // location.state.planKey (hoặc ?planKey=... nếu qua deep-link) chứa gói
  // đã chọn → tự trigger handleUpgrade để user không phải click lại.
  useEffect(() => {
    if (!user) return;
    const statePlanKey = (location.state as { planKey?: string } | null)?.planKey;
    const queryPlanKey = searchParams.get('planKey');
    const planKey = statePlanKey || queryPlanKey;
    if (!planKey) return;
    if (pendingPlanKeyRef.current === planKey) return;
    const plan = plans.find((p) => p.key === planKey);
    if (!plan) return;
    pendingPlanKeyRef.current = planKey;
    handleUpgrade(plan);
    // Clear state/query để không re-trigger khi deps khác thay đổi.
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, plans, location.state, searchParams]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const handleUpgrade = async (plan: Plan) => {
    if (!user) {
      navigate('/login', { state: { from: location, planKey: plan.key } });
      return;
    }
    if (plan.priceVnd <= 0) {
      toast(lang === 'en' ? 'This plan is already active for your account.' : 'Gói này đã có sẵn trên tài khoản của bạn.', 'warning');
      pendingPlanKeyRef.current = null;
      return;
    }
    if (currentSub?.planKey === plan.key) {
      toast(lang === 'en' ? 'You already have this plan.' : 'Bạn đã sử dụng gói này rồi.', 'warning');
      pendingPlanKeyRef.current = null;
      return;
    }

    setProcessingPlanKey(plan.key);
    try {
      const result = await createPayment(plan.key);
      // Redirect to PayOS hosted checkout.
      window.location.href = result.checkoutUrl;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create payment';
      toast(msg, 'error');
      setProcessingPlanKey(null);
      pendingPlanKeyRef.current = null;
    }
  };

  return (
    <div className="min-h-screen bg-canvas transition-colors">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#E8D8CF] bg-surface/85 px-4 backdrop-blur-md sm:px-6 dark:border-slate-700">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#1F1F1F] hover:text-primary dark:text-slate-100"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('back_to_home') || (lang === 'en' ? 'Back' : 'Quay lại')}
        </button>
        <Link
          to={user ? '/app/payments' : '/login'}
          className="text-sm font-medium text-primary hover:underline"
        >
          {lang === 'en' ? 'Payment history' : 'Lịch sử thanh toán'} →
        </Link>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pt-16 pb-10 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
          <Sparkles className="h-3.5 w-3.5" />
          {lang === 'en' ? 'Upgrade your plan' : 'Nâng cấp gói của bạn'}
        </div>
        <h1 className="text-3xl font-black tracking-tight text-[#1F1F1F] sm:text-4xl md:text-5xl dark:text-slate-100">
          {lang === 'en' ? 'Pricing built for every team' : 'Bảng giá phù hợp mọi nhóm'}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-[#5C514A] dark:text-slate-400">
          {lang === 'en'
            ? 'Choose the plan that fits your team. Cancel anytime, no hidden fees.'
            : 'Chọn gói phù hợp với nhóm của bạn. Hủy bất kỳ lúc nào, không phí ẩn.'}
        </p>
        {currentSub && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Check className="h-3.5 w-3.5" />
            {lang === 'en'
              ? `You are on ${currentSub.planName} plan`
              : `Bạn đang dùng gói ${currentSub.planName}`}
            {currentSub.expiresAt && (
              <span className="text-[#5C514A] dark:text-slate-400">
                ·{' '}
                {new Date(currentSub.expiresAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'vi-VN')}
              </span>
            )}
          </p>
        )}
      </section>

      {/* Plans */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => {
              const isPopular = plan.popular;
              const features = PLAN_FEATURES[plan.key] ?? { included: [], excluded: [] };
              const isProcessing = processingPlanKey === plan.key;
              const isCurrent = currentSub?.planKey === plan.key;

              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-3xl border p-7 transition-all duration-300 ${
                    isPopular
                      ? 'border-primary bg-gradient-to-b from-amber-50 to-white shadow-[0_30px_60px_-20px_rgba(217,120,83,0.25)] dark:from-amber-950/30 dark:to-slate-900'
                      : 'border-[#E8D8CF] bg-white dark:border-slate-700 dark:bg-slate-900'
                  }`}
                >
                  {isPopular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-1 text-xs font-extrabold uppercase tracking-wider text-white shadow-lg shadow-orange-500/30">
                      {t('pricing_popular')}
                    </span>
                  )}

                  <div className="mb-6">
                    <h3 className="text-xl font-black uppercase tracking-widest text-[#1F1F1F] dark:text-slate-100">
                      {plan.name}
                    </h3>
                    {plan.description && (
                      <p className="mt-2 min-h-[44px] text-sm font-medium text-[#5C514A] dark:text-slate-400">
                        {plan.description}
                      </p>
                    )}

                    {/* Price */}
                    <div className="mt-5 flex items-baseline gap-1.5">
                      <span className="text-4xl font-black tracking-tight text-[#1F1F1F] dark:text-slate-100">
                        {plan.priceVnd > 0
                          ? new Intl.NumberFormat('vi-VN').format(plan.priceVnd)
                          : '0'}
                      </span>
                      {plan.currency && (
                        <span className="text-base font-bold text-[#5C514A] dark:text-slate-400">
                          {plan.currency}
                        </span>
                      )}
                      <span className="ml-1 text-sm font-semibold text-[#5C514A] dark:text-slate-400">
                        {t('pricing_per_month')}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleUpgrade(plan)}
                    disabled={isProcessing || isCurrent}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${
                      isPopular
                        ? 'bg-primary text-white shadow-md shadow-primary/30 hover:-translate-y-0.5 hover:shadow-primary/40 active:translate-y-0'
                        : 'border border-[#E8D8CF] bg-white text-[#1F1F1F] hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'
                    }`}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {lang === 'en' ? 'Redirecting...' : 'Đang chuyển...'}
                      </>
                    ) : isCurrent ? (
                      <>
                        <Check className="h-4 w-4" />
                        {lang === 'en' ? 'Current plan' : 'Gói hiện tại'}
                      </>
                    ) : plan.priceVnd <= 0 ? (
                      (lang === 'en' ? 'Get started' : 'Bắt đầu')
                    ) : (
                      (lang === 'en' ? 'Subscribe' : 'Đăng ký')
                    )}
                  </button>

                  <hr className="my-6 border-dashed border-[#E8D8CF] opacity-50 dark:border-slate-700" />

                  {/* Features */}
                  <div className="space-y-4">
                    <p className="text-[11px] font-black uppercase tracking-widest text-[#5C514A] dark:text-slate-400">
                      {t('pricing_features_title')}
                    </p>
                    <ul className="space-y-3 text-sm font-medium">
                      {features.included.map((fk) => (
                        <li key={fk} className="flex items-start gap-2.5 text-[#1F1F1F] dark:text-slate-100">
                          <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                            <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-300" />
                          </span>
                          <span>{t(fk as any)}</span>
                        </li>
                      ))}
                      {features.excluded.map((fk) => (
                        <li key={fk} className="flex items-start gap-2.5 text-[#9C8F86] line-through dark:text-slate-500">
                          <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700">
                            <XIcon className="h-3 w-3 text-slate-400" />
                          </span>
                          <span>{t(fk as any)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
