/**
 * TeamOverviewStats — Section 4 of plan
 *
 * 5 summary cards: Total Tasks / Completed / In Progress / Overdue / Completion Rate.
 * Reads existing task data; no fake values.
 */

import { useMemo } from 'react';
import { CheckCircle2, ClipboardList, PlayCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import type { Task } from '@/types';
import type { MemberPerformance } from '@/api/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { computeTeamTotals } from './utils';
import ProgressBar from '@/components/ui/ProgressBar';

interface TeamOverviewStatsProps {
  performanceList: MemberPerformance[];
  /** All project tasks — needed to compute overdue count accurately. */
  tasks: Task[];
}

interface StatCard {
  key: 'total' | 'completed' | 'inProgress' | 'overdue' | 'rate';
  label: string;
  value: number | string;
  hint?: string;
  icon: typeof ClipboardList;
  /** Tailwind class names — kept inline so cards stay self-contained. */
  cardClass: string;
  iconClass: string;
}

export default function TeamOverviewStats({ performanceList, tasks }: TeamOverviewStatsProps) {
  const { t } = useLanguage();

  const stats = useMemo(() => {
    const totals = computeTeamTotals(performanceList);
    const now = Date.now();
    const overdue = tasks.filter(
      (t) =>
        t.status !== 'DONE' &&
        t.status !== 'CANCELLED' &&
        t.deadline != null &&
        new Date(t.deadline).getTime() < now,
    ).length;
    return { ...totals, overdue };
  }, [performanceList, tasks]);

  const cards: StatCard[] = [
    {
      key: 'total',
      label: t('total_tasks'),
      value: stats.total,
      icon: ClipboardList,
      cardClass: 'border-border bg-surface',
      iconClass: 'text-slate-600 dark:text-slate-300',
    },
    {
      key: 'completed',
      label: t('completed_tasks'),
      value: stats.completed,
      icon: CheckCircle2,
      cardClass: 'border-emerald-100 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/30',
      iconClass: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      key: 'inProgress',
      label: t('in_progress_tasks'),
      value: stats.inProgress,
      icon: PlayCircle,
      cardClass: 'border-blue-100 bg-blue-50/60 dark:border-blue-900/40 dark:bg-blue-950/30',
      iconClass: 'text-blue-600 dark:text-blue-400',
    },
    {
      key: 'overdue',
      label: t('overdue_tasks'),
      value: stats.overdue,
      icon: AlertTriangle,
      cardClass: 'border-rose-100 bg-rose-50/60 dark:border-rose-900/40 dark:bg-rose-950/30',
      iconClass: 'text-rose-600 dark:text-rose-400',
    },
    {
      key: 'rate',
      label: t('team_completion_rate'),
      value: `${stats.completionRate}%`,
      icon: TrendingUp,
      cardClass: 'border-primary/20 bg-primary-50/40 dark:border-primary/30 dark:bg-primary-950/20',
      iconClass: 'text-primary',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.key}
            className={`flex flex-col gap-1.5 rounded-xl border p-3.5 transition-colors ${card.cardClass}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                {card.label}
              </span>
              <Icon className={`h-4 w-4 ${card.iconClass}`} />
            </div>
            <p className="text-2xl font-extrabold tabular-nums text-ink">{card.value}</p>
            {card.key === 'rate' && (
              <ProgressBar value={stats.completionRate} size="sm" />
            )}
          </div>
        );
      })}
    </div>
  );
}