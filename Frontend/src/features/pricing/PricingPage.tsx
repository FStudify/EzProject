import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Check,
  Loader2,
  Sparkles,
  X as XIcon,
  ArrowLeft,
  X,
  Crown,
  Zap,
  Star,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui';
import {
  fetchMyCurrentSubscription,
  fetchPlans,
} from '@/api/payment.api';
import type { Plan, Subscription } from '@/api/types';

import SubscriptionModal from '@/components/payment/SubscriptionModal';

const HARDCODED_FEATURES = {
  free: [
    { textVi: "1 dự án hoạt động", textEn: "1 active project", included: true },
    { textVi: "Tối đa 5 thành viên/dự án", textEn: "Up to 5 members/project", included: true },
    { textVi: "Bảng Kanban, Task, Comment", textEn: "Kanban board, Task, Comment", included: true },
    { textVi: "Chat nhóm dự án (Group & General)", textEn: "Project group chat (Group & General)", included: true },
    { textVi: "AI Generate: 2 dự án/tháng", textEn: "AI Generate: 2 projects/month", included: true },
    { textVi: "AI Chat Assistant: 10 tin/ngày", textEn: "AI Chat Assistant: 10 msgs/day", included: true },
    { textVi: "AI Generate Task: 5 lần/tháng", textEn: "AI Generate Task: 5 times/month", included: true },
    { textVi: "Direct Message (Giới hạn)", textEn: "Direct Message (Limited)", included: true },
    { textVi: "Họp Video: 2 cuộc họp/tháng", textEn: "Video Meeting: 2 meetings/month", included: true },
    { textVi: "Đánh giá chéo thành viên", textEn: "Cross-evaluate members", included: false },
    { textVi: "Thống kê chi tiết & Xuất báo cáo", textEn: "Detailed statistics & Report export", included: false },
    { textVi: "Lưu trữ Meeting Summary vĩnh viễn", textEn: "Permanent Meeting Summary storage", included: false },
    { textVi: "Mời qua Email & Custom Link", textEn: "Invite via Email & Custom Link", included: false },
  ],
  pro: [
    { textVi: "5 dự án hoạt động", textEn: "5 active projects", included: true },
    { textVi: "Tối đa 20 thành viên/dự án", textEn: "Up to 20 members/project", included: true },
    { textVi: "Bảng Kanban, Task, Comment", textEn: "Kanban board, Task, Comment", included: true },
    { textVi: "Chat nhóm dự án (Group & General)", textEn: "Project group chat (Group & General)", included: true },
    { textVi: "AI Generate: 15 dự án/tháng", textEn: "AI Generate: 15 projects/month", included: true },
    { textVi: "AI Chat Assistant: 100 tin/ngày", textEn: "AI Chat Assistant: 100 msgs/day", included: true },
    { textVi: "AI Generate Task: 50 lần/ngày", textEn: "AI Generate Task: 50 times/day", included: true },
    { textVi: "Direct Message (Không giới hạn)", textEn: "Direct Message (Unlimited)", included: true },
    { textVi: "Họp Video (Không giới hạn)", textEn: "Video Meeting (Unlimited)", included: true },
    { textVi: "Đánh giá chéo thành viên", textEn: "Cross-evaluate members", included: true },
    { textVi: "Thống kê chi tiết & Xuất báo cáo", textEn: "Detailed statistics & Report export", included: false },
    { textVi: "Lưu trữ Meeting Summary vĩnh viễn", textEn: "Permanent Meeting Summary storage", included: false },
    { textVi: "Mời qua Email & Custom Link", textEn: "Invite via Email & Custom Link", included: true },
  ],
  ultra: [
    { textVi: "Không giới hạn dự án", textEn: "Unlimited projects", included: true },
    { textVi: "Không giới hạn thành viên", textEn: "Unlimited members", included: true },
    { textVi: "Bảng Kanban, Task, Comment", textEn: "Kanban board, Task, Comment", included: true },
    { textVi: "Chat nhóm dự án (Group & General)", textEn: "Project group chat (Group & General)", included: true },
    { textVi: "AI Generate: 50 dự án/tháng", textEn: "AI Generate: 50 projects/month", included: true },
    { textVi: "AI Chat Assistant: Không giới hạn", textEn: "AI Chat Assistant: Unlimited", included: true },
    { textVi: "AI Generate Task: Không giới hạn", textEn: "AI Generate Task: Unlimited", included: true },
    { textVi: "Direct Message (Không giới hạn)", textEn: "Direct Message (Unlimited)", included: true },
    { textVi: "Họp Video (Không giới hạn)", textEn: "Video Meeting (Unlimited)", included: true },
    { textVi: "Đánh giá chéo thành viên", textEn: "Cross-evaluate members", included: true },
    { textVi: "Thống kê chi tiết & Xuất báo cáo", textEn: "Detailed statistics & Report export", included: true },
    { textVi: "Lưu trữ Meeting Summary vĩnh viễn", textEn: "Permanent Meeting Summary storage", included: true },
    { textVi: "Mời qua Email & Custom Link", textEn: "Invite via Email & Custom Link", included: true },
  ],
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
  const [isModalOpen, setIsModalOpen] = useState(false);

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
    setIsModalOpen(true);
    setProcessingPlanKey(null);
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


                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      {plan.key === 'ultra' ? <Crown className="w-6 h-6 text-orange-500" /> : plan.key === 'pro' ? <Zap className="w-6 h-6 text-purple-500" /> : <Star className="w-6 h-6 text-gray-400" />}
                      <h3 className="text-xl font-black uppercase tracking-widest text-[#1F1F1F] dark:text-slate-100 m-0">
                        {plan.name}
                      </h3>
                    </div>
                    {plan.description && (
                      <p className="mt-2 min-h-[44px] text-sm font-medium text-[#5C514A] dark:text-slate-400">
                        {plan.description}
                      </p>
                    )}

                    {/* Price */}
                    <div className="mt-5 flex items-baseline gap-1.5">
                      {plan.currentPrice !== undefined && plan.currentPrice < plan.priceVnd ? (
                        <div className="flex flex-col">
                          <span className="text-4xl font-black tracking-tight text-orange-600 dark:text-orange-500">
                            {new Intl.NumberFormat('vi-VN').format(plan.currentPrice)}
                          </span>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-sm font-semibold line-through text-gray-400">
                              {new Intl.NumberFormat('vi-VN').format(plan.priceVnd)}
                            </span>
                            {plan.packageSaleActive ? (
                              <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold">
                                {plan.saleType === 'percent' ? `-${plan.saleValue}%` : `-${new Intl.NumberFormat('vi-VN').format(plan.saleValue!)} đ`}
                              </span>
                            ) : plan.promotion ? (
                              <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold">
                                {plan.promotion.discountType === 'PERCENT' ? `-${plan.promotion.discountValue}%` : `-${new Intl.NumberFormat('vi-VN').format(plan.promotion.discountValue)} đ`}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <span className="text-4xl font-black tracking-tight text-[#1F1F1F] dark:text-slate-100">
                          {plan.priceVnd > 0 ? new Intl.NumberFormat('vi-VN').format(plan.priceVnd) : '0'}
                        </span>
                      )}

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
                        {lang === 'en' ? 'Loading...' : 'Đang xử lý...'}
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
                    <ul className="space-y-4">
                      {(HARDCODED_FEATURES[plan.key as keyof typeof HARDCODED_FEATURES] || []).map((feature, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                              feature.included
                                ? isPopular
                                  ? 'bg-amber-100 dark:bg-amber-900/40'
                                  : 'bg-emerald-100 dark:bg-emerald-900/30'
                                : 'bg-gray-100 dark:bg-gray-800'
                            }`}
                          >
                            {feature.included ? (
                              <Check
                                className={`h-3.5 w-3.5 ${
                                  isPopular
                                    ? 'text-orange-600 dark:text-orange-400'
                                    : 'text-emerald-600 dark:text-emerald-400'
                                }`}
                              />
                            ) : (
                              <X className="h-3.5 w-3.5 text-gray-400" />
                            )}
                          </div>
                          <span
                            className={`text-sm font-medium leading-relaxed ${
                              feature.included
                                ? 'text-[#3E2A20] dark:text-slate-300'
                                : 'text-gray-400 line-through'
                            }`}
                          >
                            {lang === 'en' ? feature.textEn : feature.textVi}
                          </span>
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
      
      <SubscriptionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
