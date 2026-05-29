interface ProgressBarProps {
  value: number;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

const sizeStyles = {
  sm: 'h-1.5',
  md: 'h-2.5',
};

function getBarColor(value: number): string {
  if (value > 66) return 'bg-success';
  if (value > 33) return 'bg-accent';
  return 'bg-danger';
}

export default function ProgressBar({
  value,
  size = 'md',
  showLabel = false,
}: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const barColor = getBarColor(clampedValue);

  return (
    <div className="flex items-center gap-3 w-full">
      <div
        className={`
          flex-1 rounded-full bg-slate-200 overflow-hidden
          transition-all duration-500 ease-out
          ${sizeStyles[size]}
        `.trim().replace(/\s+/g, ' ')}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-sm font-medium text-slate-600 tabular-nums min-w-[2.5rem]">
          {Math.round(clampedValue)}%
        </span>
      )}
    </div>
  );
}
