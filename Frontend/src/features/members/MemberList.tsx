import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Modal, Badge, useToast, Avatar, SkeletonList } from '@/components/ui';
import { UserPlus, LogOut, Link2, Crown } from 'lucide-react';
import type { ProjectRole } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { DictKey } from '@/i18n/dict';
import {
  getProjectMembers,
  updateMemberRole,
  removeMember,
  createInviteLink,
  transferOwnership,
} from '@/api/member.api';
import type { ProjectMemberDetail } from '@/api/types';
import InviteMemberModal from './InviteMemberModal';
import LeaveProjectModal from './LeaveProjectModal';

const ROLE_OPTIONS: { value: ProjectRole; labelKey: DictKey }[] = [
  { value: 'MEMBER', labelKey: 'role_member' },
  { value: 'LEADER', labelKey: 'role_leader' },
  { value: 'SUPERVISOR', labelKey: 'role_supervisor' },
];

function roleBadgeVariant(role: ProjectRole): 'primary' | 'warning' | 'default' {
  if (role === 'LEADER') return 'primary';
  if (role === 'SUPERVISOR') return 'warning';
  return 'default';
}

export default function MemberList() {
  const { projectId } = useParams<{ projectId: string }>();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { user: authUser } = useAuth();
  const navigate = useNavigate();

  const [members, setMembers] = useState<ProjectMemberDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [kickConfirmId, setKickConfirmId] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState<string | null>(null);

  const fetchMembers = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await getProjectMembers(projectId);
      setMembers(data);
    } catch {
      toast(t('failed_to_load_members'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchMembers();
  }, [projectId, t]);

  // Real-time member list refresh when anyone joins or is removed
  useEffect(() => {
    if (!projectId) return;
    const handler = () => { void fetchMembers(); };
    window.addEventListener('project:member:joined', handler);
    window.addEventListener('project:member:removed', handler);
    return () => {
      window.removeEventListener('project:member:joined', handler);
      window.removeEventListener('project:member:removed', handler);
    };
  }, [projectId, t]);

  const currentMembership = members.find((pm) => pm.user.id === authUser?.id);
  const isOwner = currentMembership?.isOwner === true;

  const getRoleLabel = (role: ProjectRole) => {
    return t(ROLE_OPTIONS.find((o) => o.value === role)?.labelKey ?? 'role_member');
  };

  const getRoleLabelWithOwner = (role: ProjectRole, isOwnerFlag: boolean) => {
    const base = getRoleLabel(role);
    return isOwnerFlag && role === 'LEADER' ? `${base} (${t('owner')})` : base;
  };

  const applyRoleChange = async (userId: string, newRole: ProjectRole) => {
    const target = members.find((pm) => pm.user.id === userId);
    if (!target || target.role === newRole) return;

    if (target.isOwner && newRole !== 'LEADER') {
      toast(t('cant_change_owner_role'), 'warning');
      return;
    }

    try {
      if (projectId) {
        await updateMemberRole(projectId, userId, newRole);
      }
      setMembers((prev) => {
        let next: ProjectMemberDetail[] = prev.map((pm) => {
          if (pm.user.id === userId) return { ...pm, role: newRole };
          if (newRole === 'LEADER' && pm.role === 'LEADER') return { ...pm, role: 'MEMBER', isOwner: false };
          return pm;
        });
        if (newRole === 'LEADER') {
          next = next.map((pm) => ({ ...pm, isOwner: pm.user.id === userId }));
        }
        return next;
      });
      toast(t('role_updated'), 'success');
    } catch (e: any) {
      toast(e?.message || t('failed_to_update_role'), 'error');
    }
  };

  const handleKick = async (userId: string) => {
    const pm = members.find((p) => p.user.id === userId);
    if (pm?.isOwner) return;

    try {
      if (projectId) await removeMember(projectId, userId);
      setMembers((prev) => prev.filter((p) => p.user.id !== userId));
      setKickConfirmId(null);
      toast(t('member_removed'), 'success');
    } catch (e: any) {
      toast(e?.message || t('failed_to_remove_member'), 'error');
    }
  };

  const handleTransferOwnership = async (userId: string) => {
    try {
      if (projectId) await transferOwnership(projectId, userId);
      await fetchMembers();
      toast(t('owner_transferred'), 'success');
      setShowTransferModal(false);
      setTransferTargetId(null);
    } catch (e: any) {
      toast(e?.message || t('cannot_transfer_ownership'), 'error');
    }
  };

  const handleLeaveProject = async (deleted: boolean) => {
    if (deleted) {
      navigate('/projects', { replace: true });
    } else {
      await fetchMembers();
    }
  };

  const copyInviteLink = async () => {
    if (!projectId) return;
    try {
      const result = await createInviteLink(projectId);
      const link = `${window.location.origin}/app/join/${result.token}`;
      await navigator.clipboard.writeText(link);
      toast(t('invite_link_copied'), 'success');
    } catch (e: any) {
      toast(e?.message || t('failed_to_generate_link'), 'error');
    }
  };

  const projectName = '';

  return (
    <div className="space-y-6">
      {/* Leave Modal */}
      {showLeaveModal && (
        <LeaveProjectModal
          projectId={projectId!}
          projectName={projectName}
          members={members}
          currentUserId={authUser?.id ?? ''}
          onClose={() => setShowLeaveModal(false)}
          onLeft={handleLeaveProject}
        />
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteMemberModal
          projectId={projectId!}
          members={members}
          isOwner={isOwner}
          onClose={() => setShowInviteModal(false)}
          onInvited={fetchMembers}
        />
      )}

      {/* Transfer Ownership Confirm */}
      {showTransferModal && transferTargetId && (
        <Modal
          isOpen
          onClose={() => { setShowTransferModal(false); setTransferTargetId(null); }}
          title={t('transfer_ownership')}
        >
          <div className="space-y-4">
            <p className="text-sm" style={{ color: '#7D6F66' }}>
              Sau khi chuyển, bạn sẽ trở thành Supervisor và không còn là nhóm trưởng.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setShowTransferModal(false); setTransferTargetId(null); }}>
                {t('cancel')}
              </Button>
              <Button variant="primary" size="sm" onClick={() => void handleTransferOwnership(transferTargetId)}>
                {t('confirm')}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: '#1F1F1F' }}>
            {t('manage_members')}
          </h2>
          <p className="mt-0.5 text-sm" style={{ color: '#9a9086' }}>
            {isOwner
              ? t('owner_manage_members')
              : t('only_leader_can_edit')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="md"
            className="inline-flex items-center gap-2"
            onClick={copyInviteLink}
          >
            <Link2 className="h-4 w-4" />
            {t('copy_invite_link')}
          </Button>
          <Button
            variant="primary"
            size="md"
            className="inline-flex items-center gap-2"
            onClick={() => setShowInviteModal(true)}
          >
            <UserPlus className="h-4 w-4" />
            {t('invite')}
          </Button>
        </div>
      </div>

      {/* Member table */}
      <div
        className="overflow-hidden rounded-xl border shadow-sm"
        style={{ backgroundColor: '#FFFDFB', borderColor: '#E8D8CF' }}
      >
        {loading ? (
          <div className="p-5">
            <SkeletonList rows={4} />
          </div>
        ) : members.length === 0 ? (
          <div className="py-16 text-center text-sm" style={{ color: '#9a9086' }}>
            {t('no_members_in_project')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr style={{ backgroundColor: '#FFF8F3', borderBottom: '1px solid #E8D8CF' }}>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#9a9086' }}>
                    {t('team_members')}
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#9a9086' }}>
                    {t('role')}
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#9a9086' }}>
                      {t('tasks_working')}
                  </th>
                  {isOwner && (
                    <th className="w-32 px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#9a9086' }}>
                      {t('actions')}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {members.map(({ user, role, isOwner: isMemberOwner }) => {
                  const activeTasks = 0;
                  const isSelf = user.id === authUser?.id;

                  return (
                    <tr
                      key={user.id}
                      style={{ borderBottom: '1px solid #F0E8E0' }}
                      className="hover:bg-orange-50/20"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <Avatar
                              src={user.avatar ?? undefined}
                              name={user.fullName ?? '?'}
                              size="sm"
                            />
                            {isMemberOwner && (
                              <div
                                className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full"
                                style={{ backgroundColor: '#D97853' }}
                              >
                                <Crown className="h-2.5 w-2.5 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium" style={{ color: '#1F1F1F' }}>
                              {user.fullName}
                              {isSelf && (
                                <span className="ml-1.5 text-xs font-normal" style={{ color: '#9a9086' }}>
                                  ({t('you_label')})
                                </span>
                              )}
                            </p>
                            <p className="truncate text-xs" style={{ color: '#9a9086' }}>{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {isOwner && !isMemberOwner ? (
                          <select
                            value={role}
                            onChange={(e) =>
                              void applyRoleChange(user.id, e.target.value as ProjectRole)
                            }
                            className="min-w-[140px] rounded-lg border px-2.5 py-1.5 text-sm transition-all focus:outline-none focus:ring-2"
                            style={{ backgroundColor: '#FFFDFB', color: '#1F1F1F', borderColor: '#E8C7AE' }}
                          >
                            {ROLE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {t(opt.labelKey)}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Badge variant={roleBadgeVariant(role)}>
                            {getRoleLabelWithOwner(role, isMemberOwner)}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium" style={{ color: '#1F1F1F' }}>{activeTasks}</span>
                      </td>
                      {isOwner && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {/* Transfer ownership — not self, not already owner */}
                            {!isMemberOwner && !isSelf && (
                              <button
                                type="button"
                                onClick={() => {
                                  setTransferTargetId(user.id);
                                  setShowTransferModal(true);
                                }}
                                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
                                style={{ backgroundColor: '#FFF5EC', color: '#D97853' }}
                                title={t('transfer_ownership')}
                              >
                                <Crown className="h-3 w-3" />
                                Chuyển
                              </button>
                            )}
                            {/* Kick — not owner, not self */}
                            {!isMemberOwner && !isSelf && (
                              <button
                                type="button"
                                onClick={() => setKickConfirmId(user.id)}
                                className="rounded-lg p-2 transition-colors"
                                style={{ color: '#9a9086' }}
                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#fef2f2'; e.currentTarget.style.color = '#ef4444'; }}
                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#9a9086'; }}
                                title={t('kick_from_project')}
                              >
                                <LogOut className="h-4 w-4" />
                              </button>
                            )}
                            {/* Leave project — self only */}
                            {isSelf && (
                              <button
                                type="button"
                                onClick={() => setShowLeaveModal(true)}
                                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
                                style={{ backgroundColor: '#fef2f2', color: '#ef4444' }}
                                title={t('leave_project')}
                              >
                                <LogOut className="h-3 w-3" />
                                Rời dự án
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Kick Confirm Modal */}
      <Modal
        isOpen={!!kickConfirmId}
        onClose={() => setKickConfirmId(null)}
        title={t('delete_member')}
      >
        <div className="space-y-4">
          <p className="text-sm" style={{ color: '#7D6F66' }}>
            {t('kick_member_confirm')}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setKickConfirmId(null)}>
              {t('cancel')}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => kickConfirmId && void handleKick(kickConfirmId)}
            >
              {t('delete')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
