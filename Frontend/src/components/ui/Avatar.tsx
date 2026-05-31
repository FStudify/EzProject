import { Crown } from 'lucide-react';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  showCrown?: boolean;
  online?: boolean;
}

const sizeStyles = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
};

const crownSizes = { sm: 'h-2.5 w-2.5', md: 'h-3.5 w-3.5', lg: 'h-4 w-4' };

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
  const ringClass = online === undefined ? '' : online ? 'ring-2 ring-primary' : 'ring-2 ring-slate-300';

  const content = (
    <div
      className={`relative flex overflow-hidden ${sizeClass} ${ringClass}`.trim()}
      style={{ borderRadius: '50%' }}
    >
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center font-semibold"
          style={{
            background: 'linear-gradient(135deg, #e6f2fa, #b3d9f2)',
            color: '#0651A0',
          }}
        >
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
          className="absolute -top-0.5 left-1/2 flex -translate-x-1/2 items-center justify-center rounded-full p-0.5"
          style={{ backgroundColor: '#FCD34D', color: '#92400E', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
          title="Project creator"
        >
          <Crown className={crownSizes[size]} strokeWidth={2.5} fill="currentColor" />
        </span>
      </div>
    );
  }

  return content;
}
