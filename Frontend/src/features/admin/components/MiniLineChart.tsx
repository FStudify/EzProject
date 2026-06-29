import type { CSSProperties } from 'react';

interface SparkSeries {
  label: string;
  values: number[];
  color: string;
}

interface MiniLineChartProps {
  series: SparkSeries[];
  labels: string[];
  height?: number;
}

/**
 * Tiny SVG line chart, no external deps. Renders a smooth-ish line per series.
 * Used for "User growth" / "Project growth" sparklines on the admin dashboard.
 */
export default function MiniLineChart({ series, labels, height = 160 }: MiniLineChartProps) {
  const width = 600;
  const padding = { top: 16, right: 12, bottom: 22, left: 28 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const allValues = series.flatMap((s) => s.values);
  const maxV = Math.max(1, ...allValues);
  const stepX = labels.length > 1 ? innerW / (labels.length - 1) : 0;

  const pathFor = (values: number[]) => {
    if (values.length === 0) return '';
    return values
      .map((v, i) => {
        const x = padding.left + i * stepX;
        const y = padding.top + innerH - (v / maxV) * innerH;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const fillPathFor = (values: number[]) => {
    const line = pathFor(values);
    if (!line) return '';
    const lastX = padding.left + (values.length - 1) * stepX;
    const baseY = padding.top + innerH;
    return `${line} L ${lastX.toFixed(1)} ${baseY.toFixed(1)} L ${padding.left} ${baseY.toFixed(1)} Z`;
  };

  const yTicks = 4;
  const yMarks: { y: number; v: number }[] = Array.from({ length: yTicks + 1 }, (_, i) => ({
    y: padding.top + (innerH * i) / yTicks,
    v: Math.round(maxV - (maxV * i) / yTicks),
  }));

  const labelStep = Math.max(1, Math.ceil(labels.length / 6));
  const xLabels = labels.map((l, i) => ({
    x: padding.left + i * stepX,
    text: l,
    show: i % labelStep === 0 || i === labels.length - 1,
  }));

  const containerStyle: CSSProperties = { width: '100%', height };

  return (
    <div style={containerStyle}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        width="100%"
        height={height}
        role="img"
        aria-label="Biểu đồ tăng trưởng"
      >
        {/* Y grid */}
        {yMarks.map((m, i) => (
          <g key={`y${i}`}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={m.y}
              y2={m.y}
              stroke="currentColor"
              strokeOpacity={0.12}
              strokeDasharray="2 3"
            />
            <text
              x={padding.left - 6}
              y={m.y + 4}
              fontSize="10"
              textAnchor="end"
              fill="currentColor"
              fillOpacity={0.55}
            >
              {m.v}
            </text>
          </g>
        ))}

        {/* X labels */}
        {xLabels.map((l, i) =>
          l.show ? (
            <text
              key={`x${i}`}
              x={l.x}
              y={height - 6}
              fontSize="10"
              textAnchor="middle"
              fill="currentColor"
              fillOpacity={0.55}
            >
              {l.text}
            </text>
          ) : null,
        )}

        {/* Series fills + lines */}
        {series.map((s) => (
          <g key={s.label}>
            <path d={fillPathFor(s.values)} fill={s.color} fillOpacity={0.12} />
            <path
              d={pathFor(s.values)}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        ))}
      </svg>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-[#635648] dark:text-slate-300">
        {series.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: s.color }} />
            <span>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}