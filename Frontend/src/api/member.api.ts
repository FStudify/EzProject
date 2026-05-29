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
import type { ProjectMemberDetail, MemberPerformance, Activity } from './types';

/** ── Members ─────────────────────────────────────────────── */

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

/** Tao link moi thanh vien */
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

/** ── Performance ─────────────────────────────────────────── */

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

/** ── Activity ─────────────────────────────────────────────── */

/** Lay feed hoat dong */
export async function getActivities(
  projectId: string,
  limit = 20,
): Promise<Activity[]> {
  const raw = await api.get<unknown[]>(`${Endpoints.ACTIVITY_LIST(projectId)}?limit=${limit}`);
  return normalizeActivityList(raw);
}
