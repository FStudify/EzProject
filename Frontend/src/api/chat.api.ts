/**
 * ============================================================
 * Chat API Module
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

export async function markRoomAsRead(projectId: string, roomId: string): Promise<void> {
  // We emit mark_room_read via socket instead of a REST API
  if (typeof window !== 'undefined' && (window as any)._ezSocket) {
    (window as any)._ezSocket.emit('mark_room_read', { projectId, roomId });
  }
  return Promise.resolve();
}

/** Tao kenh (CHANNEL) hoac nhan tin truc tiep (DIRECT) */
export async function createChatRoom(
  projectId: string,
  data: { name: string; type: 'channel' | 'direct'; memberIds?: string[] },
): Promise<ChatRoom> {
  const raw = await api.post<unknown>(Endpoints.CHAT_ROOM_CREATE(projectId), {
    name: data.name,
    type: data.type === 'direct' ? 'DIRECT' : 'CHANNEL',
    memberIds: data.memberIds,
  });
  return normalizeChatRoom(raw as Record<string, unknown>);
}

/** Mo hoặc tao DM voi 1 thanh vien — neu da ton tai thi tra ve phong cu */
export async function openDirectMessage(
  projectId: string,
  targetUserId: string,
): Promise<ChatRoom> {
  const raw = await api.post<unknown>(Endpoints.CHAT_ROOM_CREATE(projectId), {
    name: 'Direct Message',
    type: 'DIRECT',
    memberIds: [targetUserId],
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

// ─── Role-based member operations ────────────────────────────────

/** Rời kênh — xử lý tất cả 4 trường hợp:
 * 1. MEMBER/ADMIN rời → xóa khỏi members
 * 2. OWNER + còn thành viên khác → requires newOwnerId (400 nếu không có)
 * 3. OWNER là người cuối → xóa room + messages
 */
export async function leaveChatRoom(
  projectId: string,
  roomId: string,
  options?: { newOwnerId?: string },
): Promise<{ deleted: boolean; transferredTo?: string; room?: ChatRoom }> {
  if (!roomId || !/^[0-9a-fA-F]{24}$/.test(roomId)) {
    throw new Error('Mã phòng chat không hợp lệ');
  }
  const body = options?.newOwnerId ? { newOwnerId: options.newOwnerId } : {};
  const raw = await api.post<unknown>(Endpoints.CHAT_ROOM_LEAVE(projectId, roomId), body);
  const obj = raw as Record<string, unknown>;
  if (obj.deleted === true) {
    return { deleted: true };
  }
  if (obj.transferredTo) {
    return { deleted: false, transferredTo: obj.transferredTo as string };
  }
  return { deleted: false, room: normalizeChatRoom(obj) };
}

/** Kick thanh vien (chỉ OWNER/ADMIN mới được gọi) */
export async function kickChatRoomMember(
  projectId: string,
  roomId: string,
  userId: string,
): Promise<{ deleted: boolean; room?: ChatRoom }> {
  const raw = await api.delete<unknown>(
    `${Endpoints.CHAT_ROOM_DETAIL(projectId, roomId)}/members/${userId}`,
  );
  const obj = raw as Record<string, unknown>;
  if (obj.deleted === true) {
    return { deleted: true };
  }
  return { deleted: false, room: normalizeChatRoom(obj) };
}

/** Nâng cấp thành viên lên ADMIN (chỉ OWNER) */
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

/** Hạ cấp ADMIN xuống MEMBER (chỉ OWNER) */
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

/** Chuyển giao nhóm trưởng (chỉ OWNER) */
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

/** Thay đổi cài đặt kênh (khóa/mở lời mời) */
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

/** Tắt thông báo kênh */
export async function muteChatRoom(
  projectId: string,
  roomId: string,
  duration: '1h' | '8h' | '24h' | '7d' | 'forever' | null,
): Promise<{ mutedUntil: string | null }> {
  const raw = await api.patch<unknown>(
    `${Endpoints.CHAT_ROOM_DETAIL(projectId, roomId)}/mute`,
    { duration },
  );
  const obj = raw as Record<string, unknown>;
  return obj as { mutedUntil: string | null };
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

/** Chat voi AI — tra loi theo project context */
export async function chatAI(
  projectId: string,
  message: string,
): Promise<{ content: string; timestamp: string }> {
  const raw = await api.post<unknown>(Endpoints.AI_CHAT, { projectId, message });
  const obj = raw as Record<string, unknown>;
  const data = (obj.data ?? obj) as Record<string, unknown>;
  return {
    content: (data.content as string) ?? '',
    timestamp: (data.timestamp as string) ?? new Date().toISOString(),
  };
}
