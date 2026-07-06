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

/**
 * Phan loai cuoc hop theo thoi diem hien tai:
 *   - 'UPCOMING' : chua bat dau (now < startTime)
 *   - 'ONGOING'  : dang dien ra (startTime <= now <= endTime)
 *   - 'ENDED'    : da ket thuc (now > endTime, hoac bi huy)
 *
 * Tra ve ca cuoc hop bi CANCELLED dang o ENDED. Neu backend da set
 * `phase`/`joinable` tren response thi uu tien dung gia tri do,
 * con khong tu tinh lai o client.
 */
export type MeetingPhase = 'UPCOMING' | 'ONGOING' | 'ENDED';

export function classifyMeeting(
  meeting: Pick<Meeting, 'startTime' | 'endTime' | 'status'> & { phase?: string },
  now: Date = new Date(),
): MeetingPhase {
  if (meeting.phase === 'UPCOMING' || meeting.phase === 'ONGOING' || meeting.phase === 'ENDED') {
    return meeting.phase;
  }
  if (meeting.status === 'cancelled') return 'ENDED';
  const start = meeting.startTime ? new Date(meeting.startTime).getTime() : NaN;
  const end = meeting.endTime ? new Date(meeting.endTime).getTime() : NaN;
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 'ENDED';
  const t = now.getTime();
  if (t < start) return 'UPCOMING';
  if (t <= end) return 'ONGOING';
  return 'ENDED';
}

export function isMeetingJoinable(
  meeting: Pick<Meeting, 'startTime' | 'endTime' | 'status'>,
  now: Date = new Date(),
): boolean {
  // Backend co the set san `joinable` (Boolean) - tin truong hop do.
  const maybeJoinable = (meeting as { joinable?: boolean }).joinable;
  if (typeof maybeJoinable === 'boolean') return maybeJoinable;
  return classifyMeeting(meeting, now) === 'ONGOING';
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

/**
 * Xin server cấp quyền vào meeting — server kiểm tra thời gian và trả về
 * meetingLink hợp lệ. Nếu meeting đã kết thúc / bị huỷ / chưa tới giờ,
 * server trả về 403 và FE sẽ disable link.
 */
export async function joinMeeting(
  projectId: string,
  meetingId: string,
): Promise<{ meetingLink: string }> {
  const raw = await api.post<{ success: true; data: { meetingLink: string } }>(
    `${Endpoints.MEETING_DETAIL(projectId, meetingId)}/join`,
    {},
  );
  return raw.data;
}
