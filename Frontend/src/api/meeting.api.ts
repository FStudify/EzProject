/**
 * ============================================================
 * Meeting API Module
 * ============================================================
 */
import { api } from './config';
import { Endpoints } from './endpoints';
import { normalizeMeetingList } from './normalize';
import type { Meeting } from '@/types';

/** Lay danh sach cuoc hop */
export async function getMeetings(
  projectId: string,
  options?: { status?: Meeting['status'] },
): Promise<Meeting[]> {
  const qs = options?.status ? `?status=${options.status.toUpperCase()}` : '';
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
    timezone?: string;
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
  data: {
    title?: string;
    description?: string;
    type?: 'ONLINE' | 'OFFLINE';
    startTime?: string;
    endTime?: string;
    location?: string;
    meetingLink?: string;
    timezone?: string;
    status?: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    attendeeIds?: string[];
  },
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
): Promise<Meeting> {
  const raw = await api.put<unknown>(Endpoints.MEETING_RSVP(projectId, meetingId), data);
  return normalizeMeetingList([raw])[0];
}

/** Them thanh vien tham gia cuoc hop */
export async function addMeetingAttendees(
  projectId: string,
  meetingId: string,
  attendeeIds: string[],
): Promise<Meeting> {
  const raw = await api.post<unknown>(
    `${Endpoints.MEETING_DETAIL(projectId, meetingId)}/attendees`,
    { attendeeIds },
  );
  return normalizeMeetingList([raw])[0];
}

/** Xoa thanh vien khoi cuoc hop */
export async function removeMeetingAttendee(
  projectId: string,
  meetingId: string,
  userId: string,
): Promise<Meeting> {
  const raw = await api.delete<unknown>(
    `${Endpoints.MEETING_DETAIL(projectId, meetingId)}/attendees/${userId}`,
  );
  return normalizeMeetingList([raw])[0];
}

/** Cap nhat tom tat cuoc hop */
export async function updateMeetingSummary(
  projectId: string,
  meetingId: string,
  summary: string,
): Promise<Meeting> {
  const raw = await api.put<unknown>(
    `${Endpoints.MEETING_DETAIL(projectId, meetingId)}/summary`,
    { summary },
  );
  return normalizeMeetingList([raw])[0];
}
