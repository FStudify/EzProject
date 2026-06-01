import { useState, useEffect } from 'react';
import {
  UserPlus, Link2, Mail, User, X, Copy, Check, Loader2, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui';
import {
  createInviteLink,
  createInvitation,
  getProjectInvitations,
  revokeInvitation,
} from '@/api/member.api';
import type { ProjectMemberDetail } from '@/api/types';

interface InviteMemberModalProps {
  projectId: string;
  members: ProjectMemberDetail[];
  isOwner: boolean;
  onClose: () => void;
  onInvited: () => void;
}

type Tab = 'username' | 'email' | 'link' | 'invitations';

interface PendingInvitation {
  _id: string;
  invitedUser?: { fullName?: string; email?: string };
  invitedEmail?: string;
  invitedUsername?: string;
  status: string;
  expiresAt: string;
  invitedBy?: { fullName?: string };
}

export default function InviteMemberModal({
  projectId, members, isOwner, onClose, onInvited,
}: InviteMemberModalProps) {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<Tab>('username');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingLink, setLoadingLink] = useState(false);
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);

  useEffect(() => {
    if (activeTab === 'link' && !inviteToken) {
      generateLink();
    }
    if (activeTab === 'invitations') {
      loadInvitations();
    }
  }, [activeTab]);

  const generateLink = async () => {
    setLoadingLink(true);
    try {
      const result = await createInviteLink(projectId);
      setInviteToken(result.token);
      setInviteLink(`${window.location.origin}/app/join/${result.token}`);
    } catch (e: any) {
      toast(e?.message || t('failed_to_generate_link'), 'error');
    } finally {
      setLoadingLink(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleInviteUsername = async () => {
    if (!username.trim()) return;
    setLoading(true);
    try {
      await createInvitation(projectId, { username: username.trim() });
      toast(t('invitation_sent'), 'success');
      setUsername('');
      onInvited();
    } catch (e: any) {
      toast(e?.message || t('failed_to_invite'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteEmail = async () => {
    if (!email.trim() || !email.includes('@')) return;
    setLoading(true);
    try {
      await createInvitation(projectId, { email: email.trim() });
      toast(t('invitation_sent'), 'success');
      setEmail('');
      onInvited();
    } catch (e: any) {
      toast(e?.message || t('failed_to_invite'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadInvitations = async () => {
    setLoadingInvitations(true);
    try {
      const data = await getProjectInvitations(projectId);
      const arr = Array.isArray(data) ? data : [];
      setInvitations(arr as PendingInvitation[]);
    } catch {
      // silent
    } finally {
      setLoadingInvitations(false);
    }
  };

  const handleRevoke = async (invitationId: string) => {
    try {
      await revokeInvitation(projectId, invitationId);
      setInvitations((prev) => prev.filter((i) => i._id !== invitationId));
      toast(t('invitation_revoked'), 'success');
    } catch (e: any) {
      toast(e?.message || t('failed_to_revoke'), 'error');
    }
  };

  const TABS: { id: Tab; labelKey: string; icon: React.ReactNode }[] = [
    { id: 'username', labelKey: 'invite_by_account', icon: <User className="h-4 w-4" /> },
    { id: 'email', labelKey: 'invite_by_email', icon: <Mail className="h-4 w-4" /> },
    { id: 'link', labelKey: 'invite_by_link', icon: <Link2 className="h-4 w-4" /> },
    { id: 'invitations', labelKey: 'invite_list', icon: <AlertCircle className="h-4 w-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl shadow-2xl"
        style={{ backgroundColor: '#FFFDFB', border: '1px solid #E8D8CF' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #E8D8CF' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: '#FFF5EC' }}>
              <UserPlus className="h-5 w-5" style={{ color: '#D97853' }} />
            </div>
            <h3 className="text-base font-bold" style={{ color: '#1F1F1F' }}>
              {t('invite_members')}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl transition-colors"
            style={{ color: '#7D6F66' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FFF8F3'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-4 pt-3 gap-1" style={{ borderBottom: '1px solid #E8D8CF' }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 rounded-t-xl px-4 py-2.5 text-sm font-medium transition-colors"
              style={
                activeTab === tab.id
                  ? { color: '#D97853', borderBottom: '2px solid #D97853', backgroundColor: '#FFFDFB' }
                  : { color: '#9a9086', backgroundColor: 'transparent' }
              }
            >
              {tab.icon}
              {t(tab.labelKey)}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-6">
          {/* Username tab */}
          {activeTab === 'username' && (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold" style={{ color: '#1F1F1F' }}>
                  {t('username')}
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void handleInviteUsername(); }}
                  placeholder={t('enter_username')}
                  className="w-full rounded-xl border py-2.5 pl-4 pr-4 text-sm transition-all focus:outline-none focus:ring-2"
                  style={{ backgroundColor: '#FFFDFB', color: '#1F1F1F', borderColor: '#E8C7AE' }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#D97853'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(217,120,83,0.16)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#E8C7AE'; e.currentTarget.style.boxShadow = ''; }}
                />
              </div>
              <Button
                variant="primary"
                size="md"
                onClick={handleInviteUsername}
                disabled={!username.trim() || loading}
                className="w-full"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                {t('send_invitation')}
              </Button>
            </div>
          )}

          {/* Email tab */}
          {activeTab === 'email' && (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold" style={{ color: '#1F1F1F' }}>
                  {t('email')}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void handleInviteEmail(); }}
                  placeholder={t('enter_email')}
                  className="w-full rounded-xl border py-2.5 pl-4 pr-4 text-sm transition-all focus:outline-none focus:ring-2"
                  style={{ backgroundColor: '#FFFDFB', color: '#1F1F1F', borderColor: '#E8C7AE' }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#D97853'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(217,120,83,0.16)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#E8C7AE'; e.currentTarget.style.boxShadow = ''; }}
                />
              </div>
              <Button
                variant="primary"
                size="md"
                onClick={handleInviteEmail}
                disabled={!email.trim() || !email.includes('@') || loading}
                className="w-full"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                {t('send_invitation')}
              </Button>
            </div>
          )}

          {/* Link tab */}
          {activeTab === 'link' && (
            <div className="space-y-4">
              <p className="text-sm" style={{ color: '#7D6F66' }}>
                {t('link_expires_note')}
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteLink}
                  placeholder={t('generating_link')}
                  className="min-w-0 flex-1 rounded-xl border py-2.5 pl-4 pr-4 text-sm"
                  style={{ backgroundColor: '#F8F3EE', color: '#1F1F1F', borderColor: '#E8C7AE' }}
                />
                <Button
                  variant="secondary"
                  size="md"
                  onClick={copyLink}
                  disabled={!inviteLink}
                  className="shrink-0"
                >
                  {copied ? <Check className="h-4 w-4" style={{ color: '#53B848' }} /> : <Copy className="h-4 w-4" />}
                  {copied ? t('copied') : t('copy')}
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={generateLink} disabled={loadingLink} className="w-full">
                {loadingLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                {t('generate_link')}
              </Button>
            </div>
          )}

          {/* Invitations tab */}
          {activeTab === 'invitations' && (
            <div className="space-y-3">
              {loadingInvitations ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#D97853' }} />
                </div>
              ) : invitations.length === 0 ? (
                <div className="py-8 text-center text-sm" style={{ color: '#9a9086' }}>
                  {t('no_invitations')}
                </div>
              ) : (
                invitations.map((inv) => (
                  <div
                    key={inv._id}
                    className="flex items-center justify-between rounded-xl p-3"
                    style={{ backgroundColor: '#F8F3EE', border: '1px solid #E8D8CF' }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium" style={{ color: '#1F1F1F' }}>
                        {inv.invitedUser?.fullName ?? inv.invitedUsername ?? inv.invitedEmail ?? '?'}
                      </p>
                      <p className="truncate text-xs" style={{ color: '#9a9086' }}>
                        {inv.invitedEmail ?? ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRevoke(inv._id)}
                      className="ml-3 shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                      style={{ backgroundColor: '#fef2f2', color: '#ef4444' }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#fee2e2'; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fef2f2'; }}
                    >
                      {t('revoke')}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
