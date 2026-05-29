/**
 * ============================================================
 * Meeting API Module
 * ============================================================
 */
import { api } from './config';
import { Endpoints } from './endpoints';
import { normalizeMeetingList } from './normalize';
import type { Meeting } from './types';

/** Lay danh sach cuoc hop */
export async function getMeetings(
  projectId: string,
  options?: { status?: Meeting['status'] },
): Promise<Meeting[]> {
  const qs = options?.status ? `?status=${options.status}` : '';
  const raw = await api.get<unknown[]>(
    `${Endpoints.MEETING_LIST(projectId)}${qs}`,
  );
  return normalizeMeetingList(raw);
}

/** Lay chi tiet cuoc hop */
export async function getMeeting(projectId: string, meetingId: string): Promise<Meeting> {
  const raw = await api.get<unknown>(Endpoints.MEETING_DETAIL(projectId, meetingId));
  return normalizeMeetingList([raw])[0];
}

/** Tao cuoc hop moi */
export async function createMeeting(
  projectId: string,
  data: {
    title: string;
    description?: string;
    type: 'ONLINE' | 'OFFLINE';
    startTime: string;
    endTime: string;
    location?: string;
    meetingLink?: string;
    attendeeIds: string[];
  },
): Promise<Meeting> {
  const raw = await api.post<unknown>(Endpoints.MEETING_LIST(projectId), data);
  return normalizeMeetingList([raw])[0];
}

/** Cap nhat cuoc hop */
export async function updateMeeting(
  projectId: string,
  meetingId: string,
  data: Partial<Meeting>,
): Promise<Meeting> {
  const raw = await api.put<unknown>(Endpoints.MEETING_DETAIL(projectId, meetingId), data);
  return normalizeMeetingList([raw])[0];
}

/** Xoa cuoc hop */
export async function deleteMeeting(projectId: string, meetingId: string): Promise<void> {
  return api.delete(Endpoints.MEETING_DETAIL(projectId, meetingId));
}

/** RSVP — xac nhan tham gia / tu choi */
export async function rsvpMeeting(
  projectId: string,
  meetingId: string,
  data: { willAttend: boolean; declineReason?: string },
): Promise<void> {
  return api.put(Endpoints.MEETING_RSVP(projectId, meetingId), data);
}
