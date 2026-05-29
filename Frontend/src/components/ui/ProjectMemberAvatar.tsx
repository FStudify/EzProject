import type { Member, ProjectMember } from '@/types';
import Avatar from './Avatar';
import MemberAvatar from './MemberAvatar';

function getRoleInfo(projectMembers: ProjectMember[], memberId: string): { isOwner: boolean; role: 'leader' | 'supervisor' | 'member' } | null {
  const pm = projectMembers.find((p) => p.member.id === memberId);
  return pm ? { isOwner: pm.isOwner, role: pm.role } : null;
}

interface ProjectMemberAvatarProps {
  member: Member;
  projectMembers?: ProjectMember[];
  size?: 'sm' | 'md' | 'lg';
  /** Gray ring when offline, green when online */
  online?: boolean;
}

/** Renders MemberAvatar (with owner/role icons) when in project context, else plain Avatar. */
export default function ProjectMemberAvatar({
  member,
  projectMembers = [],
  size = 'sm',
  online = false,
}: ProjectMemberAvatarProps) {
  const info = projectMembers.length > 0 ? getRoleInfo(projectMembers, member.id) : null;

  if (info) {
    return (
      <MemberAvatar
        src={member.avatar}
        name={member.name}
        isOwner={info.isOwner}
        role={info.role}
        size={size}
        online={online}
      />
    );
  }

  return <Avatar src={member.avatar} name={member.name} size={size} online={online} />;
}
