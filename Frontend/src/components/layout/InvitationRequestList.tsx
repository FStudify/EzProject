/**
 * ============================================================
 * InvitationRequestList — Pending invitations with Accept/Decline
 * ============================================================
 *
 * - Renders list of invitations received by the current user
 * - Accept / Decline actions call the backend API
 * - Subscribes to `invitation:new` and `invitation:response` window events
 *   so the list stays in sync with real-time socket notifications
 */
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, UserPlus, Loader2, Inbox } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  acceptInvitation,
  declineInvitation,
  getMyInvitations,
  type MyInvitation,
} from '@/api/invitations.api';
import { INVITATIONS_UPDATED_EVENT } from './NotificationDrawer';

interface InvitationRequestListProps {
  onUnreadChange?: (count: number) => void;
}

function formatTimeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(hours / 24);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  return `${days} ngày trước`;
}

export default function InvitationRequestList({ onUnreadChange }: InvitationRequestListProps) {
  const navigate = useNavigate();
  const [items, setItems] = useState<MyInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const data = await getMyInvitations();
      const list = Array.isArray(data) ? data : [];
      setItems(list);
      onUnreadChange?.(list.length);
      window.dispatchEvent(new CustomEvent(INVITATIONS_UPDATED_EVENT, {
        detail: { invitationCount: list.length },
      }));
    } catch (err) {
      console.error('[Invitations] fetch failed:', err);
      setError(err instanceof Error ? err.message : 'Không thể tải lời mời');
    } finally {
      setIsLoading(false);
    }
  }, [onUnreadChange]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Real-time: new invite arrives → re-fetch
  useEffect(() => {
    const handler = () => { void refresh(); };
    window.addEventListener('invitation:new', handler);
    return () => window.removeEventListener('invitation:new', handler);
  }, [refresh]);

  const handleAccept = async (inv: MyInvitation) => {
    setBusyId(inv._id);
    try {
      const projectId = typeof inv.projectId === 'string' ? inv.projectId : inv.projectId._id;
      await acceptInvitation(projectId, inv._id);
      const next = items.filter((x) => x._id !== inv._id);
      setItems(next);
      onUnreadChange?.(next.length);
      window.dispatchEvent(new CustomEvent(INVITATIONS_UPDATED_EVENT, {
        detail: { invitationCount: next.length },
      }));
      navigate(`/app/projects/${projectId}`);
    } catch (err) {
      console.error('[Invitations] accept failed:', err);
      setError(err instanceof Error ? err.message : 'Không thể đồng ý');
    } finally {
      setBusyId(null);
    }
  };

  const handleDecline = async (inv: MyInvitation) => {
    setBusyId(inv._id);
    try {
      const projectId = typeof inv.projectId === 'string' ? inv.projectId : inv.projectId._id;
      await declineInvitation(projectId, inv._id);
      const next = items.filter((x) => x._id !== inv._id);
      setItems(next);
      onUnreadChange?.(next.length);
      window.dispatchEvent(new CustomEvent(INVITATIONS_UPDATED_EVENT, {
        detail: { invitationCount: next.length },
      }));
    } catch (err) {
      console.error('[Invitations] decline failed:', err);
      setError(err instanceof Error ? err.message : 'Không thể từ chối');
    } finally {
      setBusyId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-ink-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
        Đang tải lời mời…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center text-sm text-ink-muted">
        <Inbox className="h-8 w-8 text-ink-muted/60" />
        Bạn không có lời mời nào.
      </div>
    );
  }

  return (
    <ul className="mt-3 divide-y divide-border">
      {error && (
        <li className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</li>
      )}
      {items.map((inv) => {
        const busy = busyId === inv._id;
        const inviter = inv.invitedBy?.fullName || inv.invitedBy?.username || 'Ai đó';
        const role = inv.role || 'MEMBER';
        const projectId = typeof inv.projectId === 'string' ? inv.projectId : inv.projectId._id;
        const projectName = typeof inv.projectId === 'string' ? 'một dự án' : inv.projectId.name;
        return (
          <li key={inv._id} className="py-3">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary">
                <UserPlus className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">
                  <strong>{inviter}</strong> mời bạn tham gia dự án{' '}
                  <Link
                    to={`/app/projects/${projectId}`}
                    className="text-primary hover:underline"
                  >
                    {projectName}
                  </Link>
                </p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Vai trò: <span className="font-medium">{role}</span> · {formatTimeAgo(inv.createdAt)}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleAccept(inv)}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Đồng ý
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleDecline(inv)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                    Từ chối
                  </button>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
