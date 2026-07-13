import { useMemo } from 'react';

interface MiniBarChartProps {
  /** Each bar maps to a label + value. */
  data: Array<{ label: string; value: number }>;
  /** Optional width override (the SVG viewBox is fixed so layout scales). */
  height?: number;
  /** When `data` has many points, render only the last N. */
  maxPoints?: number;
  /** Primary accent colour for bars. */
  color?: string;
}

const PADDING = { top: 16, right: 12, bottom: 28, left: 36 };

/**
 * Tiny SVG bar chart, no external deps.
 *
 * - viewBox cố định 600x180, scale bằng CSS `width=100%` để responsive.
 * - `maxPoints` mặc định 30 để biểu đồ không quá dày khi N>60.
 * - Trục Y có 4 tick label (auto scale), trục X hiển thị nhãn đầu/cuối + từng tháng (nếu data có ≥30 điểm thì ghi label mỗi ~7 điểm).
 */
export default function MiniBarChart({
  data,
  height = 180,
  maxPoints = 30,
  color = '#F97316',
}: MiniBarChartProps) {
  const WIDTH = 600;
  const innerW = WIDTH - PADDING.left - PADDING.right;
  const innerH = height - PADDING.top - PADDING.bottom;

  const slice = useMemo(() => (data.length > maxPoints ? data.slice(-maxPoints) : data), [data, maxPoints]);
  const maxV = useMemo(() => Math.max(1, ...slice.map((d) => d.value)), [slice]);

  const stepX = slice.length > 0 ? innerW / slice.length : 0;
  const barWidth = Math.max(2, stepX * 0.7);

  const ticks = useMemo(() => {
    const out: Array<{ y: number; label: string }> = [];
    for (let i = 0; i <= 4; i += 1) {
      const v = Math.round((maxV * (4 - i)) / 4);
      const y = PADDING.top + (innerH * i) / 4;
      out.push({ y, label: compactNumber(v) });
    }
    return out;
  }, [maxV, innerH]);

  const labelEvery = slice.length > 14 ? Math.ceil(slice.length / 6) : slice.length > 6 ? Math.ceil(slice.length / 4) : 1;

  return (
    <svg viewBox={`0 0 ${WIDTH} ${height}`} className="h-auto w-full" role="img" aria-label="bar chart">
      {/* Y axis grid + labels */}
      {ticks.map((t, i) => (
        <g key={i}>
          <line
            x1={PADDING.left}
            y1={t.y}
            x2={WIDTH - PADDING.right}
            y2={t.y}
            stroke="currentColor"
            strokeOpacity={0.08}
            strokeDasharray="3 3"
          />
          <text
            x={PADDING.left - 6}
            y={t.y + 4}
            textAnchor="end"
            fontSize="10"
            fill="currentColor"
            opacity={0.6}
          >
            {t.label}
          </text>
        </g>
      ))}

      {/* Bars */}
      {slice.map((d, i) => {
        const h = (d.value / maxV) * innerH;
        const x = PADDING.left + i * stepX + (stepX - barWidth) / 2;
        const y = PADDING.top + innerH - h;
        return (
          <g key={`${d.label}-${i}`}>
            <rect x={x} y={y} width={barWidth} height={Math.max(0, h)} rx={2} fill={color} opacity={0.85}>
              <title>{`${d.label}: ${d.value.toLocaleString()}`}</title>
            </rect>
            {(i % labelEvery === 0 || i === slice.length - 1) && (
              <text
                x={PADDING.left + i * stepX + stepX / 2}
                y={height - 8}
                textAnchor="middle"
                fontSize="10"
                fill="currentColor"
                opacity={0.6}
              >
                {shortLabel(d.label)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function compactNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

/**
 * Rút gọn "2026-06-30" → "06-30" hoặc "06/30" để label không chồng lên nhau.
 */
function shortLabel(label: string) {
  if (!label) return '';
  // Match yyyy-mm-dd
  const m = label.match(/^\d{4}-(\d{2})-(\d{2})$/);
  if (m) return `${m[1]}/${m[2]}`;
  return label;
}
