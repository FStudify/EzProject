import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Hash,
  Users,
  MessageCircle,
  Send,
  Plus,
  Search,
  X,
  LogOut,
  Pencil,
  Check,
  Shield,
  ShieldOff,
  Lock,
  Unlock,
  Crown,
  UserPlus,
} from 'lucide-react';
import {
  getChatRooms,
  getChatMessages,
  createChatRoom,
  renameChatRoom,
  deleteChatRoom,
  leaveChatRoom,
  kickChatRoomMember,
  updateChatRoomSettings,
  promoteChatAdmin,
  demoteChatAdmin,
  addChatRoomMembers,
  transferChatOwner,
} from '@/api/chat.api';
import { getProjectMembers } from '@/api/member.api';
import { useAuth } from '@/contexts/AuthContext';
import { useChatSocket } from '@/contexts/ChatSocketContext';
import type { ChatMessage, ChatRoom, Member, ProjectMember, ChannelRole } from '@/types';
import ChatMessageBubble from './ChatMessage';
import { ProjectMemberAvatar, Button } from '@/components/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui';

function makeGeneralRoomId(projectId: string) {
  return `room-general-${projectId}`;
}

function getSavedRoomId(projectId: string) {
  return localStorage.getItem(`ez_chat_room_${projectId}`);
}

function saveRoomId(projectId: string, roomId: string) {
  localStorage.setItem(`ez_chat_room_${projectId}`, roomId);
}

// ─────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const { sendMessage: socketSendMessage, onNewMessage } = useChatSocket();
  const currentUserId = user?.id ?? '';

  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, _setActiveRoomId] = useState<string>('');
  const [allMessages, setAllMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roomMenuRoomId, setRoomMenuState] = useState<string | null>(null);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const skipPersist = useRef(false);

  const setActiveRoomId = (id: string) => {
    _setActiveRoomId(id);
    if (!skipPersist.current && projectId) saveRoomId(projectId, id);
    skipPersist.current = false;
  };

  const activeRoom = rooms.find((r) => r.id === activeRoomId);
  const roomMessages = allMessages.filter((m) => m.roomId === activeRoomId);

  const generalRoom = useMemo(() => rooms.find((r) => r.type === 'general'), [rooms]);
  const channels = useMemo(() => rooms.filter((r) => r.type === 'channel'), [rooms]);
  const dmMembers = useMemo(() => allMembers.filter((m) => m.id !== currentUserId), [allMembers, currentUserId]);

  const filterChannels = (list: ChatRoom[]) =>
    searchQuery ? list.filter((r) => r.name.toLowerCase().includes(searchQuery.toLowerCase())) : list;

  const filteredGeneral = generalRoom ? filterChannels([generalRoom]) : [];
  const filteredChannels = filterChannels(channels);
  const filteredDmMembers = searchQuery
    ? dmMembers.filter((m) => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : dmMembers;

  const onlineIds = useMemo(() => new Set(allMembers.slice(0, 3).map((m) => m.id)), [allMembers]);
  const projectMembers: ProjectMember[] = allMembers.map((m) => ({
    member: m, isOwner: false, role: 'MEMBER', userId: m.id,
  }));

  // ── Load data ─────────────────────────────────────────────────
  useEffect(() => {
    if (!projectId) return;
    setLoadingRooms(true);
    const defaultRoomId = makeGeneralRoomId(projectId);

    Promise.all([getChatRooms(projectId), getProjectMembers(projectId)])
      .then(([roomsData, membersData]) => {
        const all = [...roomsData.general, ...roomsData.channels, ...roomsData.direct];
        const hasGeneral = all.some((r) => r.type === 'general');
        const finalRooms: ChatRoom[] = hasGeneral
          ? all
          : [
              {
                id: defaultRoomId,
                projectId,
                name: 'General',
                type: 'general',
                members: membersData.map((m) => ({
                  id: m.user.id,
                  name: m.user.fullName,
                  fullName: m.user.fullName,
                  avatar: m.user.avatar ?? null,
                })),
                createdAt: new Date().toISOString(),
                createdBy: {
                  id: currentUserId,
                  name: user?.fullName ?? 'User',
                  fullName: user?.fullName ?? 'User',
                  avatar: user?.avatar ?? null,
                },
                inviteLocked: false,
                chatAdmins: [],
              },
              ...all,
            ];

        setRooms(finalRooms);
        setAllMembers(
          membersData.map((m) => ({
            id: m.user.id,
            name: m.user.fullName,
            fullName: m.user.fullName,
            email: m.user.email ?? '',
            avatar: m.user.avatar ?? null,
          })),
        );
        const savedRoomId = getSavedRoomId(projectId);
        const restoredRoomId = savedRoomId && all.some((r) => r.id === savedRoomId)
          ? savedRoomId
          : (hasGeneral ? (roomsData.general[0]?.id ?? defaultRoomId) : defaultRoomId);
        if (savedRoomId && restoredRoomId === savedRoomId) skipPersist.current = true;
        setActiveRoomId(restoredRoomId);
      })
      .catch(() => { toast(t('error_load_data') || 'Không thể tải dữ liệu', 'error'); })
      .finally(() => setLoadingRooms(false));
  }, [projectId, t, currentUserId, user]);

  // ── Load messages ─────────────────────────────────────────────
  useEffect(() => {
    if (!projectId || !activeRoomId) return;
    setLoadingMessages(true);
    getChatMessages(projectId, activeRoomId)
      .then((data) => setAllMessages(data.messages as ChatMessage[]))
      .catch(() => {})
      .finally(() => setLoadingMessages(false));
  }, [projectId, activeRoomId]);

  // ── Auto-scroll ─────────────────────────────────────────────
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [roomMessages.length, activeRoomId]);

  // ── Socket: listen for incoming messages ─────────────────────
  useEffect(() => {
    const unsub = onNewMessage((msg) => {
      setAllMessages((prev) => {
        if (msg.sender.id === currentUserId) {
          const noTemp = prev.filter((m) => !m.id.startsWith('temp-'));
          return noTemp.some((m) => m.id === msg.id) ? prev : [...noTemp, msg];
        }
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });
    return unsub;
  }, [onNewMessage, currentUserId]);

  // ── Room helpers ────────────────────────────────────────────

  const getMemberRole = useCallback((room: ChatRoom, userId: string): ChannelRole => {
    const entry = room.memberRoles?.find((r) => r.userId === userId);
    return entry?.role ?? 'MEMBER';
  }, []);

  const isRoomOwner = useCallback((room: ChatRoom) => getMemberRole(room, currentUserId) === 'OWNER', [currentUserId, getMemberRole]);
  const isRoomAdmin = useCallback((room: ChatRoom) => {
    const role = getMemberRole(room, currentUserId);
    return role === 'OWNER' || role === 'ADMIN';
  }, [currentUserId, getMemberRole]);

  const getRoomIcon = (room: ChatRoom) => {
    if (room.type === 'direct') {
      const other = room.members.find((m) => m.id !== currentUserId) ?? room.members[0];
      return (
        <ProjectMemberAvatar
          member={{ id: other.id, name: other.name, fullName: other.fullName, avatar: other.avatar, email: '' }}
          projectMembers={projectMembers}
          size="sm"
          online={onlineIds.has(other.id)}
        />
      );
    }
    if (room.type === 'general') {
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: '#FFF5EC' }}>
          <Hash className="h-4 w-4" style={{ color: '#D97853' }} />
        </div>
      );
    }
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: '#e6f2fa' }}>
        <Hash className="h-4 w-4" style={{ color: '#0651A0' }} />
      </div>
    );
  };

  const getLastMessage = (roomId: string) => {
    const msgs = allMessages.filter((m) => m.roomId === roomId);
    return msgs[msgs.length - 1];
  };

  const getDmRoomForMember = (member: Member) =>
    rooms.find((r) => r.type === 'direct' && r.members.some((m) => m.id === member.id));

  // ── Actions ─────────────────────────────────────────────────

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || !projectId || !activeRoomId) return;
    const currentUser: Member = allMembers.find((m) => m.id === currentUserId) ?? {
      id: currentUserId, name: user?.fullName ?? 'User',
      fullName: user?.fullName ?? 'User', email: user?.email ?? '', avatar: user?.avatar ?? null,
    };
    const tempId = `temp-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: tempId,
      roomId: activeRoomId,
      sender: { id: currentUser.id, name: currentUser.name, fullName: currentUser.fullName, avatar: currentUser.avatar, email: currentUser.email },
      content: trimmed,
      channel: 'group',
      timestamp: new Date().toISOString(),
    };
    setInput('');
    setAllMessages((prev) => [...prev, optimistic]);
    socketSendMessage(activeRoomId, projectId, trimmed, 'GROUP');
  }, [input, projectId, activeRoomId, allMembers, currentUserId, user, socketSendMessage]);

  const handleCreateChannel = useCallback(async (name: string, memberIds: string[]) => {
    if (!projectId) return;
    try {
      const room = await createChatRoom(projectId, { name, type: 'channel', memberIds });
      setRooms((prev) => [...prev, room]);
      setActiveRoomId(room.id);
    } catch (e: any) { toast(e?.message || 'Không thể tạo kênh', 'error'); }
    setShowCreateModal(false);
  }, [projectId, toast]);

  const handleRenameRoom = useCallback(async (roomId: string, newName: string) => {
    if (!projectId) return;
    try {
      const updated = await renameChatRoom(projectId, roomId, newName.trim());
      setRooms((prev) => prev.map((r) => (r.id === roomId ? updated : r)));
    } catch (e: any) { toast(e?.message || 'Không thể đổi tên', 'error'); }
  }, [projectId, toast]);

  const handleDeleteRoom = useCallback(async (roomId: string) => {
    if (!projectId) return;
    try {
      await deleteChatRoom(projectId, roomId);
      setRooms((prev) => prev.filter((r) => r.id !== roomId));
      if (activeRoomId === roomId) {
        setActiveRoomId(makeGeneralRoomId(projectId));
      }
    } catch (e: any) { toast(e?.message || 'Không thể xóa kênh', 'error'); }
    setRoomMenuState(null);
  }, [projectId, activeRoomId, toast]);

  const handleLeaveRoom = useCallback(async (roomId: string, newOwnerId?: string) => {
    if (!projectId) return;
    const targetRoomId = makeGeneralRoomId(projectId);
    setRoomMenuState(null);
    setActiveRoomId(targetRoomId);
    try {
      const result = await leaveChatRoom(projectId, roomId, newOwnerId ? { newOwnerId } : undefined);
      if (result.deleted) {
        setRooms((prev) => prev.filter((r) => r.id !== roomId));
        toast('Đã rời kênh', 'success');
      } else if (result.transferredTo) {
        setRooms((prev) => prev.filter((r) => r.id !== roomId));
        toast('Đã chuyển nhóm trưởng và rời kênh', 'success');
      } else if (result.room) {
        setRooms((prev) => prev.map((r) => (r.id === roomId ? result.room! : r)));
        toast('Đã rời kênh', 'success');
      }
    } catch (e: any) {
      toast(e?.message || 'Không thể rời kênh', 'error');
    }
  }, [projectId, toast]);

  const handleToggleInviteLock = useCallback(async (roomId: string, locked: boolean) => {
    if (!projectId) return;
    try {
      const updated = await updateChatRoomSettings(projectId, roomId, { inviteLocked: locked });
      setRooms((prev) => prev.map((r) => (r.id === roomId ? updated : r)));
    } catch (e: any) { toast(e?.message || 'Không thể cập nhật cài đặt', 'error'); }
  }, [projectId, toast]);

  const handlePromoteMember = useCallback(async (roomId: string, userId: string) => {
    if (!projectId) return;
    try {
      const updated = await promoteChatAdmin(projectId, roomId, userId);
      setRooms((prev) => prev.map((r) => (r.id === roomId ? updated : r)));
      toast('Đã phong cấp thành công', 'success');
    } catch (e: any) { toast(e?.message || 'Không thể phong cấp', 'error'); }
  }, [projectId, toast]);

  const handleDemoteMember = useCallback(async (roomId: string, userId: string) => {
    if (!projectId) return;
    try {
      const updated = await demoteChatAdmin(projectId, roomId, userId);
      setRooms((prev) => prev.map((r) => (r.id === roomId ? updated : r)));
      toast('Đã hạ cấp thành công', 'success');
    } catch (e: any) { toast(e?.message || 'Không thể hạ cấp', 'error'); }
  }, [projectId, toast]);

  const handleKickMember = useCallback(async (roomId: string, userId: string) => {
    if (!projectId) return;
    try {
      const result = await kickChatRoomMember(projectId, roomId, userId);
      if (result.deleted) {
        setRooms((prev) => prev.filter((r) => r.id !== roomId));
        if (activeRoomId === roomId) setActiveRoomId(makeGeneralRoomId(projectId));
      } else if (result.room) {
        setRooms((prev) => prev.map((r) => (r.id === roomId ? result.room! : r)));
      }
      toast('Đã xóa thành viên', 'success');
    } catch (e: any) { toast(e?.message || 'Không thể xóa thành viên', 'error'); }
  }, [projectId, activeRoomId, toast]);

  const handleInviteMembers = useCallback(async (roomId: string, memberIds: string[]) => {
    if (!projectId) return;
    try {
      const updated = await addChatRoomMembers(projectId, roomId, memberIds);
      setRooms((prev) => prev.map((r) => (r.id === roomId ? updated : r)));
      toast('Đã mời thành viên', 'success');
    } catch (e: any) { toast(e?.message || 'Không thể mời thành viên', 'error'); }
  }, [projectId, toast]);

  const handleTransferOwner = useCallback(async (roomId: string, userId: string) => {
    if (!projectId) return;
    try {
      const updated = await transferChatOwner(projectId, roomId, userId);
      setRooms((prev) => prev.map((r) => (r.id === roomId ? updated : r)));
      toast('Đã chuyển giao nhóm trưởng', 'success');
    } catch (e: any) { toast(e?.message || 'Không thể chuyển giao', 'error'); }
  }, [projectId, toast]);

  const handleOpenDM = useCallback((member: Member) => {
    const dmId = `dm-${member.id}`;
    const existing = rooms.find((r) => r.id === dmId);
    if (existing) { setActiveRoomId(dmId); return; }
    const currentUser: Member = allMembers.find((m) => m.id === currentUserId) ?? {
      id: currentUserId, name: user?.fullName ?? 'User', email: user?.email ?? '', avatar: user?.avatar ?? null,
    };
    const newRoom: ChatRoom = {
      id: dmId, projectId: projectId!, name: member.name,
      type: 'direct',
      members: [
        { id: currentUser.id, name: currentUser.name, fullName: currentUser.name, avatar: currentUser.avatar },
        { id: member.id, name: member.name, fullName: member.name, avatar: member.avatar },
      ],
      createdAt: new Date().toISOString(),
      chatAdmins: [],
      inviteLocked: false,
    };
    setRooms((prev) => [...prev, newRoom]);
    setActiveRoomId(dmId);
  }, [rooms, allMembers, currentUserId, projectId, user]);

  // ── Render room row ──────────────────────────────────────────

  const renderChannelRow = (room: ChatRoom) => {
    const isActive = room.id === activeRoomId;
    const last = getLastMessage(room.id);
    return (
      <div key={room.id} className="relative">
        <button
          type="button"
          onClick={() => setActiveRoomId(room.id)}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors"
          style={isActive ? { backgroundColor: '#FFF5EC', color: '#B76442' } : { color: '#1F1F1F' }}
          onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = '#FFF8F3'; }}
          onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          {getRoomIcon(room)}
          <div className="min-w-0 flex-1">
            <span className={`block truncate text-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>
              {room.name}
            </span>
            {last && (
              <p className="truncate text-xs" style={{ color: isActive ? '#C4957A' : '#9a9086' }}>
                {last.sender != null && last.sender !== 'ai' ? `${String(last.sender).split(' ')[0]}: ` : ''}
                {last.content}
              </p>
            )}
          </div>
        </button>
      </div>
    );
  };

  const renderDMRow = (member: Member) => {
    const dmRoom = getDmRoomForMember(member);
    const last = dmRoom ? getLastMessage(dmRoom.id) : null;
    const isActive = dmRoom?.id === activeRoomId;
    return (
      <button
        key={member.id}
        type="button"
        onClick={() => handleOpenDM(member)}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors"
        style={isActive ? { backgroundColor: '#FFF5EC', color: '#B76442' } : { color: '#1F1F1F' }}
        onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = '#FFF8F3'; }}
        onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        <ProjectMemberAvatar
          member={{ id: member.id, name: member.name, fullName: member.fullName, avatar: member.avatar, email: '' }}
          projectMembers={projectMembers}
          size="sm"
          online={onlineIds.has(member.id)}
        />
        <div className="min-w-0 flex-1">
          <span className={`block truncate text-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>
            {member.name}
          </span>
          {last && (
            <p className="truncate text-xs" style={{ color: isActive ? '#C4957A' : '#9a9086' }}>{last.content}</p>
          )}
        </div>
      </button>
    );
  };

  const menuRoom = rooms.find((r) => r.id === roomMenuRoomId);

  return (
    <div className="flex h-[calc(100vh-12rem)] gap-0 overflow-hidden rounded-xl border" style={{ backgroundColor: '#FFFDFB', borderColor: '#E8D8CF' }}>

      {/* ── LEFT: Room list ───────────────────────────────── */}
      <div className="flex w-72 flex-shrink-0 flex-col" style={{ borderRight: '1px solid #E8D8CF' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #E8D8CF' }}>
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" style={{ color: '#D97853' }} />
            <h2 className="text-sm font-bold" style={{ color: '#1F1F1F' }}>{t('chat')}</h2>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex h-8 w-8 items-center justify-center rounded-xl transition-colors"
            style={{ backgroundColor: '#FFF5EC', color: '#D97853' }}
            title={t('create_channel')}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: '#9a9086' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm cuộc trò chuyện..."
              className="w-full rounded-xl border py-2 pl-9 pr-3 text-sm transition-all focus:outline-none focus:ring-2"
              style={{ backgroundColor: '#F8F3EE', color: '#1F1F1F', borderColor: '#E8C7AE' }}
              onFocus={e => { e.currentTarget.style.borderColor = '#D97853'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(217,120,83,0.16)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#E8C7AE'; e.currentTarget.style.boxShadow = ''; }}
            />
          </div>
        </div>

        {/* Room list */}
        <div className="flex-1 overflow-y-auto px-2 py-1">

          {/* KÊNH */}
          <p className="mb-1 mt-2 px-2 text-xs font-semibold uppercase tracking-wider" style={{ color: '#9a9086' }}>
            KÊNH
          </p>
          {filteredGeneral.map(r => renderChannelRow(r))}
          {filteredChannels.map(room => (
            <div key={room.id} className="relative">
              <button
                type="button"
                onClick={() => setActiveRoomId(room.id)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors"
                style={room.id === activeRoomId ? { backgroundColor: '#FFF5EC', color: '#B76442' } : { color: '#1F1F1F' }}
                onMouseEnter={e => { if (room.id !== activeRoomId) e.currentTarget.style.backgroundColor = '#FFF8F3'; }}
                onMouseLeave={e => { if (room.id !== activeRoomId) e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                {getRoomIcon(room)}
                <div className="min-w-0 flex-1">
                  <span className={`block truncate text-sm ${room.id === activeRoomId ? 'font-semibold' : 'font-medium'}`}>
                    {room.name}
                  </span>
                  {getLastMessage(room.id) && (
                    <p className="truncate text-xs" style={{ color: room.id === activeRoomId ? '#C4957A' : '#9a9086' }}>
                      {getLastMessage(room.id)!.sender != null && getLastMessage(room.id)!.sender !== 'ai' ? `${String(getLastMessage(room.id)!.sender).split(' ')[0]}: ` : ''}
                      {getLastMessage(room.id)!.content}
                    </p>
                  )}
                </div>
              </button>
            </div>
          ))}
          {filteredChannels.length === 0 && (
            <p className="px-3 py-2 text-xs" style={{ color: '#9a9086' }}>Chưa có kênh nào</p>
          )}

          {/* TIN NHẮN TRỰC TIẾP */}
          <p className="mb-1 mt-4 px-2 text-xs font-semibold uppercase tracking-wider" style={{ color: '#9a9086' }}>
            TIN NHẮN TRỰC TIẾP
          </p>
          {filteredDmMembers.map(member => renderDMRow(member))}
        </div>
      </div>

      {/* ── RIGHT: Chat area ───────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {activeRoom ? (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: '1px solid #E8D8CF' }}>
              {getRoomIcon(activeRoom)}
              <button
                type="button"
                onClick={() => {
                  if (activeRoom.type !== 'general' && activeRoom.type !== 'direct') {
                    setRoomMenuState(activeRoom.id);
                  }
                }}
                className="min-w-0 flex-1 text-left"
                style={activeRoom.type !== 'general' && activeRoom.type !== 'direct' ? { cursor: 'pointer' } : { cursor: 'default' }}
                onMouseEnter={e => { if (activeRoom.type !== 'general' && activeRoom.type !== 'direct') e.currentTarget.style.opacity = '0.8'; }}
                onMouseLeave={e => { if (activeRoom.type !== 'general' && activeRoom.type !== 'direct') e.currentTarget.style.opacity = '1'; }}
              >
                <h3 className="text-sm font-bold" style={{ color: '#1F1F1F' }}>{activeRoom.name}</h3>
                <p className="text-xs" style={{ color: '#7D6F66' }}>
                  {activeRoom.type === 'direct'
                    ? (activeRoom.members.find((m) => m.id !== currentUserId)?.name ?? t('direct_message'))
                    : activeRoom.type === 'general'
                    ? 'Kênh mặc định'
                    : `${activeRoom.members.length} thành viên`}
                </p>
              </button>
            </div>

            {/* Messages */}
            <div ref={listRef} className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-5 space-y-4">
              {loadingMessages ? (
                <div className="flex items-center justify-center py-16">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" style={{ borderColor: '#E8D8CF', borderTopColor: '#D97853' }} />
                </div>
              ) : roomMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16" style={{ color: '#9a9086' }}>
                  <MessageCircle className="mb-3 h-10 w-10" />
                  <p className="text-sm font-medium">{t('no_messages')}</p>
                  <p className="text-xs">{t('start_conversation')}</p>
                </div>
              ) : (
                roomMessages.map((msg) => (
                  <ChatMessageBubble
                    key={msg.id}
                    message={msg}
                    isOwn={msg.sender != null && (msg.sender as Member).id === currentUserId}
                  />
                ))
              )}
            </div>

            {/* Input */}
            <div className="shrink-0 p-4" style={{ borderTop: '1px solid #E8D8CF' }}>
              <div className="flex min-w-0 gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder={`Nhắn tin trong ${activeRoom.name}...`}
                  className="min-w-0 flex-1 rounded-xl border py-2.5 pl-4 pr-4 text-sm transition-all focus:outline-none focus:ring-2"
                  style={{ backgroundColor: '#FFFDFB', color: '#1F1F1F', borderColor: '#E8C7AE' }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#D97853'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(217,120,83,0.16)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#E8C7AE'; e.currentTarget.style.boxShadow = ''; }}
                />
                <Button variant="accent" size="md" onClick={handleSend} aria-label={t('send_message')}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center" style={{ color: '#9a9086' }}>
            <p>{t('select_conversation')}</p>
          </div>
        )}
      </div>

      {/* ── Room Menu Modal ──────────────────────────── */}
      {menuRoom && (
        <RoomMenuModal
          room={menuRoom}
          currentUserId={currentUserId}
          allMembers={allMembers}
          onClose={() => setRoomMenuState(null)}
          onRename={handleRenameRoom}
          onToggleLock={handleToggleInviteLock}
          onPromote={handlePromoteMember}
          onDemote={handleDemoteMember}
          onKick={handleKickMember}
          onLeave={handleLeaveRoom}
          onInvite={handleInviteMembers}
          onTransferOwner={handleTransferOwner}
        />
      )}

      {/* Create Channel Modal */}
      {showCreateModal && (
        <CreateChannelModal
          members={allMembers}
          currentUserId={currentUserId}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateChannel}
        />
      )}
    </div>
  );
}

// ── RoomMenuModal ─────────────────────────────────────────────────────────

interface RoomMenuModalProps {
  room: ChatRoom;
  currentUserId: string;
  allMembers: Member[];
  onClose: () => void;
  onRename: (roomId: string, newName: string) => void;
  onToggleLock: (roomId: string, locked: boolean) => void;
  onPromote: (roomId: string, userId: string) => void;
  onDemote: (roomId: string, userId: string) => void;
  onKick: (roomId: string, userId: string) => void;
  onLeave: (roomId: string, newOwnerId?: string) => void;
  onInvite: (roomId: string, memberIds: string[]) => void;
  onTransferOwner: (roomId: string, userId: string) => void;
}

function RoomMenuModal({
  room, currentUserId, allMembers, onClose,
  onRename, onToggleLock, onPromote, onDemote, onKick, onLeave, onInvite, onTransferOwner,
}: RoomMenuModalProps) {
  const { t } = useLanguage();
  const isGeneral = room.type === 'general';
  const myRole = (room.memberRoles?.find((r) => r.userId === currentUserId)?.role) ?? 'MEMBER';
  const isOwner = !isGeneral && myRole === 'OWNER';
  const isAdmin = !isGeneral && (myRole === 'ADMIN' || myRole === 'OWNER');
  const canManage = isOwner || isAdmin;

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(room.name);
  const [inviteIds, setInviteIds] = useState<string[]>([]);

  // Leave modal state
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveNewOwnerId, setLeaveNewOwnerId] = useState<string | null>(null);

  const nonMembers = allMembers.filter((m) => !room.members.some((rm) => rm.id === m.id));
  const otherMembers = room.members.filter((m) => m.id !== currentUserId);

  const toggleInvite = (id: string) => {
    setInviteIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleInvite = () => {
    if (inviteIds.length === 0) return;
    onInvite(room.id, inviteIds);
    setInviteIds([]);
  };

  const handleRenameSubmit = () => {
    if (!nameInput.trim() || nameInput === room.name) { setEditingName(false); return; }
    onRename(room.id, nameInput.trim());
    setEditingName(false);
  };

  const handleLeaveClick = () => {
    if (isOwner && otherMembers.length > 0) {
      setShowLeaveModal(true);
    } else {
      onLeave(room.id);
    }
  };

  const handleLeaveConfirm = () => {
    if (isOwner && otherMembers.length > 0 && !leaveNewOwnerId) return;
    onLeave(room.id, leaveNewOwnerId ?? undefined);
    setShowLeaveModal(false);
    setLeaveNewOwnerId(null);
  };

  return (
    <>
    {/* Leave Transfer Modal */}
    {showLeaveModal && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="w-full max-w-sm overflow-hidden rounded-2xl shadow-2xl" style={{ backgroundColor: '#FFFDFB', border: '1px solid #E8D8CF' }}>
          <div className="px-6 py-4" style={{ borderBottom: '1px solid #E8D8CF' }}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: '#FFF5EC' }}>
                <Crown className="h-5 w-5" style={{ color: '#D97853' }} />
              </div>
              <div>
                <h3 className="text-base font-bold" style={{ color: '#1F1F1F' }}>Bạn là nhóm trưởng</h3>
                <p className="text-xs" style={{ color: '#7D6F66' }}>Chọn người kế nhiệm trước khi rời nhóm</p>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 space-y-2 max-h-60 overflow-y-auto">
            {otherMembers.map((m) => {
              const role = room.memberRoles?.find((r) => r.userId === m.id)?.role ?? 'MEMBER';
              const selected = leaveNewOwnerId === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setLeaveNewOwnerId(m.id)}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors"
                  style={selected ? { backgroundColor: '#FFF5EC', border: '2px solid #D97853' } : { backgroundColor: '#F8F3EE', border: '2px solid transparent' }}
                >
                  <div className="h-9 w-9 shrink-0 rounded-full overflow-hidden">
                    {m.avatar
                      ? <img src={m.avatar} alt={m.name} className="h-full w-full object-cover" />
                      : <div className="flex h-full w-full items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #0651A0, #008DDE)' }}>{m.name.charAt(0)}</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: '#1F1F1F' }}>{m.name}</p>
                    <p className="text-xs" style={{ color: role === 'ADMIN' ? '#53B848' : '#9a9086' }}>
                      {role === 'ADMIN' ? 'Admin' : 'Thành viên'}
                    </p>
                  </div>
                  {selected && <Check className="h-5 w-5 shrink-0" style={{ color: '#D97853' }} />}
                </button>
              );
            })}
          </div>
          <div className="px-6 py-4 flex gap-3" style={{ borderTop: '1px solid #E8D8CF', backgroundColor: '#FFF8F3' }}>
            <button
              type="button"
              onClick={() => { setShowLeaveModal(false); setLeaveNewOwnerId(null); }}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors"
              style={{ backgroundColor: '#F8F3EE', color: '#7D6F66' }}
            >
              Huỷ
            </button>
            <button
              type="button"
              onClick={handleLeaveConfirm}
              disabled={isOwner && !leaveNewOwnerId}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-40"
              style={{ backgroundColor: '#D97853', color: '#fff' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#B76442'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#D97853'; }}
            >
              Xác nhận rời nhóm
            </button>
          </div>
        </div>
      </div>
    )}

    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl shadow-2xl"
        style={{ backgroundColor: '#FFFDFB', border: '1px solid #E8D8CF', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: '1px solid #E8D8CF' }}>
          {editingName ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSubmit(); if (e.key === 'Escape') setEditingName(false); }}
                className="flex-1 rounded-xl border py-1.5 pl-3 pr-3 text-sm transition-all focus:outline-none focus:ring-2"
                style={{ backgroundColor: '#FFFDFB', color: '#1F1F1F', borderColor: '#D97853' }}
                autoFocus
              />
              <button type="button" onClick={handleRenameSubmit} className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: '#EFF9E8' }}>
                <Check className="h-4 w-4" style={{ color: '#53B848' }} />
              </button>
              <button type="button" onClick={() => setEditingName(false)} className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: '#fef2f2' }}>
                <X className="h-4 w-4" style={{ color: '#ef4444' }} />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                {isGeneral ? (
                  <Hash className="h-5 w-5" style={{ color: '#9a9086' }} />
                ) : (
                  <Crown className="h-5 w-5" style={{ color: '#D97853' }} />
                )}
                <h3 className="text-base font-bold" style={{ color: '#1F1F1F' }}>{room.name}</h3>
                {!isGeneral && canManage && (
                  <button
                    type="button"
                    onClick={() => setEditingName(true)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
                    style={{ color: '#9a9086' }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F8F3EE'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-xl transition-colors"
                style={{ color: '#7D6F66' }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FFF8F3'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <X className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* Lock toggle — owner only (not General) */}
          {!isGeneral && isOwner && (
            <div className="px-6 py-3" style={{ borderBottom: '1px solid #E8D8CF' }}>
              <button
                type="button"
                onClick={() => onToggleLock(room.id, !room.inviteLocked)}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors"
                style={{ backgroundColor: '#F8F3EE', border: '1px solid #E8D8CF', color: '#1F1F1F' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#D97853'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8D8CF'; }}
              >
                {room.inviteLocked
                  ? <Lock className="h-5 w-5 shrink-0" style={{ color: '#ef4444' }} />
                  : <Unlock className="h-5 w-5 shrink-0" style={{ color: '#53B848' }} />}
                <div className="flex-1 text-left">
                  <p className="font-semibold">Khoá mời thành viên</p>
                  <p className="text-xs mt-0.5" style={{ color: '#7D6F66' }}>
                    {room.inviteLocked ? 'Chỉ nhóm trưởng mới mời được' : 'Tất cả thành viên đều có thể mời'}
                  </p>
                </div>
                <span
                  className="rounded-full px-2.5 py-1 text-xs font-bold text-white shrink-0"
                  style={{ backgroundColor: room.inviteLocked ? '#ef4444' : '#53B848' }}
                >
                  {room.inviteLocked ? 'Khoá' : 'Mở'}
                </span>
              </button>
            </div>
          )}

          {/* Invite members — not General, owner or admin or unlocked */}
          {!isGeneral && ((!room.inviteLocked) || isOwner || isAdmin) && (
            <div className="px-6 py-3" style={{ borderBottom: '1px solid #E8D8CF' }}>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: '#7D6F66' }}>
                Mời thành viên
              </div>
              {nonMembers.length === 0 ? (
                <p className="text-xs px-3 py-2" style={{ color: '#9a9086' }}>Tất cả thành viên đã ở trong kênh</p>
              ) : (
                <>
                  <div className="max-h-36 overflow-y-auto rounded-xl border p-2 space-y-1 mb-2" style={{ borderColor: '#E8D8CF' }}>
                    {nonMembers.map((m) => {
                      const selected = inviteIds.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => toggleInvite(m.id)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-left transition-colors"
                          style={selected ? { backgroundColor: '#FFF5EC', color: '#B76442' } : { color: '#1F1F1F' }}
                          onMouseEnter={e => { if (!selected) e.currentTarget.style.backgroundColor = '#FFF8F3'; }}
                          onMouseLeave={e => { if (!selected) e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          <div className="h-8 w-8 shrink-0 rounded-full overflow-hidden">
                            {m.avatar
                              ? <img src={m.avatar} alt={m.name} className="h-full w-full object-cover" />
                              : <div className="flex h-full w-full items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #0651A0, #008DDE)' }}>{m.name.charAt(0)}</div>}
                          </div>
                          <span className="flex-1 truncate">{m.name}</span>
                          {selected && <Check className="h-4 w-4 shrink-0" style={{ color: '#D97853' }} />}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={handleInvite}
                    disabled={inviteIds.length === 0}
                    className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
                    style={{ backgroundColor: inviteIds.length > 0 ? '#D97853' : '#E8D8CF', color: inviteIds.length > 0 ? '#fff' : '#9a9086' }}
                    onMouseEnter={e => { if (inviteIds.length > 0) e.currentTarget.style.backgroundColor = '#B76442'; }}
                    onMouseLeave={e => { if (inviteIds.length > 0) e.currentTarget.style.backgroundColor = '#D97853'; }}
                  >
                    Mời {inviteIds.length > 0 ? `${inviteIds.length} người` : 'thành viên'}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Member list with inline actions */}
          <div className="px-6 py-3" style={{ borderBottom: '1px solid #E8D8CF' }}>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: '#7D6F66' }}>
              Thành viên ({room.members.length})
            </div>
            <div className="space-y-1 max-h-52 overflow-y-auto">
              {room.members.map((m) => {
                const isSelf = m.id === currentUserId;
                const memberRole = (room.memberRoles?.find((r) => r.userId === m.id)?.role) ?? 'MEMBER';
                const isMemberOwner = memberRole === 'OWNER';
                const isMemberAdmin = memberRole === 'ADMIN';
                const canKickMember = canManage && !isGeneral && !isMemberOwner && !isSelf;
                const canDemoteAdmin = !isGeneral && isOwner && isMemberAdmin;
                const canPromoteMember = !isGeneral && isOwner && !isMemberOwner && !isMemberAdmin;
                const canTransfer = !isGeneral && isOwner && !isMemberOwner;

                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-2 rounded-xl px-3 py-2"
                    style={{ backgroundColor: isSelf ? '#FFF5EC' : '#F8F3EE' }}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {m.avatar
                        ? <img src={m.avatar} alt={m.name} className="h-8 w-8 rounded-full object-cover" />
                        : <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #0651A0, #008DDE)' }}>{m.name.charAt(0)}</div>}
                      {isMemberOwner && (
                        <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full" style={{ backgroundColor: '#D97853' }}>
                          <Crown className="h-2.5 w-2.5 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Name */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium" style={{ color: '#1F1F1F' }}>
                        {m.name}
                        {isSelf && <span className="ml-1 text-xs" style={{ color: '#9a9086' }}>(bạn)</span>}
                      </p>
                      {isMemberOwner && <p className="text-[10px] font-bold text-white" style={{ color: '#D97853' }}>Nhóm trưởng</p>}
                      {isMemberAdmin && !isMemberOwner && <p className="text-[10px] font-bold text-white" style={{ color: '#53B848' }}>Admin</p>}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {canPromoteMember && (
                        <button
                          type="button"
                          onClick={() => onPromote(room.id, m.id)}
                          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors"
                          style={{ backgroundColor: '#EFF9E8', color: '#53B848' }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#dcfce7'; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#EFF9E8'; }}
                        >
                          <Shield className="h-3 w-3" />
                          Thăng Admin
                        </button>
                      )}
                      {canDemoteAdmin && (
                        <button
                          type="button"
                          onClick={() => onDemote(room.id, m.id)}
                          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors"
                          style={{ backgroundColor: '#FEF0E8', color: '#B76442' }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#fed7aa'; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#FEF0E8'; }}
                        >
                          <ShieldOff className="h-3 w-3" />
                          Hạ cấp
                        </button>
                      )}
                      {canTransfer && (
                        <button
                          type="button"
                          onClick={() => onTransferOwner(room.id, m.id)}
                          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors"
                          style={{ backgroundColor: '#FFF5EC', color: '#D97853' }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#fed7aa'; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#FFF5EC'; }}
                        >
                          <Crown className="h-3 w-3" />
                          Chuyển nhóm trưởng
                        </button>
                      )}
                      {canKickMember && (
                        <button
                          type="button"
                          onClick={() => onKick(room.id, m.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
                          style={{ backgroundColor: '#fef2f2', color: '#ef4444' }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#fee2e2'; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fef2f2'; }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Leave (channels only — not General, not Direct) */}
          {!isGeneral && room.type !== 'direct' && (
            <div className="px-6 py-3 space-y-2">
              <button
                type="button"
                onClick={handleLeaveClick}
                className="flex w-full items-center gap-2 rounded-xl px-4 py-2.5 text-sm transition-colors"
                style={{ color: '#ef4444', backgroundColor: '#fef2f2' }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#fee2e2'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fef2f2'; }}
              >
                <LogOut className="h-4 w-4" />
                Rời kênh
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 shrink-0 flex justify-end" style={{ borderTop: '1px solid #E8D8CF', backgroundColor: '#FFF8F3' }}>
          <Button variant="secondary" size="md" onClick={onClose}>Đóng</Button>
        </div>
      </div>
    </div>
    </>
  );
}

// ── CreateChannelModal ──────────────────────────────────────────────────────

interface CreateChannelModalProps {
  members: Member[];
  currentUserId: string;
  onClose: () => void;
  onCreate: (name: string, memberIds: string[]) => void;
}

function CreateChannelModal({ members, currentUserId, onClose, onCreate }: CreateChannelModalProps) {
  const [name, setName] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const otherMembers = members.filter((m) => m.id !== currentUserId);

  const toggleMember = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleSubmit = () => {
    if (!name.trim() || selectedIds.length === 0) return;
    onCreate(name.trim(), selectedIds);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl shadow-2xl" style={{ backgroundColor: '#FFFDFB', border: '1px solid #E8D8CF' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #E8D8CF' }}>
          <h3 className="text-lg font-bold" style={{ color: '#1F1F1F' }}>Tạo Kênh mới</h3>
          <button type="button" onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl transition-colors"
            style={{ color: '#7D6F66' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FFF8F3'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-4">
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-semibold" style={{ color: '#1F1F1F' }}>Tên kênh</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#9a9086' }}>#</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ví dụ: thiết-kế"
                className="w-full rounded-xl border py-2.5 pl-8 pr-4 text-sm transition-all focus:outline-none focus:ring-2"
                style={{ backgroundColor: '#FFFDFB', color: '#1F1F1F', borderColor: '#E8C7AE' }}
                onFocus={e => { e.currentTarget.style.borderColor = '#D97853'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(217,120,83,0.16)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#E8C7AE'; e.currentTarget.style.boxShadow = ''; }}
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold" style={{ color: '#1F1F1F' }}>Thêm thành viên</label>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border p-2" style={{ borderColor: '#E8D8CF' }}>
              {otherMembers.map((m) => {
                const selected = selectedIds.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleMember(m.id)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors"
                    style={selected ? { backgroundColor: '#FFF5EC', color: '#B76442' } : { color: '#1F1F1F' }}
                    onMouseEnter={e => { if (!selected) e.currentTarget.style.backgroundColor = '#FFF8F3'; }}
                    onMouseLeave={e => { if (!selected) e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <div className="h-8 w-8 shrink-0 rounded-full overflow-hidden">
                      {m.avatar
                        ? <img src={m.avatar} alt={m.name} className="h-full w-full object-cover" />
                        : <div className="flex h-full w-full items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #0651A0, #008DDE)' }}>{m.name.charAt(0)}</div>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{m.name}</p>
                      <p className="truncate text-xs" style={{ color: '#9a9086' }}>{m.email}</p>
                    </div>
                    {selected && <Check className="h-4 w-4 shrink-0" style={{ color: '#D97853' }} />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4" style={{ borderTop: '1px solid #E8D8CF', backgroundColor: '#FFF8F3' }}>
          <Button variant="secondary" size="md" onClick={onClose}>Hủy</Button>
          <Button variant="accent" size="md" onClick={handleSubmit} disabled={!name.trim() || selectedIds.length === 0}>
            Tạo kênh
          </Button>
        </div>
      </div>
    </div>
  );
}
