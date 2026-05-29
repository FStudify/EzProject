import { useState, useRef, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  Hash,
  Users,
  MessageCircle,
  Send,
  Plus,
  Search,
  X,
  MoreVertical,
  LogOut,
  Pencil,
  Check,
  Trash2,
} from 'lucide-react';
import { getChatRooms, getChatMessages } from '@/api/chat.api';
import { getProjectMembers } from '@/api/member.api';
import type { ChatMessage, ChatRoom, Member } from '@/types';
import ChatMessageBubble from './ChatMessage';
import { ProjectMemberAvatar, Button, Badge } from '@/components/ui';
import { useLanguage } from '@/contexts/LanguageContext';

const CURRENT_USER_ID = 'mem-1';

export default function ChatPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { t } = useLanguage();

  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string>(() =>
    `room-general-${projectId ?? ''}`,
  );
  const [allMessages, setAllMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [dropdownRoomId, setDropdownRoomId] = useState<string | null>(null);
  const [renameRoomId, setRenameRoomId] = useState<string | null>(null);

  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeRoom = rooms.find((r) => r.id === activeRoomId);
  const roomMessages = allMessages.filter((m) => m.roomId === activeRoomId);

  const channels = rooms.filter((r) => r.type === 'general' || r.type === 'channel');

  const dmMembers = useMemo(
    () => allMembers.filter((m) => m.id !== CURRENT_USER_ID),
    [allMembers],
  );

  const filteredChannels = searchQuery
    ? channels.filter((r) => r.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : channels;
  const filteredDmMembers = searchQuery
    ? dmMembers.filter((m) => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : dmMembers;

  // Fetch rooms and members on mount
  useEffect(() => {
    if (!projectId) return;
    setLoadingRooms(true);
    Promise.all([getChatRooms(projectId), getProjectMembers(projectId)])
      .then(([roomsData, membersData]) => {
        const all = [...roomsData.general, ...roomsData.channels, ...roomsData.direct];
        const hasGeneral = roomsData.general.length > 0;
        if (!hasGeneral && membersData.length > 0) {
          const generalRoom: ChatRoom = {
            id: `room-general-${projectId}`,
            projectId,
            name: t('general_channel'),
            type: 'general',
            members: membersData.map((m) => m.user as unknown as Member),
            createdAt: new Date().toISOString(),
          };
          setRooms([generalRoom, ...all]);
        } else {
          setRooms(all);
        }
        setAllMembers(
          membersData.map((m) => ({
            id: m.user.id,
            name: m.user.fullName,
            email: m.user.email ?? '',
            avatar: m.user.avatar ?? '',
          })),
        );
        setActiveRoomId(`room-general-${projectId}`);
      })
      .catch(() => {})
      .finally(() => setLoadingRooms(false));
  }, [projectId, t]);

  // Fetch messages when active room changes
  useEffect(() => {
    if (!projectId || !activeRoomId) return;
    setLoadingMessages(true);
    getChatMessages(projectId, activeRoomId)
      .then((data) => setAllMessages(data.messages))
      .catch(() => {})
      .finally(() => setLoadingMessages(false));
  }, [projectId, activeRoomId]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownRoomId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [roomMessages.length, activeRoomId]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || !projectId) return;

    const currentUser = allMembers.find((m) => m.id === CURRENT_USER_ID) ?? allMembers[0];
    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      projectId,
      roomId: activeRoomId,
      sender: currentUser,
      content: trimmed,
      timestamp: new Date().toISOString(),
      channel: 'group',
    };
    setAllMessages((prev) => [...prev, newMessage]);
    setInput('');
  };

  const handleCreateChannel = (name: string, memberIds: string[]) => {
    if (!projectId) return;
    const selectedMembers = allMembers.filter((m) => memberIds.includes(m.id));
    if (!selectedMembers.some((m) => m.id === CURRENT_USER_ID)) {
      const currentUser = allMembers.find((m) => m.id === CURRENT_USER_ID) ?? allMembers[0];
      selectedMembers.unshift(currentUser);
    }
    const newRoom: ChatRoom = {
      id: `room-${Date.now()}`,
      projectId,
      name,
      type: 'channel',
      members: selectedMembers,
      createdAt: new Date().toISOString(),
    };
    setRooms((prev) => [...prev, newRoom]);
    setActiveRoomId(newRoom.id);
    setShowCreateModal(false);
  };

  const handleRenameRoom = (roomId: string, newName: string) => {
    setRooms((prev) =>
      prev.map((r) => (r.id === roomId ? { ...r, name: newName.trim() } : r)),
    );
    setRenameRoomId(null);
  };

  const handleLeaveRoom = (roomId: string) => {
    setRooms((prev) => prev.filter((r) => r.id !== roomId));
    if (activeRoomId === roomId) {
      setActiveRoomId(`room-general-${projectId ?? ''}`);
    }
    setDropdownRoomId(null);
  };

  const handleDeleteRoom = (roomId: string) => {
    setRooms((prev) => prev.filter((r) => r.id !== roomId));
    if (activeRoomId === roomId) {
      setActiveRoomId(`room-general-${projectId ?? ''}`);
    }
    setDropdownRoomId(null);
  };

  const handleOpenDM = (member: Member) => {
    const dmId = `dm-${member.id}`;
    const existing = rooms.find((r) => r.id === dmId);
    if (existing) {
      setActiveRoomId(dmId);
      return;
    }
    const currentUser = allMembers.find((m) => m.id === CURRENT_USER_ID) ?? allMembers[0];
    const newRoom: ChatRoom = {
      id: dmId,
      projectId: projectId!,
      name: member.name,
      type: 'direct',
      members: [currentUser, member],
      createdAt: new Date().toISOString(),
    };
    setRooms((prev) => [...prev, newRoom]);
    setActiveRoomId(dmId);
  };

  const onlineIds = new Set(allMembers.slice(0, 3).map((m) => m.id));
  const projectMembers = allMembers;

  const getRoomIcon = (room: ChatRoom) => {
    if (room.type === 'direct') {
      const other = room.members.find((m) => m.id !== CURRENT_USER_ID) ?? room.members[0];
      return (
        <ProjectMemberAvatar
          member={other}
          projectMembers={projectMembers}
          size="sm"
          online={onlineIds.has(other.id)}
        />
      );
    }
    if (room.type === 'general') {
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary">
          <Users className="h-4 w-4" />
        </div>
      );
    }
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        <Hash className="h-4 w-4" />
      </div>
    );
  };

  const getLastMessage = (roomId: string) => {
    const msgs = allMessages.filter((m) => m.roomId === roomId);
    return msgs[msgs.length - 1];
  };

  const getDmRoomForMember = (member: Member) =>
    rooms.find((r) => r.type === 'direct' && r.members.some((m) => m.id === member.id));

  const getRoomDropdown = (room: ChatRoom) => {
    if (room.type === 'direct') return null;
    if (dropdownRoomId !== room.id) return null;
    return (
      <div
        ref={dropdownRef}
        className="absolute right-0 top-full z-50 mt-1 w-48 rounded-xl border border-border bg-surface p-1 shadow-xl"
      >
        {room.type === 'general' ? (
          <p className="px-3 py-2 text-xs text-ink-muted">{t('channel_general_cant_edit')}</p>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                setDropdownRoomId(null);
                setRenameRoomId(room.id);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink transition-colors hover:bg-canvas"
            >
              <Pencil className="h-4 w-4 text-ink-muted" />
              {t('rename_channel_action')}
            </button>
            <button
              type="button"
              onClick={() => handleLeaveRoom(room.id)}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-danger transition-colors hover:bg-canvas"
            >
              <LogOut className="h-4 w-4" />
              {t('leave_channel_action')}
            </button>
            <div className="my-1 border-t border-border" />
            <button
              type="button"
              onClick={() => handleDeleteRoom(room.id)}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-danger transition-colors hover:bg-canvas"
            >
              <Trash2 className="h-4 w-4" />
              {t('delete_channel_action')}
            </button>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] gap-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
      {/* Left: Room list */}
      <div className="flex w-72 flex-shrink-0 flex-col border-r border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">{t('chat')}</h2>
          </div>
          {(!loadingRooms || rooms.length > 0) && (
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            title={t('create_channel')}
          >
            <Plus className="h-5 w-5" />
          </button>
          )}
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('search_conversation')}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Room list */}
        <div className="flex-1 overflow-y-auto px-2 py-1">
          {/* Channels */}
          <p className="mb-1 mt-2 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t('channels')}
          </p>
          {filteredChannels.map((room) => {
            const last = getLastMessage(room.id);
            const isActive = room.id === activeRoomId;
            return (
              <div key={room.id} className="relative">
                <button
                  type="button"
                  onClick={() => setActiveRoomId(room.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                    isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {getRoomIcon(room)}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className={`truncate text-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>
                        {room.name}
                      </span>
                      <span className="text-xs text-slate-400">{room.members.length}</span>
                    </div>
                    {last && (
                      <p className="truncate text-xs text-slate-400">
                        {last.sender !== 'ai' && last.sender ? `${last.sender.name.split(' ')[0]}: ` : ''}
                        {last.content}
                      </p>
                    )}
                  </div>
                </button>

                {/* Dropdown per channel */}
                <div className="absolute right-1 top-1/2 -translate-y-1/2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDropdownRoomId(dropdownRoomId === room.id ? null : room.id);
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
                    aria-label={t('actions')}
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </button>
                  {getRoomDropdown(room)}
                </div>
              </div>
            );
          })}

          {/* Direct Messages */}
          <p className="mb-1 mt-4 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t('direct_messages')}
          </p>
          {filteredDmMembers.map((member) => {
            const dmRoom = getDmRoomForMember(member);
            const last = dmRoom ? getLastMessage(dmRoom.id) : null;
            const isActive = dmRoom?.id === activeRoomId;
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => handleOpenDM(member)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                  isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <ProjectMemberAvatar
                  member={member}
                  projectMembers={projectMembers}
                  size="sm"
                  online={onlineIds.has(member.id)}
                />
                <div className="min-w-0 flex-1">
                  <span className={`block truncate text-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>
                    {member.name}
                  </span>
                  {last && (
                    <p className="truncate text-xs text-slate-400">{last.content}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: Chat area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {activeRoom ? (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-3">
              {getRoomIcon(activeRoom)}
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-slate-900">{activeRoom.name}</h3>
                <p className="text-xs text-slate-500">
                  {activeRoom.type === 'direct'
                    ? t('direct_message')
                    : `${activeRoom.members.length} ${t('members').toLowerCase()}`}
                </p>
              </div>

              {/* Room members avatars */}
              <div className="flex -space-x-2">
                {activeRoom.members.slice(0, 4).map((m) => (
                  <ProjectMemberAvatar
                    key={m.id}
                    member={m}
                    projectMembers={projectMembers}
                    size="sm"
                    online={onlineIds.has(m.id)}
                  />
                ))}
                {activeRoom.members.length > 4 && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-xs font-medium text-slate-600">
                    +{activeRoom.members.length - 4}
                  </div>
                )}
              </div>
            </div>

            {/* Messages */}
            <div ref={listRef} className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-5 space-y-4">
              {roomMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <MessageCircle className="mb-3 h-10 w-10" />
                  <p className="text-sm font-medium">{t('no_messages')}</p>
                  <p className="text-xs">{t('start_conversation')}</p>
                </div>
              )}
              {roomMessages.map((msg) => (
                <ChatMessageBubble
                  key={msg.id}
                  message={msg}
                  isOwn={msg.sender !== 'ai' && msg.sender !== null && msg.sender.id === CURRENT_USER_ID}
                  projectMembers={projectMembers}
                />
              ))}
            </div>

            {/* Input */}
            <div className="shrink-0 border-t border-slate-200 p-4">
              <div className="flex min-w-0 gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder={`${t('send_message')} ${activeRoom.name}...`}
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <Button variant="primary" size="md" onClick={handleSend} aria-label={t('send_message')}>
                  <Send className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-slate-400">
            <p>{t('select_conversation')}</p>
          </div>
        )}
      </div>

      {/* Create Channel Modal */}
      {showCreateModal && (
        <CreateChannelModal
          members={allMembers}
          projectMembers={projectMembers}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateChannel}
        />
      )}

      {/* Rename Channel Modal */}
      {renameRoomId && (
        <RenameChannelModal
          room={rooms.find((r) => r.id === renameRoomId)!}
          onRename={handleRenameRoom}
          onClose={() => setRenameRoomId(null)}
        />
      )}
    </div>
  );
}

interface CreateChannelModalProps {
  members: Member[];
  projectMembers?: Member[];
  onClose: () => void;
  onCreate: (name: string, memberIds: string[]) => void;
}

function CreateChannelModal({ members, projectMembers = [], onClose, onCreate }: CreateChannelModalProps) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const otherMembers = members.filter((m) => m.id !== CURRENT_USER_ID);

  const toggleMember = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    if (selectedIds.length === 0) return;
    onCreate(name.trim(), selectedIds);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">{t('new_channel')}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-slate-700">{t('channel_name')}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('channel_name_placeholder')}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="mb-5">
          <label className="mb-2 block text-sm font-medium text-slate-700">{t('add_members')}</label>
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
            {otherMembers.map((m) => {
              const selected = selectedIds.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleMember(m.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                    selected ? 'bg-primary-50 text-primary' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <ProjectMemberAvatar member={m} projectMembers={projectMembers} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{m.name}</p>
                    <p className="truncate text-xs text-slate-400">{m.email}</p>
                  </div>
                  {selected && <Badge variant="primary">{t('selected')}</Badge>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="md" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            disabled={selectedIds.length === 0 || !name.trim()}
          >
          {t('create_channel_btn')}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface RenameChannelModalProps {
  room: ChatRoom;
  onRename: (roomId: string, newName: string) => void;
  onClose: () => void;
}

function RenameChannelModal({ room, onRename, onClose }: RenameChannelModalProps) {
  const { t } = useLanguage();
  const [name, setName] = useState(room.name);

  const handleSubmit = () => {
    if (!name.trim() || name === room.name) return;
    onRename(room.id, name.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">{t('rename_channel')}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-1 text-xs text-ink-muted">
          {t('channels')}: <span className="font-medium text-ink">{room.name}</span>
        </div>

        <div className="mb-5">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('new_channel_name')}</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder={t('new_channel_name')}
              className="ez-input flex-1"
              autoFocus
            />
            <Button
              variant="primary"
              size="md"
              onClick={handleSubmit}
              disabled={!name.trim() || name === room.name}
              aria-label={t('save')}
            >
              <Check className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="secondary" size="md" onClick={onClose}>
            {t('cancel')}
          </Button>
        </div>
      </div>
    </div>
  );
}
