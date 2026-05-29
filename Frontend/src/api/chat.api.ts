/**
 * ============================================================
 * Chat API Module (REST — WebSocket xu ly real-time ben ngoai)
 * ============================================================
 */
import { api } from './config';
import { Endpoints } from './endpoints';
import { normalizeChatRooms, normalizeChatMessages } from './normalize';
import type { ChatRoom, ChatMessage } from './types';

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
  data: { name: string; type: 'CHANNEL'; memberIds: string[] },
): Promise<ChatRoom> {
  return api.post<ChatRoom>(Endpoints.CHAT_ROOM_CREATE(projectId), data);
}

/** Doi ten kenh */
export async function renameChatRoom(
  projectId: string,
  roomId: string,
  name: string,
): Promise<ChatRoom> {
  return api.put<ChatRoom>(
    `${Endpoints.CHAT_ROOMS(projectId)}/${roomId}`,
    { name },
  );
}

/** Xoa kenh */
export async function deleteChatRoom(
  projectId: string,
  roomId: string,
): Promise<void> {
  return api.delete(`${Endpoints.CHAT_ROOMS(projectId)}/${roomId}`);
}

/** Gui tin nhan vao phong */
export async function sendMessage(
  projectId: string,
  roomId: string,
  data: { content: string; channel?: string },
): Promise<ChatMessage> {
  return api.post<ChatMessage>(Endpoints.CHAT_MESSAGES(projectId, roomId), data);
}
