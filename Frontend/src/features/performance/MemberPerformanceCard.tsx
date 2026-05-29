import { useState } from 'react';
import type { MemberPerformance, MemberEvaluation } from '@/types';
import { ProjectMemberAvatar } from '@/components/ui';
import Badge from '@/components/ui/Badge';
import { Button } from '@/components/ui';
import Modal from '@/components/ui/Modal';
import ContributionGraph from './ContributionGraph';
import { CheckCircle, Clock, FileUp, MessageSquare, MessageSquarePlus } from 'lucide-react';

function getScoreVariant(score: number): 'success' | 'warning' | 'danger' {
  if (score >= 80) return 'success';
  if (score >= 60) return 'warning';
  return 'danger';
}

interface MemberPerformanceCardProps {
  performance: MemberPerformance;
  evaluation?: MemberEvaluation | null;
  onSaveEvaluation?: (memberId: string, rating: number, feedback: string) => void;
  projectMembers?: import('@/types').ProjectMember[];
}

export default function MemberPerformanceCard({
  performance,
  evaluation,
  onSaveEvaluation,
  projectMembers = [],
}: MemberPerformanceCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [rating, setRating] = useState(evaluation?.rating ?? 0);
  const [feedback, setFeedback] = useState(evaluation?.feedback ?? '');
  const [saved, setSaved] = useState(false);

  const { member, tasksCompleted, tasksInProgress, documentsUploaded, commentsCount, contributions, score } = performance;
  const scoreVariant = getScoreVariant(score);

  const openModal = () => {
    setRating(evaluation?.rating ?? 0);
    setFeedback(evaluation?.feedback ?? '');
    setSaved(false);
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!onSaveEvaluation) return;
    onSaveEvaluation(member.id, Number(rating.toFixed(2)), feedback);
    setSaved(true);
    setTimeout(() => setModalOpen(false), 800);
  };

  return (
    <>
      <article className="rounded-xl border border-border bg-surface p-4">
        {/* Header */}
        <div className="mb-4 flex items-center gap-2.5">
          <ProjectMemberAvatar member={member} projectMembers={projectMembers} size="sm" />
          <div>
            <p className="text-sm font-semibold text-ink">{member.name}</p>
            <p className="text-[11px] text-ink-muted truncate max-w-[120px]">{member.email}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-4 grid grid-cols-4 gap-2">
          {[
            { icon: CheckCircle, label: 'Xong', value: tasksCompleted, color: 'text-success' },
            { icon: Clock, label: 'Đang làm', value: tasksInProgress, color: 'text-warning' },
            { icon: FileUp, label: 'Tài liệu', value: documentsUploaded, color: 'text-primary' },
            { icon: MessageSquare, label: 'Bình luận', value: commentsCount, color: 'text-secondary' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="text-center rounded-lg border border-border bg-canvas px-1 py-2">
              <Icon className={`mx-auto h-3.5 w-3.5 ${color}`} />
              <p className="mt-1 text-sm font-bold text-ink">{value}</p>
              <p className="text-[10px] text-ink-muted">{label}</p>
            </div>
          ))}
        </div>

        {/* Contribution graph */}
        <ContributionGraph contributions={contributions} />

        {/* Evaluation summary */}
        {evaluation?.feedback && (
          <div className="mt-4 rounded-xl border border-primary/20 bg-primary-50 px-4 py-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-xs font-semibold text-primary">Nhận xét đã đánh giá</p>
              {evaluation.rating > 0 && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-white">
                  {evaluation.rating}/10
                </span>
              )}
            </div>
            <p className="text-sm text-ink-secondary leading-relaxed">{evaluation.feedback}</p>
          </div>
        )}

        {/* Evaluate button */}
        {onSaveEvaluation && (
          <Button
            variant={evaluation ? 'secondary' : 'primary'}
            size="sm"
            className="mt-3 w-full justify-center text-xs"
            onClick={openModal}
          >
            <MessageSquarePlus className="h-3.5 w-3.5 mr-1.5" />
            {evaluation ? 'Cập nhật đánh giá' : 'Đánh giá thành viên'}
          </Button>
        )}
      </article>

      {/* Evaluation modal */}
      {onSaveEvaluation && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={`Đánh giá: ${member.name}`}
          size="sm"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-canvas px-4 py-3">
              <ProjectMemberAvatar member={member} projectMembers={projectMembers} size="md" />
              <div>
                <p className="font-semibold text-ink">{member.name}</p>
                <p className="text-xs text-ink-muted">{member.email}</p>
              </div>
              <div className="ml-auto text-right">
                <Badge variant={scoreVariant}>{score} điểm</Badge>
                <p className="mt-1 text-[10px] text-ink-muted">Điểm hệ thống</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-ink">Điểm đánh giá (0 – 10)</label>
              <input
                type="number"
                min={0}
                max={10}
                step={0.1}
                value={rating || ''}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setRating(Number.isNaN(v) ? 0 : Math.min(10, Math.max(0, v)));
                }}
                placeholder="Nhập điểm..."
                className="ez-input w-full"
              />
              <div className="flex gap-1 mt-1">
                {[5, 6, 7, 8, 9, 10].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    className={`flex-1 rounded-lg border py-1.5 text-xs font-medium transition-colors ${
                      rating === n
                        ? 'border-primary bg-primary-50 text-primary'
                        : 'border-border text-ink-muted hover:border-primary/30'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-ink">Nhận xét</label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Nhận xét về thành viên này (điểm mạnh, điểm cần cải thiện...)"
                rows={4}
                className="ez-input w-full resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="secondary" size="sm" className="flex-1 justify-center" onClick={() => setModalOpen(false)}>
                Hủy
              </Button>
              <Button variant="primary" size="sm" className="flex-1 justify-center" onClick={handleSave}>
                {saved ? 'Đã lưu!' : 'Lưu đánh giá'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
