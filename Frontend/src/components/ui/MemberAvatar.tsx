import { Crown, Flame, BookOpen, Pickaxe } from 'lucide-react';
import type { ProjectRole } from '@/types';
import Avatar from './Avatar';

interface MemberAvatarProps {
  src?: string | null;
  name: string;
  isOwner?: boolean;
  role?: 'LEADER' | 'SUPERVISOR' | 'MEMBER' | 'leader' | 'supervisor' | 'member';
  size?: 'sm' | 'md' | 'lg';
  /** Gray ring when offline, green when online */
  online?: boolean;
}

const sizePx = { sm: 32, md: 40, lg: 48 };
const iconSizes = { sm: 'h-3 w-3', md: 'h-4 w-4', lg: 'h-5 w-5' };

const ROLE_ICONS: Record<string, { Icon: typeof Flame; label: string }> = {
  LEADER: { Icon: Flame, label: 'Trưởng nhóm' },
  SUPERVISOR: { Icon: BookOpen, label: 'Giám sát' },
  MEMBER: { Icon: Pickaxe, label: 'Thành viên' },
};

export default function MemberAvatar({
  src,
  name,
  isOwner = false,
  role,
  size = 'md',
  online = false,
}: MemberAvatarProps) {
  const px = sizePx[size];
  const iconSz = iconSizes[size];
  const upperRole = role?.toUpperCase() ?? 'MEMBER';
  const roleEntry = ROLE_ICONS[upperRole] ?? ROLE_ICONS.MEMBER;
  const { Icon, label } = roleEntry;
  const ringClass = online ? 'ring-2 ring-emerald-500' : 'ring-2 ring-slate-300';
  const tooltipLines = [name, isOwner && 'Chủ sở hữu', label].filter(Boolean).join('\n');
  const avatarSrc = src ?? undefined;

  return (
    <div className="relative inline-block group" title={tooltipLines}>
      <div
        className={`rounded-full overflow-hidden ${ringClass}`}
        style={{ width: px, height: px }}
      >
        <Avatar src={avatarSrc} name={name} size={size} />
      </div>

      {isOwner && (
        <span
          className={`absolute -top-1 -left-1 flex items-center justify-center rounded-full bg-amber-400 p-0.5 text-amber-900 shadow-sm ${iconSz}`}
          title="Owner"
        >
          <Crown className={iconSz} strokeWidth={2.5} fill="currentColor" />
        </span>
      )}

      <span
        className={`absolute -bottom-1 -right-1 flex items-center justify-center rounded-full bg-white p-0.5 shadow-sm border border-slate-200 ${iconSz}`}
        title={label}
      >
        <Icon
          className={`${iconSz} ${
            upperRole === 'LEADER'
              ? 'text-orange-500'
              : upperRole === 'SUPERVISOR'
                ? 'text-blue-600'
                : 'text-slate-600'
          }`}
          strokeWidth={2}
        />
      </span>

      {/* Tooltip on hover */}
      <div
        className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1.5 rounded-lg bg-slate-800 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10"
        style={{ width: 'max-content' }}
      >
        <p className="font-medium">{name}</p>
        {isOwner && <p className="text-amber-300">Chủ sở hữu</p>}
        <p className="text-slate-300">{label}</p>
      </div>
    </div>
  );
}
