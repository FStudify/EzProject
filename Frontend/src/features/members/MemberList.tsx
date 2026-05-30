import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Modal, MemberAvatar, Badge, useToast } from '@/components/ui';
import { UserPlus, Pencil, LogOut, Link2 } from 'lucide-react';
import type { ProjectRole } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import type { DictKey } from '@/i18n/dict';
import { getProjectMembers, updateMemberRole, removeMember } from '@/api/member.api';
import type { ProjectMemberDetail } from '@/api/types';

const ROLE_OPTIONS: { value: ProjectRole; labelKey: DictKey }[] = [
  { value: 'member', labelKey: 'role_member' },
  { value: 'leader', labelKey: 'role_leader' },
  { value: 'supervisor', labelKey: 'role_supervisor' },
];

function roleBadgeVariant(role: ProjectRole): 'primary' | 'warning' | 'default' {
  if (role === 'leader') return 'primary';
  if (role === 'supervisor') return 'warning';
  return 'default';
}

function apiRoleToUiRole(role: ProjectMemberDetail['role']): ProjectRole {
  if (role === 'LEADER') return 'leader';
  if (role === 'SUPERVISOR') return 'supervisor';
  return 'member';
}

function uiRoleToApiRole(role: ProjectRole): ProjectMemberDetail['role'] {
  if (role === 'leader') return 'LEADER';
  if (role === 'supervisor') return 'SUPERVISOR';
  return 'MEMBER';
}

export default function MemberList() {
  const { projectId } = useParams<{ projectId: string }>();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { user: authUser } = useAuth();

  const [members, setMembers] = useState<ProjectMemberDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [kickConfirmId, setKickConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    async function fetchMembers() {
      setLoading(true);
      try {
        const data = await getProjectMembers(projectId);
        setMembers(data);
      } catch {
        toast(t('failed_to_load_members'), 'error');
      } finally {
        setLoading(false);
      }
    }

    void fetchMembers();
  }, [projectId, t, toast]);

  const currentMembership = members.find((pm) => pm.user.id === authUser?.id);
  const canManage =
    currentMembership?.role === 'LEADER' ||
    currentMembership?.role === 'SUPERVISOR' ||
    currentMembership?.isOwner === true;

  const getRoleLabel = (role: ProjectRole) => {
    return t(ROLE_OPTIONS.find((o) => o.value === role)?.labelKey ?? 'role_member');
  };

  const getRoleLabelWithOwner = (role: ProjectRole, isOwner: boolean) => {
    const base = getRoleLabel(role);
    return isOwner && role === 'leader' ? `${base} (${t('owner')})` : base;
  };

  const applyRoleChange = async (userId: string, newRole: ProjectRole) => {
    const target = members.find((pm) => pm.user.id === userId);
    if (!target || apiRoleToUiRole(target.role) === newRole) return;

    const apiRole = uiRoleToApiRole(newRole);

    if (target.isOwner && newRole !== 'leader') {
      toast(t('cant_change_owner_role'), 'warning');
      return;
    }

    try {
      if (projectId) {
        await updateMemberRole(projectId, userId, apiRole);
      }

      setMembers((prev): ProjectMemberDetail[] => {
        let next: ProjectMemberDetail[] = prev.map((pm) => {
          if (pm.user.id === userId) {
            return { ...pm, role: apiRole };
          }
          if (newRole === 'leader' && pm.role === 'LEADER') {
            return { ...pm, role: 'MEMBER', isOwner: false };
          }
          return pm;
        });

        if (newRole === 'leader') {
          next = next.map((pm) => ({
            ...pm,
            isOwner: pm.user.id === userId,
          }));
        }
        return next;
      });

      toast(t('role_updated'), 'success');
    } catch {
      toast(t('failed_to_update_role'), 'error');
    }
  };

  const handleOpenEdit = (userId: string, currentName: string, currentEmail: string) => {
    setEditingId(userId);
    setEditName(currentName);
    setEditEmail(currentEmail);
  };

  const handleSaveMember = () => {
    // API does not support editing member info; just close modal
    void currentMembership;
    void editName;
    void editEmail;
    setEditingId(null);
  };

  const handleKick = async (userId: string) => {
    const pm = members.find((p) => p.user.id === userId);
    if (pm?.isOwner) return;

    try {
      if (projectId) {
        await removeMember(projectId, userId);
      }
      setMembers((prev) => prev.filter((p) => p.user.id !== userId));
      setKickConfirmId(null);
      toast(t('member_removed'), 'success');
    } catch {
      toast(t('failed_to_remove_member'), 'error');
    }
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/projects/${projectId}?invite=demo`;
    void navigator.clipboard.writeText(link);
    toast(t('invite_link_copied'), 'success');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">{t('manage_members')}</h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            {canManage ? t('leader_can_edit_roles') : t('only_leader_can_edit')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage && (
            <Button variant="secondary" size="md" className="inline-flex items-center gap-2" onClick={copyInviteLink}>
              <Link2 className="h-4 w-4" />
              {t('copy_invite_link')}
            </Button>
          )}
          <Button variant="primary" size="md" className="inline-flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            {t('invite')}
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-ink-muted">{t('loading')}</div>
        ) : members.length === 0 ? (
          <div className="py-16 text-center text-ink-muted">{t('no_members_in_project')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border bg-surface-muted">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    {t('team_members')}
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    {t('role')}
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    {t('tasks_working')}
                  </th>
                  {canManage && (
                    <th className="w-28 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                      {t('actions')}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {members.map(({ user, role, isOwner }) => {
                  const uiRole = apiRoleToUiRole(role);
                  const activeTasks = user.tasksAssigned ?? 0;
                  const isSelf = user.id === authUser?.id;

                  return (
                    <tr
                      key={user.id}
                      className="border-b border-border last:border-0 hover:bg-surface-muted/50"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <MemberAvatar
                            src={user.avatar}
                            name={user.fullName}
                            isOwner={isOwner}
                            role={uiRole}
                            size="md"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-ink">
                              {user.fullName}
                              {isSelf && (
                                <span className="ml-1.5 text-xs font-normal text-ink-muted">{t('you_label')}</span>
                              )}
                            </p>
                            <p className="text-sm text-ink-muted">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {canManage ? (
                          <select
                            value={uiRole}
                            onChange={(e) =>
                              applyRoleChange(user.id, e.target.value as ProjectRole)
                            }
                            disabled={isOwner && members.filter((m) => m.isOwner).length === 1}
                            className="min-w-[140px] rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                            aria-label={`${t('role_of_label')} ${user.fullName}`}
                          >
                            {ROLE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {t(opt.labelKey)}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Badge variant={roleBadgeVariant(uiRole)}>{getRoleLabelWithOwner(uiRole, isOwner)}</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-ink">{activeTasks}</span>
                      </td>
                      {canManage && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(user.id, user.fullName, user.email)}
                              className="rounded-lg p-2 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
                              title={t('edit_name_email')}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            {!isOwner && (
                              <button
                                type="button"
                                onClick={() => setKickConfirmId(user.id)}
                                className="rounded-lg p-2 text-ink-muted transition-colors hover:bg-red-50 hover:text-danger"
                                title={t('kick_from_project')}
                              >
                                <LogOut className="h-4 w-4" />
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

      <Modal isOpen={!!editingId} onClose={() => setEditingId(null)} title={t('edit_member_info')}>
        <div className="space-y-4">
          <div>
            <label htmlFor="member-edit-name" className="ez-label">
              {t('member_name')}
            </label>
            <input
              id="member-edit-name"
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="ez-input"
            />
          </div>
          <div>
            <label htmlFor="member-edit-email" className="ez-label">
              {t('email')}
            </label>
            <input
              id="member-edit-email"
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              className="ez-input"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
              {t('cancel')}
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveMember}>
              {t('save')}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!kickConfirmId} onClose={() => setKickConfirmId(null)} title={t('delete_member')}>
        <div className="space-y-4">
          <p className="text-sm text-ink-secondary">
            {t('cant_delete_owner')}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setKickConfirmId(null)}>
              {t('cancel')}
            </Button>
            <Button variant="danger" size="sm" onClick={() => kickConfirmId && handleKick(kickConfirmId)}>
              {t('delete')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
