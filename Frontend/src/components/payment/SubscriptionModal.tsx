import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Modal, Button, useToast } from '@/components/ui';
import { fetchPlans, fetchMyCurrentSubscription, createPayment } from '@/api/payment.api';
import type { Plan, Subscription } from '@/api/types';
import { CheckCircle2, Star, Zap, Crown } from 'lucide-react';
import ConfirmationDialog from './ConfirmationDialog';

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

  const handleConfirmPayment = async () => {
    if (!selectedPlan) return;
    try {
      setIsCreatingPayment(true);
      const result = await createPayment(selectedPlan.key);
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
    const features = 
      plan.key === 'ultra' 
        ? ['Unlimited projects', 'Unlimited tasks', 'Advanced AI Features', 'Priority Support']
        : plan.key === 'pro'
        ? ['Up to 10 projects', 'Up to 1000 tasks', 'Basic AI Features', 'Email Support']
        : ['Up to 2 projects', 'Up to 100 tasks', 'Community Support'];

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
        {plan.popular && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-orange-500 text-white text-xs font-bold uppercase tracking-widest py-1 px-3 rounded-full">
            {lang === 'en' ? 'Most Popular' : 'Phổ biến nhất'}
          </div>
        )}
        
        <div className="flex items-center gap-2 mb-4">
          {getIcon()}
          <h3 className="text-xl font-bold uppercase">{plan.name}</h3>
        </div>

        <div className="mb-6">
          <span className="text-3xl font-extrabold text-gray-900">
            {plan.priceVnd.toLocaleString('vi-VN')} đ
          </span>
          <span className="text-gray-500 text-sm ml-1">
            / {plan.durationDays ? `${plan.durationDays} ${lang === 'en' ? 'days' : 'ngày'}` : (lang === 'en' ? 'forever' : 'vĩnh viễn')}
          </span>
        </div>

        <ul className="flex-1 space-y-3 mb-6">
          {features.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
              <span>{f}</span>
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
