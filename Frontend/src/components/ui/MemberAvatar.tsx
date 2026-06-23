import { Crown, Flame, BookOpen, Pickaxe } from 'lucide-react';
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
  const ringStyle = online ? '0 0 0 3px #10b981' : '0 0 0 2px #e2e8f0';
  const readableRole = isOwner ? 'Chủ sở hữu' : label;

  return (
    <div className="relative inline-block group/avatar" title={`${name} - ${readableRole}`}>
      <div
        className="overflow-hidden rounded-full"
        style={{ width: px, height: px, boxShadow: ringStyle }}
      >
        <Avatar src={src ?? undefined} name={name} size={size} />
      </div>

      {isOwner && (
        <span
          className={`absolute -left-1 -top-1 flex items-center justify-center rounded-full bg-amber-400 p-0.5 text-amber-900 shadow-sm ${iconSz}`}
          title="Chủ sở hữu"
        >
          <Crown className={iconSz} strokeWidth={2.5} fill="currentColor" />
        </span>
      )}

      <span
        className={`absolute -bottom-1 -right-1 flex items-center justify-center rounded-full border border-slate-200 bg-white p-0.5 shadow-sm ${iconSz}`}
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

      <div
        className="pointer-events-none absolute left-0 top-full z-30 mt-2 max-w-[180px] rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover/avatar:opacity-100"
      >
        <p className="truncate font-semibold">{name}</p>
        <p className="truncate text-slate-300">{readableRole}</p>
      </div>
    </div>
  );
}
