import { useState } from 'react';
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
  if (!name?.trim()) return '?';
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const GRADIENTS = [
  { from: '#4F46E5', to: '#06B6D4', text: '#FFFFFF' }, // Indigo to Cyan
  { from: '#10B981', to: '#3B82F6', text: '#FFFFFF' }, // Emerald to Blue
  { from: '#F59E0B', to: '#EF4444', text: '#FFFFFF' }, // Amber to Red
  { from: '#EC4899', to: '#8B5CF6', text: '#FFFFFF' }, // Pink to Violet
  { from: '#F97316', to: '#FACC15', text: '#FFFFFF' }, // Orange to Yellow
  { from: '#06B6D4', to: '#3B82F6', text: '#FFFFFF' }, // Cyan to Blue
  { from: '#8B5CF6', to: '#EC4899', text: '#FFFFFF' }, // Violet to Pink
];

function getAvatarColors(name: string): { bg: string; text: string } {
  if (!name) return { bg: 'linear-gradient(135deg, #4F46E5, #06B6D4)', text: '#FFFFFF' };
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % GRADIENTS.length;
  const grad = GRADIENTS[index];
  return {
    bg: `linear-gradient(135deg, ${grad.from}, ${grad.to})`,
    text: grad.text,
  };
}

/**
 * Always-rounded avatar. The wrapper is `overflow-hidden rounded-full` so the
 * <img> and the initials fallback are clipped to a circle regardless of the
 * parent container. `object-cover` keeps the image from squashing or cropping
 * to a non-square frame.
 */
export default function Avatar({
  src,
  name,
  size = 'md',
  showCrown = false,
  online,
}: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const sizeClass = sizeStyles[size];
  const ringClass =
    online === undefined
      ? 'ring-0'
      : online
        ? 'ring-2 ring-primary'
        : 'ring-2 ring-slate-300';
  const { bg, text } = getAvatarColors(name);

  const content = (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full ${sizeClass} ${ringClass}`}
    >
      {src && !imgError ? (
        <img
          src={src}
          alt={name}
          className="absolute inset-0 h-full w-full rounded-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center rounded-full font-semibold"
          style={{
            background: bg,
            color: text,
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