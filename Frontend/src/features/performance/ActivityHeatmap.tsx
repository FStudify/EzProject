/**
 * ActivityHeatmap — 12-week contribution heatmap (Section 6 of plan)
 *
 * - Each cell = 1 day, last 12 weeks (84 days)
 * - Hovering a cell shows a tooltip with the date and contribution count
 * - Visual levels: 0 / 1-2 / 3-4 / 5-6 / 7+
 * - Theme-aware: uses token colors so it adapts to dark/light mode
 */

import type { ContributionDay } from '@/api/types';
import { useLanguage } from '@/contexts/LanguageContext';

const WEEKS = 12;
const DAYS_PER_WEEK = 7;
const MONTHS_VI = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const DAY_LABELS_VI = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const DAY_LABELS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface ActivityHeatmapProps {
  contributions: ContributionDay[];
  /** Optional compact mode used inside small card grids. */
  compact?: boolean;
  /** Override the default header label. */
  title?: string;
}

/**
 * Bucket count into 0..4 intensity level.
 * Returns CSS class names so we don't pollute theme tokens for a
 * derived visualization.
 */
function getIntensityClass(level: number): string {
  switch (level) {
    case 0:
      return 'bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700';
    case 1:
      return 'bg-emerald-200 dark:bg-emerald-900';
    case 2:
      return 'bg-emerald-400 dark:bg-emerald-700';
    case 3:
      return 'bg-emerald-600 dark:bg-emerald-500';
    case 4:
      return 'bg-emerald-800 dark:bg-emerald-300';
    default:
      return 'bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700';
  }
}

function toLevel(count: number): number {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 4) return 2;
  if (count <= 6) return 3;
  return 4;
}

export default function ActivityHeatmap({ contributions, compact = false, title }: ActivityHeatmapProps) {
  const { t, lang } = useLanguage();
  const MONTHS = lang === 'vi' ? MONTHS_VI : MONTHS_EN;
  const DAY_LABELS = lang === 'vi' ? DAY_LABELS_VI : DAY_LABELS_EN;

  const getCount = (row: number, col: number): number => {
    const idx = col * DAYS_PER_WEEK + row;
    return contributions[idx]?.count ?? 0;
  };

  const getDateStr = (row: number, col: number): string => {
    const idx = col * DAYS_PER_WEEK + row;
    return contributions[idx]?.date ?? '';
  };

  const monthLabels: { col: number; label: string }[] = [];
  let lastMonth = -1;
  for (let col = 0; col < WEEKS; col++) {
    const dateStr = getDateStr(0, col);
    if (dateStr) {
      const month = parseInt(dateStr.slice(5, 7), 10) - 1;
      if (month !== lastMonth) {
        monthLabels.push({ col, label: MONTHS[month] ?? '' });
        lastMonth = month;
      }
    }
  }

  const dateLocale = lang === 'vi' ? 'vi-VN' : 'en-US';

  return (
    <div className={`rounded-xl border border-border bg-surface ${compact ? 'p-2.5' : 'p-3'}`}>
      <div className="mb-2 flex items-center justify-between">
        <h5 className={`font-semibold uppercase tracking-wide text-ink-muted ${compact ? 'text-[10px]' : 'text-xs'}`}>
          {title ?? t('activity_heatmap')}
        </h5>
        {!compact && (
          <span className="text-[10px] text-ink-muted">{t('heatmap_last_12_weeks')}</span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {/* Month labels */}
        <div className="flex gap-1 pl-7">
          {Array.from({ length: WEEKS }, (_, col) => {
            const ml = monthLabels.find((m) => m.col === col);
            return (
              <div key={col} className={`flex-shrink-0 text-[10px] font-medium text-ink-muted ${compact ? 'w-3' : 'w-4'}`}>
                {ml?.label ?? ''}
              </div>
            );
          })}
        </div>

        <div className="flex gap-1">
          {/* Day labels */}
          <div className={`flex shrink-0 flex-col justify-around gap-1 text-[10px] font-medium text-ink-muted ${compact ? 'w-6' : 'w-7'}`}>
            {[0, 2, 4].map((row) => (
              <span key={row}>{DAY_LABELS[row]}</span>
            ))}
          </div>

          {/* Contribution grid */}
          <div className="flex gap-1">
            {Array.from({ length: WEEKS }, (_, col) => (
              <div key={col} className="flex flex-col gap-1">
                {Array.from({ length: DAYS_PER_WEEK }, (_, row) => {
                  const count = getCount(row, col);
                  const dateStr = getDateStr(row, col);
                  const level = toLevel(count);
                  const formattedDate = dateStr
                    ? new Date(dateStr + 'T12:00:00').toLocaleDateString(dateLocale, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : '';
                  const tooltip = formattedDate
                    ? `${formattedDate} • ${count} ${t('heatmap_contribution')}`
                    : '';
                  return (
                    <div
                      key={`${row}-${col}`}
                      className={`rounded-sm ${getIntensityClass(level)} ${compact ? 'h-3 w-3' : 'h-4 w-4'}`}
                      title={tooltip}
                      aria-label={tooltip}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1.5 pt-1 text-[10px] text-ink-muted">
          <span>{t('less')}</span>
          <div className="flex gap-0.5">
            <div className={`rounded-sm ${getIntensityClass(0)} ${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'}`} />
            <div className={`rounded-sm ${getIntensityClass(1)} ${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'}`} />
            <div className={`rounded-sm ${getIntensityClass(2)} ${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'}`} />
            <div className={`rounded-sm ${getIntensityClass(3)} ${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'}`} />
            <div className={`rounded-sm ${getIntensityClass(4)} ${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'}`} />
          </div>
          <span>{t('more')}</span>
        </div>
      </div>
    </div>
  );
}