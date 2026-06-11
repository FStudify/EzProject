/**
 * ============================================================
 * Member, Performance, Activity API Modules
 * ============================================================
 */
import { api } from './config';
import { Endpoints } from './endpoints';
import {
  normalizeMemberList,
  normalizePerformanceList,
  normalizeActivityList,
} from './normalize';
import type { Activity } from '@/types';
import type { ProjectMemberDetail, MemberPerformance } from './types';

/** ── Members ─────────────────────────────────────────── */

/** Lay danh sach thanh vien project */
export async function getProjectMembers(projectId: string): Promise<ProjectMemberDetail[]> {
  const raw = await api.get<unknown[]>(Endpoints.MEMBER_LIST(projectId));
  return normalizeMemberList(raw);
}

/** Cap nhat vai tro thanh vien */
export async function updateMemberRole(
  projectId: string,
  userId: string,
  role: 'LEADER' | 'SUPERVISOR' | 'MEMBER',
): Promise<void> {
  return api.put(`${Endpoints.MEMBER_ROLE(projectId, userId)}`, { role });
}

/** Xoa thanh vien khoi project */
export async function removeMember(projectId: string, userId: string): Promise<void> {
  return api.delete(Endpoints.MEMBER_REMOVE(projectId, userId));
}

/** ── Invite Links ─────────────────────────────────────── */

/** Tao invite link moi (7 ngay) */
export async function createInviteLink(
  projectId: string,
): Promise<{ inviteLink: string; token: string; expiresAt: string }> {
  return api.post(`${Endpoints.MEMBER_INVITE(projectId)}`);
}

/** Join project bang invite token */
export async function joinByInvite(
  token: string,
): Promise<{ projectId: string; projectName?: string; alreadyMember?: boolean }> {
  return api.post(Endpoints.JOIN_PROJECT, { token });
}

/** ── Invitations ─────────────────────────────────────── */

/** Tao invitation bang username hoac email (owner only) */
export async function createInvitation(
  projectId: string,
  data: { username?: string; email?: string },
): Promise<{
  id: string;
  invitedUser: { id: string; fullName: string; email: string; avatar: string | null };
  status: string;
  expiresAt: string;
}> {
  return api.post(Endpoints.MEMBER_INVITATIONS(projectId), data);
}

/** Lay danh sach invitation cua project (owner only) */
export async function getProjectInvitations(projectId: string): Promise<unknown[]> {
  return api.get(Endpoints.MEMBER_INVITATIONS(projectId));
}

/** Accept invitation */
export async function acceptInvitation(
  projectId: string,
  invitationId: string,
): Promise<{ projectId: string; projectName?: string }> {
  return api.post(Endpoints.INVITATION_ACCEPT(projectId, invitationId));
}

/** Decline invitation */
export async function declineInvitation(projectId: string, invitationId: string): Promise<void> {
  return api.post(Endpoints.INVITATION_DECLINE(projectId, invitationId));
}

/** Lay invitation cua minh */
export async function getMyInvitations(): Promise<unknown[]> {
  return api.get(Endpoints.MY_INVITATIONS);
}

/** Revoke invitation (owner only) */
export async function revokeInvitation(projectId: string, invitationId: string): Promise<void> {
  return api.delete(Endpoints.INVITATION_DETAIL(projectId, invitationId));
}

/** ── Leave / Transfer ─────────────────────────────────── */

/** Rời dự án — handle all 3 cases:
 * 1. MEMBER/SUPERVISOR: remove from members
 * 2. OWNER + other members: requires newOwnerId (400 if missing)
 * 3. OWNER last: delete project
 */
export async function leaveProject(
  projectId: string,
  options?: { newOwnerId?: string },
): Promise<{ deleted?: boolean; transferredTo?: string }> {
  const body = options?.newOwnerId ? { newOwnerId: options.newOwnerId } : {};
  const raw = await api.post<unknown>(Endpoints.PROJECT_LEAVE(projectId), body);
  const obj = raw as Record<string, unknown>;
  const data = (obj.data ?? {}) as Record<string, unknown>;
  return {
    deleted: data.deleted as boolean | undefined,
    transferredTo: data.transferredTo as string | undefined,
  };
}

/** Chuyển quyền sở hữu (owner only) */
export async function transferOwnership(projectId: string, newOwnerId: string): Promise<void> {
  return api.post(Endpoints.PROJECT_TRANSFER(projectId), { newOwnerId });
}

/** ── Performance ─────────────────────────────────────── */

/** Lay danh sach hieu suat thanh vien */
export async function getPerformance(projectId: string): Promise<MemberPerformance[]> {
  const raw = await api.get<unknown[]>(Endpoints.PERFORMANCE_LIST(projectId));
  return normalizePerformanceList(raw);
}

/** Danh gia thanh vien */
export async function evaluateMember(
  projectId: string,
  data: { memberId: string; rating: number; feedback?: string },
): Promise<void> {
  return api.post(Endpoints.PERFORMANCE_EVALUATE(projectId), data);
}

/** ── Activity ─────────────────────────────────────────── */

/** Lay feed hoat dong */
export async function getActivities(
  projectId: string,
  limit = 20,
): Promise<Activity[]> {
  const raw = await api.get<unknown[]>(`${Endpoints.ACTIVITY_LIST(projectId)}?limit=${limit}`);
  return normalizeActivityList(raw);
}
