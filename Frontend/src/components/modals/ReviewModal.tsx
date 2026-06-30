import { useEffect, useMemo, useState } from 'react';
import type { ProjectMember, Task } from '@/types';
import { Button, Modal, ProjectMemberAvatar } from '@/components/ui';

interface ReviewModalProps {
  isOpen: boolean;
  task: Task | null;
  projectMembers: ProjectMember[];
  currentUserId?: string;
  onConfirm: (reviewerId: string) => Promise<void>;
  onCancel: () => void;
}

export default function ReviewModal({
  isOpen,
  task,
  projectMembers,
  currentUserId,
  onConfirm,
  onCancel,
}: ReviewModalProps) {
  const [reviewerId, setReviewerId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reviewerOptions = useMemo(
    () => projectMembers.filter((item) => item.member.id !== currentUserId),
    [currentUserId, projectMembers],
  );
  const selectedReviewer = reviewerOptions.find((item) => item.member.id === reviewerId)?.member;

  useEffect(() => {
    if (isOpen) {
      setReviewerId('');
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (!reviewerId) {
      setError('Vui lòng chọn người đánh giá.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onConfirm(reviewerId);
    } catch {
      setError('Không thể gửi đánh giá. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Chọn người đánh giá" size="sm">
      <div className="space-y-4">
        {task && (
          <div className="rounded-xl border border-border bg-surface-muted p-3">
            <p className="text-xs font-semibold uppercase text-ink-muted">Công việc</p>
            <p className="mt-1 text-sm font-bold text-ink">{task.title}</p>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wide text-ink-secondary">
            Reviewer
          </label>
          <select
            value={reviewerId}
            onChange={(event) => {
              setReviewerId(event.target.value);
              setError(null);
            }}
            className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Chọn thành viên</option>
            {reviewerOptions.map((item) => (
              <option key={item.member.id} value={item.member.id}>
                {item.member.fullName}
              </option>
            ))}
          </select>
        </div>

        {selectedReviewer && (
          <div className="flex items-center gap-2 rounded-xl bg-primary-50 p-3">
            <ProjectMemberAvatar
              member={selectedReviewer}
              projectMembers={projectMembers}
              size="sm"
            />
            <span className="text-sm font-semibold text-primary-dark">
              {selectedReviewer.fullName}
            </span>
          </div>
        )}

        {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button type="button" variant="primary" onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Đang gửi...' : 'Gửi đánh giá'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
