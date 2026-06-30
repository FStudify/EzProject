import { useEffect, useState } from 'react';
import type { Task } from '@/types';
import { Button, Modal } from '@/components/ui';

interface RejectReasonModalProps {
  isOpen: boolean;
  task: Task | null;
  onConfirm: (reason: string) => Promise<void>;
  onCancel: () => void;
}

export default function RejectReasonModal({
  isOpen,
  task,
  onConfirm,
  onCancel,
}: RejectReasonModalProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    const value = reason.trim();
    if (value.length < 10) {
      setError('Lý do từ chối phải có ít nhất 10 ký tự.');
      return;
    }
    if (value.length > 500) {
      setError('Lý do từ chối không được vượt quá 500 ký tự.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onConfirm(value);
    } catch {
      setError('Không thể từ chối công việc. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Lý do từ chối" size="sm">
      <div className="space-y-4">
        {task && (
          <div className="rounded-xl border border-border bg-surface-muted p-3">
            <p className="text-xs font-semibold uppercase text-ink-muted">Công việc</p>
            <p className="mt-1 text-sm font-bold text-ink">{task.title}</p>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wide text-ink-secondary">
            Nội dung phản hồi
          </label>
          <textarea
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              setError(null);
            }}
            maxLength={500}
            rows={5}
            className="w-full resize-none rounded-xl border border-border bg-white px-3 py-2 text-sm leading-relaxed text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="Nhập lý do cần chỉnh sửa..."
          />
          <div className="flex justify-between text-xs">
            <span className="text-ink-muted">Tối thiểu 10 ký tự</span>
            <span className={reason.length > 500 ? 'text-rose-600' : 'text-ink-muted'}>
              {reason.length}/500
            </span>
          </div>
        </div>

        {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button type="button" variant="danger" onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Đang gửi...' : 'Gửi'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
