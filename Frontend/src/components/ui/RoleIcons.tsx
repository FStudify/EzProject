import { Flame, BookOpen, Pickaxe } from 'lucide-react';
import type { ProjectRole } from '@/types';

interface RoleIconsProps {
  role: ProjectRole;
  size?: 'sm' | 'md';
  className?: string;
}

const sizeClasses = { sm: 'h-4 w-4', md: 'h-5 w-5' };

const ROLE_ICONS: Record<string, { Icon: typeof Flame; label: string; color: string }> = {
  LEADER: { Icon: Flame, label: 'Leader', color: 'text-orange-500' },
  SUPERVISOR: { Icon: BookOpen, label: 'Supervisor', color: 'text-blue-600' },
  MEMBER: { Icon: Pickaxe, label: 'Member', color: 'text-slate-600' },
};

export function getRoleLabel(role: string, isOwner: boolean): string {
  const labels: Record<string, string> = {
    leader: 'Nhóm trưởng',
    supervisor: 'Giám sát',
    member: 'Thành viên',
  };
  const normalized = role?.toLowerCase() ?? 'member';
  const base = labels[normalized] ?? 'Thành viên';
  return isOwner && normalized === 'leader' ? `${base} (chủ dự án)` : base;
}

export default function RoleIcons({ role, size = 'md', className = '' }: RoleIconsProps) {
  const sz = sizeClasses[size];
  const normalized = role?.toUpperCase() ?? 'MEMBER';
  const { Icon, label, color } = ROLE_ICONS[normalized] ?? ROLE_ICONS.MEMBER;

  return (
    <span
      className={`inline-flex items-center ${color} ${className}`}
      title={label}
    >
      <Icon className={sz} strokeWidth={2} />
    </span>
  );
}
