/**
 * ============================================================
 * Chat API Module (REST — WebSocket xu ly real-time ben ngoai)
 * ============================================================
 */
import { api } from './config';
import { Endpoints } from './endpoints';
import {
  normalizeChatRooms,
  normalizeChatRoom,
  normalizeChatMessages,
} from './normalize';
import type { ChatRoom, ChatMessage } from '@/types';

interface MessageListResponse {
  messages: ChatMessage[];
  hasMore: boolean;
  nextCursor: string | null;
}

/** Lay danh sach phong chat */
export async function getChatRooms(
  projectId: string,
): Promise<{ general: ChatRoom[]; channels: ChatRoom[]; direct: ChatRoom[] }> {
  const raw = await api.get<unknown>(Endpoints.CHAT_ROOMS(projectId));
  return normalizeChatRooms(raw);
}

/** Lay chi tiet 1 phong (members + createdBy + settings) */
export async function getChatRoom(
  projectId: string,
  roomId: string,
): Promise<ChatRoom> {
  const raw = await api.get<unknown>(Endpoints.CHAT_ROOM_DETAIL(projectId, roomId));
  return normalizeChatRoom(raw as Record<string, unknown>);
}

/** Lay tin nhan cua phong (phan trang) */
export async function getChatMessages(
  projectId: string,
  roomId: string,
  options?: { limit?: number; cursor?: string },
): Promise<MessageListResponse> {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.cursor) params.set('cursor', options.cursor);

  const qs = params.toString();
  const raw = await api.get<unknown>(
    `${Endpoints.CHAT_MESSAGES(projectId, roomId)}${qs ? `?${qs}` : ''}`,
  );
  const obj = (raw ?? {}) as Record<string, unknown>;
  const msgs = normalizeChatMessages(obj.messages ?? []);
  return {
    messages: msgs,
    hasMore: (obj.hasMore as boolean) ?? false,
    nextCursor: (obj.nextCursor as string | null) ?? null,
  };
}

/** Tao kenh moi */
export async function createChatRoom(
  projectId: string,
  data: { name: string; type: 'channel' | 'group'; memberIds?: string[] },
): Promise<ChatRoom> {
  const raw = await api.post<unknown>(Endpoints.CHAT_ROOM_CREATE(projectId), {
    name: data.name,
    type: 'CHANNEL',
    memberIds: data.memberIds,
  });
  return normalizeChatRoom(raw as Record<string, unknown>);
}

/** Doi ten kenh */
export async function renameChatRoom(
  projectId: string,
  roomId: string,
  name: string,
): Promise<ChatRoom> {
  const raw = await api.put<unknown>(
    Endpoints.CHAT_ROOM_DETAIL(projectId, roomId),
    { name },
  );
  return normalizeChatRoom(raw as Record<string, unknown>);
}

/** Xoa kenh */
export async function deleteChatRoom(
  projectId: string,
  roomId: string,
): Promise<void> {
  return api.delete(Endpoints.CHAT_ROOM_DETAIL(projectId, roomId));
}

/** Them thanh vien vao kenh */
export async function addChatRoomMembers(
  projectId: string,
  roomId: string,
  memberIds: string[],
): Promise<ChatRoom> {
  const raw = await api.post<unknown>(
    `${Endpoints.CHAT_ROOM_DETAIL(projectId, roomId)}/members`,
    { memberIds },
  );
  return normalizeChatRoom(raw as Record<string, unknown>);
}

/** Xoa thanh vien khoi kenh (kick / rời) */
export async function removeChatRoomMember(
  projectId: string,
  roomId: string,
  userId: string,
): Promise<{ deleted: boolean; room?: ChatRoom }> {
  const url = `${Endpoints.CHAT_ROOM_DETAIL(projectId, roomId)}/members/${userId}`;
  console.log('[DEBUG API] DELETE url:', url);
  const raw = await api.delete<unknown>(url);
  console.log('[DEBUG API] raw response:', raw);
  const obj = (raw as Record<string, unknown>)?.data ?? raw;
  console.log('[DEBUG API] unwrapped:', obj);
  if ((obj as Record<string, unknown>).deleted) {
    return { deleted: true };
  }
  return { deleted: false, room: normalizeChatRoom(obj as Record<string, unknown>) };
}

/** Thay doi cai dat kenh (khoa/moi thanh vien) */
export async function updateChatRoomSettings(
  projectId: string,
  roomId: string,
  settings: { inviteLocked?: boolean },
): Promise<ChatRoom> {
  const raw = await api.patch<unknown>(
    `${Endpoints.CHAT_ROOM_DETAIL(projectId, roomId)}/settings`,
    settings,
  );
  return normalizeChatRoom(raw as Record<string, unknown>);
}

/** Phong cap thanh vien thanh admin (nhom truong chi dinh) */
export async function promoteChatAdmin(
  projectId: string,
  roomId: string,
  userId: string,
): Promise<ChatRoom> {
  const raw = await api.post<unknown>(
    `${Endpoints.CHAT_ROOM_DETAIL(projectId, roomId)}/admins/${userId}`,
  );
  return normalizeChatRoom(raw as Record<string, unknown>);
}

/** Ha cap admin thanh thanh vien thuong (nhom truong chi dinh) */
export async function demoteChatAdmin(
  projectId: string,
  roomId: string,
  userId: string,
): Promise<ChatRoom> {
  const raw = await api.delete<unknown>(
    `${Endpoints.CHAT_ROOM_DETAIL(projectId, roomId)}/admins/${userId}`,
  );
  return normalizeChatRoom(raw as Record<string, unknown>);
}

/** Chuyen giao truong nhom */
export async function transferChatOwner(
  projectId: string,
  roomId: string,
  userId: string,
): Promise<ChatRoom> {
  const raw = await api.post<unknown>(
    `${Endpoints.CHAT_ROOM_DETAIL(projectId, roomId)}/owner/${userId}`,
  );
  return normalizeChatRoom(raw as Record<string, unknown>);
}

/** Gui tin nhan vao phong */
export async function sendMessage(
  projectId: string,
  roomId: string,
  data: { content: string; channel?: string },
): Promise<ChatMessage> {
  const raw = await api.post<unknown>(Endpoints.CHAT_SEND_MESSAGE(projectId, roomId), data);
  const normalized = normalizeChatMessages([raw]);
  return normalized[0];
}
