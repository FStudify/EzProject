import { Crown } from 'lucide-react';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  showCrown?: boolean;
  /** Gray ring when offline, green when online. Omit when parent adds its own ring (e.g. MemberAvatar). */
  online?: boolean;
}

const sizeStyles = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
};

const crownSizes = { sm: 'h-3 w-3', md: 'h-4 w-4', lg: 'h-5 w-5' };

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function Avatar({
  src,
  name,
  size = 'md',
  showCrown = false,
  online,
}: AvatarProps) {
  const sizeClass = sizeStyles[size];
  const ringClass =
    online === undefined ? '' : online ? 'ring-2 ring-emerald-500' : 'ring-2 ring-slate-300';

  const content = (
    <div className={`rounded-full overflow-hidden ${sizeClass} ${ringClass}`.trim()}>
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-semibold bg-primary-50 text-primary">
          {getInitials(name)}
        </div>
      )}
    </div>
  );

  if (showCrown) {
    return (
      <div className="relative inline-block">
        {content}
        <span
          className="absolute -top-0.5 left-1/2 -translate-x-1/2 flex items-center justify-center rounded-full bg-amber-400 p-0.5 text-amber-900 shadow-sm"
          title="Project creator"
        >
          <Crown className={crownSizes[size]} strokeWidth={2.5} fill="currentColor" />
        </span>
      </div>
    );
  }

  return content;
}
