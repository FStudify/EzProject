/**
 * ============================================================
 * ComparisonCard — plan-hieusuat.md §8.1
 * ============================================================
 * Three-up summary card that surfaces all evaluation sources
 * side-by-side, without ever averaging them.
 *
 * The three values represent three independent perspectives:
 *   • System Analytics    → objective, data-driven
 *   • Leader Evaluation   → subjective, process-driven
 *   • Supervisor Evaluation → academic, lecturer-driven
 */

import { Award, UserCog, GraduationCap, BadgeCheck, Info } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { DetailedEvaluation } from '@/api/types';

interface ComparisonCardProps {
  /** System performance score (0-100). */
  systemScore: number;
  /** Latest leader evaluation. */
  leaderEvaluation: DetailedEvaluation | null;
  /** Latest supervisor evaluation. */
  supervisorEvaluation: DetailedEvaluation | null;
  /** Whether the project has any tasks / docs / comments evidence. */
  hasEvidence: boolean;
}

interface RowConfig {
  key: string;
  icon: typeof Award;
  labelKey: 'system_analytics' | 'leader_evaluation' | 'supervisor_evaluation';
  descKey: 'system_analytics_desc' | 'leader_evaluation_desc' | 'supervisor_evaluation_desc';
  value: number | null;
  accent: string;
}

export default function ComparisonCard({
  systemScore,
  leaderEvaluation,
  supervisorEvaluation,
  hasEvidence,
}: ComparisonCardProps) {
  const { t } = useLanguage();

  const rows: RowConfig[] = [
    {
      key: 'system',
      icon: Award,
      labelKey: 'system_analytics',
      descKey: 'system_analytics_desc',
      value: systemScore,
      accent: 'text-primary',
    },
    {
      key: 'leader',
      icon: UserCog,
      labelKey: 'leader_evaluation',
      descKey: 'leader_evaluation_desc',
      value: leaderEvaluation?.totalScore ?? null,
      accent: 'text-secondary',
    },
    {
      key: 'supervisor',
      icon: GraduationCap,
      labelKey: 'supervisor_evaluation',
      descKey: 'supervisor_evaluation_desc',
      value: supervisorEvaluation?.totalScore ?? null,
      accent: 'text-success',
    },
  ];

  return (
    <section
      aria-labelledby="comparison-card-heading"
      className="rounded-2xl border border-border bg-surface p-4 sm:p-5"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <BadgeCheck className="mt-0.5 h-4 w-4 text-primary" />
          <div>
            <h3 id="comparison-card-heading" className="text-sm font-semibold text-ink">
              {t('comparison_card')}
            </h3>
            <p className="mt-0.5 text-xs text-ink-muted">{t('comparison_card_desc')}</p>
          </div>
        </div>
        {hasEvidence && (
          <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
            <BadgeCheck className="h-3 w-3" /> {t('evidence_available')}
          </span>
        )}
      </div>

      <ul className="space-y-2">
        {rows.map((row) => (
          <li
            key={row.key}
            className="flex items-center gap-3 rounded-xl border border-border bg-canvas px-3 py-2.5"
          >
            <row.icon className={`h-4 w-4 shrink-0 ${row.accent}`} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                {t(row.labelKey)}
              </p>
              <p className="truncate text-[11px] text-ink-muted/80">{t(row.descKey)}</p>
            </div>
            <div className="text-right">
              {row.value !== null ? (
                <p className={`text-lg font-bold tabular-nums ${row.accent}`}>
                  {row.value}
                  <span className="ml-1 text-xs font-medium text-ink-muted">
                    {t('perf_score_out_of')}
                  </span>
                </p>
              ) : (
                <p className="text-xs italic text-ink-muted">—</p>
              )}
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-3 flex items-start gap-1.5 text-[11px] text-ink-muted">
        <Info className="mt-0.5 h-3 w-3 shrink-0" />
        <span>{t('performance_summary_desc')}</span>
      </p>
    </section>
  );
}