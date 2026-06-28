import { useState } from 'react';
import {
  LogOut, Crown, AlertTriangle, Loader2, Check, X,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui';
import { leaveProject } from '@/api/member.api';
import type { ProjectMemberDetail } from '@/api/types';

interface LeaveProjectModalProps {
  projectId: string;
  projectName: string;
  members: ProjectMemberDetail[];
  currentUserId: string;
  onClose: () => void;
  onLeft: (deleted: boolean) => void;
}

export default function LeaveProjectModal({
  projectId, projectName, members, currentUserId, onClose, onLeft,
}: LeaveProjectModalProps) {
  const { t } = useLanguage();
  const { toast } = useToast();

  const myMembership = members.find((m) => m.user.id === currentUserId);
  const isOwner = myMembership?.isOwner === true;
  const otherMembers = members.filter((m) => m.user.id !== currentUserId);
  const isLastMember = members.length === 1;

  const [selectedNewOwner, setSelectedNewOwner] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (isOwner && !isLastMember && !selectedNewOwner) return;

    setLoading(true);
    try {
      const result = await leaveProject(
        projectId,
        selectedNewOwner ? { newOwnerId: selectedNewOwner } : undefined,
      );
      if (result.deleted) {
        toast(t('project_deleted'), 'success');
        onLeft(true);
      } else if (result.transferredTo) {
        toast(t('owner_transferred'), 'success');
        onLeft(false);
      } else {
        toast(t('left_project'), 'success');
        onLeft(false);
      }
      onClose();
    } catch (e: any) {
      toast(e?.message || t('cannot_leave_project'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl shadow-2xl"
        style={{ backgroundColor: '#FFFDFB', border: '1px solid #E8D8CF' }}
      >
        {/* Header */}
        <div className="px-6 py-4" style={{ borderBottom: '1px solid #E8D8CF' }}>
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: isOwner ? '#FFF5EC' : '#fef2f2' }}
            >
              {isOwner ? (
                <Crown className="h-5 w-5" style={{ color: '#D97853' }} />
              ) : (
                <LogOut className="h-5 w-5" style={{ color: '#ef4444' }} />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold" style={{ color: '#1F1F1F' }}>
                {isOwner && !isLastMember
                  ? t('you_are_owner')
                  : isOwner && isLastMember
                  ? t('warning_delete_project')
                  : t('leave_project')}
              </h3>
              <p className="text-xs" style={{ color: '#7D6F66' }}>
                {isOwner && !isLastMember
                  ? t('select_new_owner_before_leave')
                  : isOwner && isLastMember
                  ? t('last_member_delete_warning')
                  : `${t('leave_project')} "${projectName}"`}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Warning for last owner */}
          {isOwner && isLastMember && (
            <div
              className="flex items-start gap-3 rounded-xl p-4"
              style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}
            >
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" style={{ color: '#ef4444' }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: '#ef4444' }}>
                  {t('last_member_warning')}
                </p>
                <p className="mt-1 text-xs" style={{ color: '#7D6F66' }}>
                  {t('last_member_delete_warning')}
                </p>
              </div>
            </div>
          )}

          {/* Owner transfer selector */}
          {isOwner && !isLastMember && (
            <div>
              <p className="mb-2 text-sm font-semibold" style={{ color: '#1F1F1F' }}>
                {t('select_new_owner')}
              </p>
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {otherMembers.map((m) => {
                  const selected = selectedNewOwner === m.user.id;
                  const roleLabel = m.role === 'LEADER' || m.role === 'SUPERVISOR'
                    ? t('admin')
                    : t('member');
                  return (
                    <button
                      key={m.user.id}
                      type="button"
                      onClick={() => setSelectedNewOwner(m.user.id)}
                      className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors"
                      style={
                        selected
                          ? { backgroundColor: '#FFF5EC', border: '2px solid #D97853' }
                          : { backgroundColor: '#F8F3EE', border: '2px solid transparent' }
                      }
                    >
                      <div className="h-9 w-9 shrink-0 rounded-full overflow-hidden">
                        {m.user.avatar ? (
                          <img src={m.user.avatar} alt={m.user.fullName} className="h-full w-full object-cover" />
                        ) : (
                          <div
                            className="flex h-full w-full items-center justify-center rounded-full text-sm font-bold text-white"
                            style={{ background: 'linear-gradient(135deg, #0651A0, #008DDE)' }}
                          >
                            {m.user.fullName?.charAt(0) ?? '?'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-semibold" style={{ color: '#1F1F1F' }}>
                          {m.user.fullName}
                        </p>
                        <p className="text-xs" style={{ color: '#9a9086' }}>{roleLabel}</p>
                      </div>
                      {selected && <Check className="h-5 w-5 shrink-0" style={{ color: '#D97853' }} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Simple confirm for non-owner */}
          {!isOwner && (
            <p className="text-sm" style={{ color: '#7D6F66' }}>
              {t('will_lose_access')}
            </p>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex gap-3 px-6 py-4"
          style={{ borderTop: '1px solid #E8D8CF', backgroundColor: '#FFF8F3' }}
        >
          <Button
            variant="ghost"
            size="md"
            onClick={onClose}
            className="flex-1"
          >
            <X className="h-4 w-4" />
            {t('cancel')}
          </Button>
          <Button
            variant="danger"
            size="md"
            onClick={handleConfirm}
            disabled={
              loading ||
              (isOwner && !isLastMember && !selectedNewOwner)
            }
            className="flex-1"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            {isOwner && isLastMember ? t('delete_and_leave') : t('confirm_leave')}
          </Button>
        </div>
      </div>
    </div>
  );
}
