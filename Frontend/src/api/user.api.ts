/**
 * ============================================================
 * User API Module
 * ============================================================
 */
import { api } from './config';
import { Endpoints } from './endpoints';
import { normalizeActivityList } from './normalize';
import type { Activity } from '@/types';
import type { User, NotificationResponse } from './types';

/** Lấy profile cua user hien tai */
export async function getMe(): Promise<User> {
  const user = await api.get<any>(Endpoints.USER_ME);
  if (user) user.id = user._id || user.id;
  return user as User;
}

/** Cap nhat profile */
export async function updateProfile(
  data: Partial<Pick<User, 'fullName' | 'phone' | 'department' | 'position' | 'bio'>>,
): Promise<User> {
  const user = await api.put<any>(Endpoints.USER_ME, data);
  if (user) user.id = user._id || user.id;
  return user as User;
}

/** Cap nhat preferences (theme, language) */
export async function updatePreferences(
  data: { theme?: 'LIGHT' | 'DARK'; language?: 'VI' | 'EN' },
): Promise<User> {
  const user = await api.put<any>(Endpoints.USER_PREFERENCES, data);
  if (user) user.id = user._id || user.id;
  return user as User;
}

/** Doi mat khau */
export async function changePassword(
  data: { currentPassword: string; newPassword: string; confirmPassword: string },
): Promise<void> {
  return api.put(Endpoints.USER_PASSWORD, data);
}

/** Lay notifications cua user */
export async function getNotifications(unreadOnly = false): Promise<NotificationResponse> {
  const qs = unreadOnly ? '?unreadOnly=true' : '';
  return api.get<NotificationResponse>(`${Endpoints.USER_NOTIFICATIONS}${qs}`);
}

/** Danh dau notification da doc */
export async function markNotificationRead(id: string): Promise<void> {
  return api.put(`${Endpoints.USER_NOTIFICATIONS}/${id}/read`);
}

/** Danh dau tat ca notifications da doc */
export async function markAllNotificationsRead(): Promise<void> {
  return api.put(`${Endpoints.USER_NOTIFICATIONS}/read-all`);
}

/** Upload avatar — multipart/form-data, field: "avatar" */
export async function uploadAvatar(
  file: File,
): Promise<{ avatar: string; user: User }> {
  const formData = new FormData();
  formData.append('avatar', file);
  const res = await api.upload<any>(Endpoints.USER_AVATAR, formData);
  if (res.user) res.user.id = res.user._id || res.user.id;
  return res as { avatar: string; user: User };
}

/** Xoa avatar */
export async function deleteAvatar(): Promise<User> {
  const user = await api.delete<any>(Endpoints.USER_AVATAR);
  if (user) user.id = user._id || user.id;
  return user as User;
}

/** Lay danh sach hoat dong cua user hien tai */
export async function getUserActivities(limit = 20): Promise<Activity[]> {
  const res = await api.get<unknown>(`${Endpoints.USER_ACTIVITIES}?limit=${limit}`);
  return normalizeActivityList(res);
}

/** Lay thong ke nguoi dung hien tai */
export async function getUserStats(): Promise<{
  onTimeRate: number;
  badges: any[];
  activeProjects: number;
  assignedTasks: number;
  completedTasks: number;
}> {
  const res = await api.get<{
    onTimeRate?: number;
    badges?: any[];
    activeProjects?: number;
    assignedTasks?: number;
    completedTasks?: number;
  }>(Endpoints.USER_STATS);
  return {
    onTimeRate: res.onTimeRate ?? 0,
    badges: res.badges ?? [],
    activeProjects: res.activeProjects ?? 0,
    assignedTasks: res.assignedTasks ?? 0,
    completedTasks: res.completedTasks ?? 0,
  };
}
