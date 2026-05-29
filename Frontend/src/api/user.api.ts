/**
 * ============================================================
 * User API Module
 * ============================================================
 */
import { api } from './config';
import { Endpoints } from './endpoints';
import type { User, NotificationResponse } from './types';

/** Lấy profile cua user hien tai */
export async function getMe(): Promise<User> {
  return api.get<User>(Endpoints.USER_ME);
}

/** Cap nhat profile */
export async function updateProfile(
  data: Partial<Pick<User, 'fullName' | 'phone' | 'department' | 'position' | 'bio'>>,
): Promise<User> {
  return api.put<User>(Endpoints.USER_ME, data);
}

/** Cap nhat preferences (theme, language) */
export async function updatePreferences(
  data: { theme?: 'LIGHT' | 'DARK'; language?: 'VI' | 'EN' },
): Promise<User> {
  return api.put<User>(Endpoints.USER_PREFERENCES, data);
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
  return api.upload<{ avatar: string; user: User }>(Endpoints.USER_AVATAR, formData);
}

/** Xoa avatar */
export async function deleteAvatar(): Promise<User> {
  return api.delete<User>(Endpoints.USER_AVATAR);
}
