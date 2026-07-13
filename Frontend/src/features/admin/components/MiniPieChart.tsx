import { useMemo } from 'react';

interface Slice {
  label: string;
  value: number;
  color: string;
}

interface MiniPieChartProps {
  data: Slice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerSubLabel?: string;
}

const DEFAULT_SLICE_COLORS = ['#F97316', '#10B981', '#94A3B8', '#EF4444', '#6366F1'];

/**
 * Donut chart đơn giản — tính góc theo tổng, render arcs qua path SVG.
 * Click-and-update không cần — chỉ dùng để visualise.
 */
export default function MiniPieChart({
  data,
  size = 160,
  thickness = 22,
  centerLabel,
  centerSubLabel,
}: MiniPieChartProps) {
  const total = data.reduce((acc, d) => acc + d.value, 0);
  const radius = size / 2;

  const slices = useMemo(() => {
    let acc = 0;
    return data
      .filter((d) => d.value > 0)
      .map((d, idx) => {
        const startAngle = total > 0 ? (acc / total) * Math.PI * 2 : 0;
        acc += d.value;
        const endAngle = total > 0 ? (acc / total) * Math.PI * 2 : 0;
        const color = d.color || DEFAULT_SLICE_COLORS[idx % DEFAULT_SLICE_COLORS.length];
        return {
          ...d,
          color,
          path: arcPath(radius, radius, radius - thickness / 2, startAngle, endAngle),
        };
      });
  }, [data, radius, thickness]);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <circle cx={radius} cy={radius} r={radius - thickness / 2} fill="none" stroke="currentColor" strokeOpacity={0.08} strokeWidth={thickness} />
        {slices.map((s) => (
          <path key={s.label} d={s.path} fill="none" stroke={s.color} strokeWidth={thickness}>
            <title>{`${s.label}: ${s.value.toLocaleString()}`}</title>
          </path>
        ))}
        {centerLabel && (
          <text
            x={radius}
            y={radius}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="22"
            fontWeight="700"
            fill="currentColor"
          >
            {centerLabel}
          </text>
        )}
        {centerSubLabel && (
          <text
            x={radius}
            y={radius + 20}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="11"
            fill="currentColor"
            opacity={0.6}
          >
            {centerSubLabel}
          </text>
        )}
      </svg>
      <ul className="space-y-1.5 text-sm">
        {slices.map((s) => {
          const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
          return (
            <li key={s.label} className="flex items-center gap-2.5">
              <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: s.color }} />
              <span className="font-semibold text-[#1F1F1F] dark:text-slate-100">{s.label}</span>
              <span className="ml-auto rounded-md bg-surface-muted px-2 py-0.5 text-[11px] font-bold text-[#5C514A] dark:bg-slate-700 dark:text-slate-300">
                {pct}% · {s.value.toLocaleString()}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Tính path của arc mỏng (donut segment) với bán kính `r`, độ dày `thickness`.
 * Trả về 1 SVG path đi qua 2 cung tròn — render với `fill="none"` + stroke.
 *
 * Để đơn giản, ta xấp xỉ: arc ngoài (bán kính = r) và arc trong (bán kính = r - thickness),
 * nối bằng 2 line ngắn tại đầu/cuối. Độ chính xác đủ cho mắt thường.
 */
function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  // Đường kính = 2 * r, vẽ outline rồi đóng đường. Vì `fill=none`, chỉ stroke
  // mới hiển thị — ta chỉ cần arc đi theo circumference.
  const start = polar(cx, cy, r, startAngle);
  const end = polar(cx, cy, r, endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

function polar(cx: number, cy: number, r: number, angleRad: number) {
  return {
    x: cx + r * Math.sin(angleRad),
    y: cy - r * Math.cos(angleRad),
  };
}
