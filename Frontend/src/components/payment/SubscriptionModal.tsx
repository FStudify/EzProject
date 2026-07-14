import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Modal, Button, useToast } from '@/components/ui';
import { fetchPlans, fetchMyCurrentSubscription, createPayment } from '@/api/payment.api';
import type { Plan, Subscription } from '@/api/types';
import { CheckCircle2, Star, Zap, Crown } from 'lucide-react';
import ConfirmationDialog from './ConfirmationDialog';
import { X } from 'lucide-react';

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

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SubscriptionModal({ isOpen, onClose }: SubscriptionModalProps) {
  const { lang } = useLanguage();
  const { toast } = useToast();
  
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      Promise.all([fetchPlans(), fetchMyCurrentSubscription()])
        .then(([plansData, subData]) => {
          setPlans(plansData);
          setCurrentSubscription(subData);
        })
        .catch(() => {
          toast(lang === 'en' ? 'Failed to load plans' : 'Lỗi tải danh sách gói', 'error');
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      // Reset state when closed
      setSelectedPlan(null);
      setIsConfirmOpen(false);
      setIsCreatingPayment(false);
    }
  }, [isOpen, lang, toast]);

  const handleSelectPlan = (plan: Plan) => {
    const currentPlanKey = currentSubscription?.planKey || 'free';
    
    // Check downgrade rule: ULTRA -> PRO is blocked
    if (currentPlanKey === 'ultra' && plan.key === 'pro') {
      toast(
        lang === 'en' 
          ? 'You are on ULTRA plan. Cannot downgrade.' 
          : 'Bạn đang sử dụng gói ULTRA. Không thể mua gói thấp hơn.',
        'error'
      );
      return;
    }

    // Determine if we need confirmation dialog
    if (currentPlanKey !== 'free') {
      // Show confirmation for PRO->PRO, ULTRA->ULTRA, PRO->ULTRA
      setSelectedPlan(plan);
      setIsConfirmOpen(true);
    } else {
      // FREE -> PRO/ULTRA can skip to payment if you want, but requirement says "Nếu cần xác nhận -> Hiện Confirmation". 
      // Let's just show confirmation for all for consistency, or skip. Requirement says:
      // CASE 1: FREE -> PRO (Cho phép mua ngay)
      // CASE 2: FREE -> ULTRA (Cho phép mua ngay)
      // Actually, showing the dialog with "Sau khi thanh toán: ULTRA kích hoạt ngay" is good UX.
      setSelectedPlan(plan);
      setIsConfirmOpen(true);
    }
  };

  const handleConfirmPayment = async (voucherCode?: string) => {
    if (!selectedPlan) return;
    try {
      setIsCreatingPayment(true);
      const result = await createPayment(selectedPlan.key, voucherCode);
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        throw new Error('No checkout URL');
      }
    } catch (err: any) {
      toast(err.message || (lang === 'en' ? 'Payment failed' : 'Thanh toán thất bại'), 'error');
      setIsCreatingPayment(false);
    }
  };

  const currentPlanKey = currentSubscription?.planKey || 'free';

  const renderPlanCard = (plan: Plan) => {
    const isCurrent = currentPlanKey === plan.key;
    let buttonLabel = '';
    let isDisabled = false;

    if (currentPlanKey === 'free') {
      if (plan.key === 'free') {
        buttonLabel = lang === 'en' ? 'Current Plan' : 'Gói hiện tại';
        isDisabled = true;
      } else {
        buttonLabel = lang === 'en' ? 'Upgrade' : 'Nâng cấp';
      }
    } else if (currentPlanKey === 'pro') {
      if (plan.key === 'free') {
        return null; // hide free
      } else if (plan.key === 'pro') {
        buttonLabel = lang === 'en' ? 'Renew PRO' : 'Gia hạn PRO';
      } else if (plan.key === 'ultra') {
        buttonLabel = lang === 'en' ? 'Upgrade ULTRA' : 'Nâng cấp ULTRA';
      }
    } else if (currentPlanKey === 'ultra') {
      if (plan.key === 'ultra') {
        buttonLabel = lang === 'en' ? 'Renew ULTRA' : 'Gia hạn ULTRA';
      } else {
        return null; // hide free and pro
      }
    }

    // If it's a paid plan that isn't returned by the backend yet, just don't show it (handled by mapping `plans` below).
    // Let's find some dummy features to show since the API `Plan` doesn't include a `features` array.
    const features = HARDCODED_FEATURES[plan.key as keyof typeof HARDCODED_FEATURES] || [];

    const getIcon = () => {
      if (plan.key === 'ultra') return <Crown className="w-5 h-5 text-orange-500" />;
      if (plan.key === 'pro') return <Zap className="w-5 h-5 text-purple-500" />;
      return <Star className="w-5 h-5 text-gray-500" />;
    };

    return (
      <div 
        key={plan.id} 
        className={`relative flex flex-col p-5 rounded-2xl border-2 transition-all ${
          plan.popular ? 'border-orange-500 bg-orange-50/30' : 'border-gray-200 bg-white'
        } ${!isDisabled && 'hover:shadow-lg hover:-translate-y-1'}`}
      >


        
        <div className="flex items-center gap-2 mb-4">
          {getIcon()}
          <h3 className="text-xl font-bold uppercase">{plan.name}</h3>
        </div>

        <div className="mb-6">
          {plan.currentPrice !== undefined && plan.currentPrice < plan.priceVnd ? (
            <div className="flex flex-col">
              <span className="text-3xl font-extrabold text-orange-600">
                {plan.currentPrice.toLocaleString('vi-VN')} đ
              </span>
              <div className="flex items-center gap-1">
                <span className="text-sm font-semibold line-through text-gray-400">
                  {plan.priceVnd.toLocaleString('vi-VN')} đ
                </span>
                <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold">
                  {plan.packageSaleActive 
                    ? (plan.saleType === 'percent' ? `-${plan.saleValue}%` : `-${plan.saleValue?.toLocaleString('vi-VN')} đ`) 
                    : (plan.promotion?.discountType === 'PERCENT' ? `-${plan.promotion.discountValue}%` : `-${plan.promotion?.discountValue.toLocaleString('vi-VN')} đ`)}
                </span>
              </div>
            </div>
          ) : (
            <span className="text-3xl font-extrabold text-gray-900">
              {plan.priceVnd.toLocaleString('vi-VN')} đ
            </span>
          )}
          <span className="text-gray-500 text-sm">
            / {plan.durationDays ? `${plan.durationDays} ${lang === 'en' ? 'days' : 'ngày'}` : (lang === 'en' ? 'forever' : 'vĩnh viễn')}
          </span>
        </div>

        <ul className="flex-1 space-y-3 mb-6">
          {features.map((f, i) => (
            <li key={i} className={`flex items-start gap-2 text-sm ${f.included ? 'text-gray-700' : 'text-gray-400 line-through'}`}>
              {f.included ? (
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
              ) : (
                <X className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              )}
              <span>{lang === 'en' ? f.textEn : f.textVi}</span>
            </li>
          ))}
        </ul>

        <Button
          variant={isCurrent ? 'secondary' : plan.popular ? 'primary' : 'ghost'}
          className="w-full font-bold"
          disabled={isDisabled}
          onClick={() => handleSelectPlan(plan)}
        >
          {buttonLabel}
        </Button>
      </div>
    );
  };

  const title = lang === 'en' ? 'Choose Your Plan' : 'Chọn gói dịch vụ';

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {currentSubscription && currentPlanKey !== 'free' && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-800 font-medium">
                    {lang === 'en' ? 'Current Plan:' : 'Gói hiện tại:'} <span className="font-bold uppercase">{currentSubscription.planName}</span>
                  </p>
                  <p className="text-xs text-orange-600 mt-1">
                    {lang === 'en' ? 'Expires on:' : 'Ngày hết hạn:'} {new Date(currentSubscription.expiresAt!).toLocaleDateString('vi-VN')}
                  </p>
                </div>
                <div className="px-3 py-1 bg-white rounded-lg shadow-sm border border-orange-100 text-sm font-bold text-orange-600">
                  {lang === 'en' ? 'ACTIVE' : 'ĐANG SỬ DỤNG'}
                </div>
              </div>
            )}
            
            <div className={`grid gap-6 ${plans.length === 3 && currentPlanKey === 'free' ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
              {plans.map(renderPlanCard)}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmationDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmPayment}
        currentSubscription={currentSubscription}
        targetPlan={selectedPlan}
        isCreating={isCreatingPayment}
      />
    </>
  );
}
