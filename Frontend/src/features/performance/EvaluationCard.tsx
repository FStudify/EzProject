/**
 * ============================================================
 * EvaluationCard — read-only display of a DetailedEvaluation
 * ============================================================
 * Shows criteria bars, total, comment, evaluator info, date,
 * and status. Used by EvaluationSection.
 */

import { useLanguage } from '@/contexts/LanguageContext';
import type { DetailedEvaluation } from '@/api/types';

interface EvaluationCardProps {
  evaluation: DetailedEvaluation;
  kind: 'leader' | 'supervisor';
}

const CRITERIA: Array<{
  key: keyof Pick<
    DetailedEvaluation,
    'responsibility' | 'communication' | 'initiative' | 'teamwork' | 'qualityOfWork'
  >;
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

export default function EvaluationCard({ evaluation, kind }: EvaluationCardProps) {
  const { t, lang } = useLanguage();

  const submitted =
    evaluation.status === 'SUBMITTED' ||
    (typeof evaluation.evaluationDate === 'string' &&
      evaluation.evaluationDate !== '');

  const statusKey = submitted ? 'evaluation_status_submitted' : 'evaluation_status_pending';
  const statusClass =
    kind === 'leader'
      ? 'bg-secondary/10 text-secondary'
      : 'bg-success/10 text-success';

  return (
    <div className="space-y-4">
      {/* Criteria bars */}
      <ul className="space-y-2.5">
        {CRITERIA.map((c) => {
          const value = evaluation[c.key] ?? 0;
          const pct = Math.max(0, Math.min(100, (value / 20) * 100));
          return (
            <li key={c.key}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-ink-secondary">{t(c.labelKey)}</span>
                <span className="tabular-nums text-ink-muted">
                  <span className="font-semibold text-ink">{value}</span>
                  <span className="text-ink-muted/80"> / 20</span>
                </span>
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-full bg-surface-muted"
                role="progressbar"
                aria-valuenow={value}
                aria-valuemin={0}
                aria-valuemax={20}
                aria-label={t(c.labelKey)}
              >
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {/* Total + status */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-canvas px-3 py-2.5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
            {t('evaluation_total')}
          </p>
          <p className="text-xl font-bold tabular-nums text-ink">
            {evaluation.totalScore}
            <span className="ml-1 text-xs font-medium text-ink-muted">/ 100</span>
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${statusClass}`}
        >
          {t(statusKey)}
        </span>
      </div>

      {/* Comment */}
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
          {t('evaluation_comment')}
        </p>
        <p className="rounded-lg border border-border bg-canvas px-3 py-2 text-sm leading-relaxed text-ink-secondary">
          {evaluation.comment?.trim() ? evaluation.comment : t('evaluation_no_comment')}
        </p>
      </div>

      {/* Date */}
      <div className="rounded-lg border border-border bg-canvas px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
          {t('evaluation_date')}
        </p>
        <p className="mt-0.5 text-sm text-ink">
          {new Date(evaluation.evaluationDate).toLocaleDateString(
            lang === 'vi' ? 'vi-VN' : 'en-US',
            { dateStyle: 'medium' },
          )}
        </p>
      </div>
    </div>
  );
}