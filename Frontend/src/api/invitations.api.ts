/**
 * ============================================================
 * Invitations API — Pending invitations received by current user
 * ============================================================
 */
import { api } from './config';
import { Endpoints } from './endpoints';

export interface MyInvitation {
  _id: string;
  projectId: string | { _id: string; name: string };
  invitedBy?: { _id?: string; id?: string; fullName?: string; username?: string; avatar?: string | null };
  invitedEmail?: string;
  role: 'MEMBER' | 'SUPERVISOR' | 'LEADER';
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'CANCELED';
  expiresAt: string;
  createdAt: string;
}

/** GET /users/me/invitations — list pending invitations addressed to me */
export async function getMyInvitations(): Promise<MyInvitation[]> {
  const raw = await api.get<unknown>(Endpoints.MY_INVITATIONS);
  if (Array.isArray(raw)) return raw as MyInvitation[];
  if (raw && typeof raw === 'object' && 'data' in raw) {
    const data = (raw as { data: unknown }).data;
    if (Array.isArray(data)) return data as MyInvitation[];
  }
  return [];
}

/** POST /projects/:projectId/members/invitations/:invitationId/accept */
export async function acceptInvitation(
  projectId: string,
  invitationId: string,
): Promise<{ projectId: string; projectName?: string }> {
  return api.post(Endpoints.INVITATION_ACCEPT(projectId, invitationId));
}

/** POST /projects/:projectId/members/invitations/:invitationId/decline */
export async function declineInvitation(
  projectId: string,
  invitationId: string,
): Promise<void> {
  return api.post(Endpoints.INVITATION_DECLINE(projectId, invitationId));
}
