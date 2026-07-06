/**
 * RankingBadge — Section 9 of plan
 *
 * Renders 🥇 / 🥈 / 🥉 / #N medal-style badges for top 3 ranks
 * and a numbered fallback for the rest.
 */

import { useLanguage } from '@/contexts/LanguageContext';

interface RankingBadgeProps {
  rank: number;
  /** Show only the medal (for top 3) or the numeric #N. Default 'medal'. */
  variant?: 'medal' | 'numeric' | 'both';
  size?: 'sm' | 'md';
}

const MEDAL_GLYPH: Record<1 | 2 | 3, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

const MEDAL_BG: Record<1 | 2 | 3, string> = {
  1: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50',
  2: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-700',
  3: 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/50',
};

const sizeClass = {
  sm: 'text-[11px] px-1.5 py-0.5 gap-1',
  md: 'text-xs px-2 py-1 gap-1.5',
};

export default function RankingBadge({ rank, variant = 'medal', size = 'sm' }: RankingBadgeProps) {
  const { t } = useLanguage();

  if (rank <= 0) {
    return (
      <span
        className={`inline-flex items-center rounded-md border border-border bg-surface-muted font-semibold text-ink-muted ${sizeClass[size]}`}
        title={t('no_rank')}
      >
        {t('no_rank')}
      </span>
    );
  }

  const isPodium = rank >= 1 && rank <= 3;
  const showMedal = isPodium && (variant === 'medal' || variant === 'both');
  const showNumber = !isPodium || variant === 'numeric' || variant === 'both';

  return (
    <span
      className={`inline-flex items-center rounded-md border font-semibold ${
        isPodium ? MEDAL_BG[rank as 1 | 2 | 3] : 'border-border bg-surface-muted text-ink-secondary'
      } ${sizeClass[size]}`}
      title={`${t('rank_label')} ${rank}`}
    >
      {showMedal && <span aria-hidden>{MEDAL_GLYPH[rank as 1 | 2 | 3]}</span>}
      {showNumber && <span>{t('rank_number')}{rank}</span>}
    </span>
  );
}