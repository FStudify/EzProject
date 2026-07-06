// import { api } from './config';

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  link?: string; // e.g., "?taskId=123" or "/projects/xyz?meetingId=456"
  read: boolean;
  createdAt: string;
}

/**
 * TODO: Backend Integration Needed
 * Implement notification fetching logic on backend.
 */
export async function getNotifications(): Promise<AppNotification[]> {
  // const res = await api.get('/notifications');
  // return res.data;
  return Promise.resolve([]);
}

/**
 * TODO: Backend Integration Needed
 * Mark notification as read.
 */
export async function markNotificationRead(_notificationId: string): Promise<void> {
  // await api.put(`/notifications/${notificationId}/read`);
  return Promise.resolve();
}
