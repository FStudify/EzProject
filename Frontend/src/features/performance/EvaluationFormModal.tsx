/**
 * ============================================================
 * EvaluationFormModal — modal form for §7.8 / §7.9 evaluations
 * ============================================================
 * Five criteria scored 0-20 → 100 total. Built on top of the
 * existing Modal/Button UI primitives and shares styles with
 * the rest of the design system.
 */

import { useEffect, useMemo, useState } from 'react';
import { Save, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui';
import { Modal, Button } from '@/components/ui';
import {
  upsertLeaderEvaluation,
  upsertSupervisorEvaluation,
} from '@/api/member.api';
import type { DetailedEvaluation } from '@/api/types';

interface EvaluationFormModalProps {
  kind: 'leader' | 'supervisor';
  projectId: string;
  memberId: string;
  memberName: string;
  initial: DetailedEvaluation | null;
  onClose: () => void;
  onSaved: (next: DetailedEvaluation) => void;
}

type Scores = Pick<
  DetailedEvaluation,
  'responsibility' | 'communication' | 'initiative' | 'teamwork' | 'qualityOfWork'
>;

const CRITERIA: Array<{
  key: keyof Scores;
  labelKey:
    | 'criteria_responsibility'
    | 'criteria_communication'
    | 'criteria_initiative'
    | 'criteria_teamwork'
    | 'criteria_quality_of_work';
}> = [
  { key: 'responsibility', labelKey: 'criteria_responsibility' },
  { key: 'communication', labelKey: 'criteria_communication' },
  { key: 'initiative', labelKey: 'criteria_initiative' },
  { key: 'teamwork', labelKey: 'criteria_teamwork' },
  { key: 'qualityOfWork', labelKey: 'criteria_quality_of_work' },
];

const EMPTY_SCORES: Scores = {
  responsibility: 0,
  communication: 0,
  initiative: 0,
  teamwork: 0,
  qualityOfWork: 0,
};

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(20, Math.round(value)));
}

export default function EvaluationFormModal({
  kind,
  projectId,
  memberId,
  memberName,
  initial,
  onClose,
  onSaved,
}: EvaluationFormModalProps) {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [scores, setScores] = useState<Scores>(() => {
    if (!initial) return EMPTY_SCORES;
    return {
      responsibility: clampScore(initial.responsibility),
      communication: clampScore(initial.communication),
      initiative: clampScore(initial.initiative),
      teamwork: clampScore(initial.teamwork),
      qualityOfWork: clampScore(initial.qualityOfWork),
    };
  });
  const [comment, setComment] = useState<string>(initial?.comment ?? '');
  const [status, setStatus] = useState<'PENDING' | 'SUBMITTED'>(initial?.status ?? 'SUBMITTED');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(
    () => Object.values(scores).reduce((sum, v) => sum + (Number.isFinite(v) ? v : 0), 0),
    [scores],
  );

  const isValid = useMemo(() => {
    return Object.values(scores).every((v) => Number.isFinite(v) && v >= 0 && v <= 20);
  }, [scores]);

  // Reset state when modal opens
  useEffect(() => {
    if (initial) {
      setScores({
        responsibility: clampScore(initial.responsibility),
        communication: clampScore(initial.communication),
        initiative: clampScore(initial.initiative),
        teamwork: clampScore(initial.teamwork),
        qualityOfWork: clampScore(initial.qualityOfWork),
      });
      setComment(initial.comment ?? '');
      setStatus(initial.status ?? 'SUBMITTED');
    }
  }, [initial]);

  const handleSubmit = async () => {
    if (!isValid) {
      setError(t('evaluation_invalid_score'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = { ...scores, comment: comment.trim() || undefined, status };
      const next =
        kind === 'leader'
          ? await upsertLeaderEvaluation(projectId, memberId, payload)
          : await upsertSupervisorEvaluation(projectId, memberId, payload);
      toast(t('evaluation_saved'), 'success');
      onSaved(next);
    } catch {
      toast(t('evaluation_save_failed'), 'error');
      setError(t('evaluation_save_failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const title =
    kind === 'leader' ? t('evaluation_form_title_leader') : t('evaluation_form_title_supervisor');
  const subtitle =
    kind === 'leader'
      ? t('evaluation_form_subtitle_leader')
      : t('evaluation_form_subtitle_supervisor');

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={title}
      size="md"
      bodyScrollable
    >
      <div className="space-y-5">
        <div>
          <p className="text-sm text-ink-secondary">{subtitle}</p>
          <p className="mt-1 text-xs text-ink-muted">
            {memberName} • {t('evaluation_max_total')}
          </p>
        </div>

        <div className="space-y-3">
          {CRITERIA.map((c) => {
            const value = scores[c.key] ?? 0;
            return (
              <div
                key={c.key}
                className="rounded-xl border border-border bg-canvas px-3 py-2.5"
              >
                <div className="flex items-center justify-between">
                  <label
                    htmlFor={`criterion-${c.key}`}
                    className="text-xs font-medium text-ink-secondary"
                  >
                    {t(c.labelKey)}
                  </label>
                  <span className="text-[11px] text-ink-muted">{t('evaluation_max_points')}</span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    id={`criterion-${c.key}`}
                    type="range"
                    min={0}
                    max={20}
                    step={1}
                    value={value}
                    onChange={(e) =>
                      setScores((s) => ({ ...s, [c.key]: clampScore(Number(e.target.value)) }))
                    }
                    className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-surface-muted accent-primary"
                    aria-label={t(c.labelKey)}
                  />
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={value}
                    onChange={(e) =>
                      setScores((s) => ({ ...s, [c.key]: clampScore(Number(e.target.value)) }))
                    }
                    className="ez-input h-9 w-16 px-2 text-center text-sm"
                    aria-label={`${t(c.labelKey)} (0-20)`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border bg-canvas px-3 py-2.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            {t('evaluation_total')}
          </p>
          <p className="text-lg font-bold tabular-nums text-ink">
            {total}
            <span className="ml-1 text-xs font-medium text-ink-muted">/ 100</span>
          </p>
        </div>

        <div>
          <label
            htmlFor="evaluation-comment"
            className="mb-1 block text-xs font-medium text-ink-secondary"
          >
            {t('evaluation_comment')}
          </label>
          <textarea
            id="evaluation-comment"
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t('evaluation_comment_placeholder')}
            className="ez-input w-full px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label
            htmlFor="evaluation-status"
            className="mb-1 block text-xs font-medium text-ink-secondary"
          >
            {t('evaluation_status')}
          </label>
          <select
            id="evaluation-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'PENDING' | 'SUBMITTED')}
            className="ez-input h-9 !py-0 w-full px-3 text-sm"
          >
            <option value="SUBMITTED">{t('evaluation_status_submitted')}</option>
            <option value="PENDING">{t('evaluation_status_pending')}</option>
          </select>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            {t('close')}
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={submitting || !isValid}
          >
            <Save className="mr-1 inline h-4 w-4" />
            {submitting ? t('loading') : t('save_evaluation')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}