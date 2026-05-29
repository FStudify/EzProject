import type { ContributionDay } from '@/types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getColorClass(count: number): string {
  if (count === 0) return 'border border-slate-200 bg-slate-50';
  if (count <= 2) return 'bg-emerald-200';
  if (count <= 4) return 'bg-emerald-400';
  if (count <= 6) return 'bg-emerald-600';
  return 'bg-emerald-800';
}

interface ContributionGraphProps {
  contributions: ContributionDay[];
}

export default function ContributionGraph({ contributions }: ContributionGraphProps) {
  const weeks = 12;
  const daysPerWeek = 7;

  // Build grid: grid[row][col] where row=dayOfWeek (0=Mon), col=weekIndex
  const getCount = (row: number, col: number): number => {
    const idx = col * daysPerWeek + row;
    return contributions[idx]?.count ?? 0;
  };

  const getDateStr = (row: number, col: number): string => {
    const idx = col * daysPerWeek + row;
    return contributions[idx]?.date ?? '';
  };

  // Month labels: which week column starts a new month
  const monthLabels: { col: number; label: string }[] = [];
  let lastMonth = -1;
  for (let col = 0; col < weeks; col++) {
    const idx = col * daysPerWeek;
    const dateStr = contributions[idx]?.date;
    if (dateStr) {
      const month = parseInt(dateStr.slice(5, 7), 10) - 1;
      if (month !== lastMonth) {
        monthLabels.push({ col, label: MONTHS[month] });
        lastMonth = month;
      }
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Contribution Activity</h5>
        <span className="text-xs text-slate-500">Last 12 weeks</span>
      </div>

      <div className="flex flex-col gap-2">
      {/* Month labels row - same width as grid */}
      <div className="flex gap-1 pl-10">
        {Array.from({ length: weeks }, (_, col) => {
          const ml = monthLabels.find((m) => m.col === col);
          return (
            <div key={col} className="w-4 flex-shrink-0 text-[11px] font-medium text-slate-500">
              {ml?.label ?? ''}
            </div>
          );
        })}
      </div>

      <div className="flex gap-1">
        {/* Day labels column */}
        <div className="flex w-10 shrink-0 flex-col justify-around gap-1 text-[11px] font-medium text-slate-500">
          {[0, 2, 4].map((row) => (
            <span key={row}>{DAY_LABELS[row]}</span>
          ))}
        </div>

        {/* Contribution grid */}
        <div className="flex gap-1">
          {Array.from({ length: weeks }, (_, col) => (
            <div key={col} className="flex flex-col gap-1">
              {Array.from({ length: daysPerWeek }, (_, row) => {
                const count = getCount(row, col);
                const dateStr = getDateStr(row, col);
                const dateLabel = dateStr
                  ? new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : '';
                return (
                  <div
                    key={`${row}-${col}`}
                    className={`h-4 w-4 rounded-sm ${getColorClass(count)}`}
                    title={dateLabel ? `${dateLabel}: ${count} contribution${count !== 1 ? 's' : ''}` : undefined}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 pt-2 text-xs text-slate-500">
        <span>Less</span>
        <div className="flex gap-0.5">
          <div className="h-4 w-4 rounded-sm border border-slate-200 bg-slate-50" title="0" />
          <div className="h-4 w-4 rounded-sm bg-emerald-200" title="1-2" />
          <div className="h-4 w-4 rounded-sm bg-emerald-400" title="3-4" />
          <div className="h-4 w-4 rounded-sm bg-emerald-600" title="5-6" />
          <div className="h-4 w-4 rounded-sm bg-emerald-800" title="7+" />
        </div>
        <span>More</span>
      </div>
      </div>
    </div>
  );
}
