import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Modal, Button } from '@/components/ui';
import type { Plan, Subscription } from '@/api/types';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentSubscription: Subscription | null;
  targetPlan: Plan | null;
  isCreating: boolean;
}

export default function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  currentSubscription,
  targetPlan,
  isCreating,
}: ConfirmationDialogProps) {
  const { lang } = useLanguage();

  const details = useMemo(() => {
    if (!targetPlan) return null;
    const oldPlanKey = currentSubscription?.planKey || 'free';
    const newPlanKey = targetPlan.key;

    let remainingDays = 0;
    if (currentSubscription?.expiresAt) {
      const diff = new Date(currentSubscription.expiresAt).getTime() - new Date().getTime();
      remainingDays = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    let action = 'NEW';
    if (oldPlanKey === newPlanKey) action = 'RENEW';
    else if (oldPlanKey !== 'free') action = 'UPGRADE';

    return { oldPlanKey, newPlanKey, remainingDays, action };
  }, [currentSubscription, targetPlan]);

  if (!isOpen || !targetPlan || !details) return null;

  const { remainingDays, action } = details;

  const renderContent = () => {
    if (action === 'RENEW') {
      return (
        <div className="space-y-4">
          <div className="rounded-xl bg-orange-50 p-4 border border-orange-200">
            <p className="text-sm text-orange-800 flex items-start gap-2">
              <Clock className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
              <span>
                {lang === 'en'
                  ? `You still have ${remainingDays} days left on your ${targetPlan.name} plan.`
                  : `Bạn vẫn còn ${remainingDays} ngày sử dụng gói ${targetPlan.name}.`}
              </span>
            </p>
          </div>
          <div className="text-sm text-gray-700">
            <p className="mb-2 font-semibold">{lang === 'en' ? 'If you continue:' : 'Nếu tiếp tục thanh toán:'}</p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>{lang === 'en' ? `The ${targetPlan.name} plan will be reactivated from the time of payment.` : `Gói ${targetPlan.name} sẽ được kích hoạt lại từ thời điểm thanh toán.`}</span>
              </li>
              <li className="flex items-center gap-2 text-red-600 font-medium">
                <AlertCircle className="w-4 h-4" />
                <span>{lang === 'en' ? 'Remaining time will NOT be carried over.' : 'Thời gian còn lại sẽ KHÔNG được bảo lưu.'}</span>
              </li>
            </ul>
          </div>
        </div>
      );
    }

    if (action === 'UPGRADE') {
      return (
        <div className="space-y-4">
          <div className="rounded-xl bg-orange-50 p-4 border border-orange-200">
            <p className="text-sm text-orange-800 flex items-start gap-2">
              <Clock className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
              <span>
                {lang === 'en'
                  ? `You still have ${remainingDays} days left on your ${currentSubscription?.planName} plan.`
                  : `Bạn vẫn còn ${remainingDays} ngày sử dụng gói ${currentSubscription?.planName}.`}
              </span>
            </p>
          </div>
          <div className="text-sm text-gray-700">
            <p className="mb-2 font-semibold">{lang === 'en' ? `If you upgrade to ${targetPlan.name}:` : `Nếu nâng cấp lên ${targetPlan.name}:`}</p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>{lang === 'en' ? `${targetPlan.name} will be activated immediately.` : `${targetPlan.name} sẽ được kích hoạt ngay.`}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>{lang === 'en' ? `${currentSubscription?.planName} will end.` : `Gói ${currentSubscription?.planName} sẽ kết thúc.`}</span>
              </li>
              <li className="flex items-center gap-2 text-red-600 font-medium mt-3 border-t pt-3">
                <AlertCircle className="w-4 h-4" />
                <span>{lang === 'en' ? 'Remaining time will NOT be carried over.' : '⚠ Thời gian còn lại sẽ không được bảo lưu.'}</span>
              </li>
            </ul>
          </div>
        </div>
      );
    }

    // Default NEW action (Free -> Pro / Ultra, Expired -> Pro / Ultra)
    return (
      <div className="space-y-4">
        <div className="text-sm text-gray-700">
          <p className="mb-2 font-semibold">{lang === 'en' ? `After payment:` : `Sau khi thanh toán:`}</p>
          <ul className="space-y-2">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span>{lang === 'en' ? `${targetPlan.name} will be activated immediately.` : `${targetPlan.name} sẽ được kích hoạt ngay.`}</span>
            </li>
          </ul>
        </div>
      </div>
    );
  };

  const isUpgrading = action === 'UPGRADE';
  const title = lang === 'en' ? 'Confirm Payment' : 'Xác nhận thanh toán';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center justify-center py-4 bg-gray-50 rounded-xl border border-gray-100">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">
            {lang === 'en' ? 'Target Plan' : 'Gói chuẩn bị mua'}
          </span>
          <span className="text-xl font-bold bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">
            {targetPlan.name}
          </span>
          <span className="text-lg font-bold mt-1 text-gray-800">
            {targetPlan.priceVnd.toLocaleString('vi-VN')} đ
          </span>
        </div>

        {renderContent()}

        <p className="text-sm font-semibold text-center text-gray-800">
          {action === 'RENEW'
            ? (lang === 'en' ? 'Are you sure you want to proceed?' : 'Bạn có chắc chắn muốn tiếp tục không?')
            : isUpgrading
            ? (lang === 'en' ? 'Are you sure you want to upgrade?' : 'Bạn có chắc chắn muốn nâng cấp?')
            : (lang === 'en' ? 'Proceed to payment?' : 'Tiến hành thanh toán?')}
        </p>

        <div className="flex gap-3 mt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={isCreating}>
            {lang === 'en' ? 'Cancel' : 'Hủy'}
          </Button>
          <Button variant="primary" className="flex-1" onClick={onConfirm} disabled={isCreating}>
            {isUpgrading
              ? (lang === 'en' ? 'Upgrade' : 'Nâng cấp')
              : (lang === 'en' ? 'Proceed to Pay' : 'Thanh toán')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
