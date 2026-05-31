interface ProgressBarProps {
  value: number;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

const sizeStyles = {
  sm: 'h-1.5',
  md: 'h-2.5',
};

function getBarColor(value: number): { bg: string; text: string } {
  if (value > 66) return { bg: '#53B848', text: '#4E9D33' };
  if (value >= 33) return { bg: '#F37124', text: '#B76442' };
  return { bg: '#ef4444', text: '#dc2626' };
}

export default function ProgressBar({
  value,
  size = 'md',
  showLabel = false,
}: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const { bg, text } = getBarColor(clampedValue);

  return (
    <div className="flex items-center gap-3 w-full">
      <div
        className={`flex-1 overflow-hidden rounded-full bg-slate-200 transition-all duration-500 ease-out ${sizeStyles[size]}`}
      >
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${clampedValue}%`, backgroundColor: bg }}
        />
      </div>
      {showLabel && (
        <span className="min-w-[2.5rem] text-sm font-semibold tabular-nums" style={{ color: text }}>
          {Math.round(clampedValue)}%
        </span>
      )}
    </div>
  );
}
