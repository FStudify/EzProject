/**
 * DeclineMeetingModal — capture optional reason when a user declines an invitation.
 */
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button, Modal } from '@/components/ui';

interface DeclineMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export default function DeclineMeetingModal({ isOpen, onClose, onConfirm }: DeclineMeetingModalProps) {
  const { t } = useLanguage();
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    onConfirm(reason.trim());
    setReason('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('decline_meeting')}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600">{t('decline_modal_text')}</p>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">{t('reason')}</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('reason_placeholder')}
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{t('cancel')}</Button>
          <Button variant="danger" onClick={handleSubmit}>{t('confirm_decline')}</Button>
        </div>
      </div>
    </Modal>
  );
}
