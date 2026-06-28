/**
 * ============================================================
 * ChatSocketContext — Socket.io real-time chat
 * ============================================================
 *
 * - Connects on mount using JWT from localStorage
 * - Auto-joins/leaves rooms based on activeRoomId
 * - Provides sendMessage() and onNewMessage() callback
 * - Handles typing indicators
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import { getAccessToken } from '@/api/config';
import { useAuth } from '@/contexts/AuthContext';
import type { ChatMessage } from '@/types';

function getSocketUrl() {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  return apiUrl.replace(/\/api\/v1\/?$/, '');
}

const SOCKET_URL = getSocketUrl();

interface IncomingSocketMessage {
  _id: string;
  roomId: string;
  sender: {
    _id: string;
    id: string;
    fullName: string;
    avatar: string | null;
  };
  content: string;
  channel: string;
  targetId?: string;
  timestamp: string;
}

type NewMessageCallback = (msg: {
  id: string;
  roomId: string;
  sender: { id: string; name: string; fullName: string; email?: string; avatar: string | null };
  content: string;
  channel: string;
  timestamp: string;
}) => void;

interface TypingCallback {
  (data: { userId: string; fullName: string; isTyping: boolean }): void;
}

interface ChatSocketValue {
  /** Raw socket for project-level events (meetings, etc.) */
  socket: Socket | null;
  /** Join a chat room to receive messages for that room only */
  joinRoom: (roomId: string, projectId: string) => void;
  /** Leave a chat room */
  leaveRoom: (roomId: string) => void;
  /** Send a message via socket (saves to DB + broadcasts) */
  sendMessage: (roomId: string, projectId: string, content: string, channel?: string) => void;
  /** Register a callback for incoming messages */
  onNewMessage: (cb: NewMessageCallback) => () => void;
  /** Register a callback for typing indicators */
  onTyping: (cb: TypingCallback) => () => void;
  /** Emit typing status */
  emitTyping: (roomId: string, isTyping: boolean) => void;
  /**
   * Subscribe to a project to receive project-wide real-time events
   * (member joined/removed, project updates, etc.).
   * Returns an unsubscribe function.
   */
  joinProject: (projectId: string) => void;
  /** Unsubscribe from a project */
  leaveProject: (projectId: string) => void;
  isConnected: boolean;
}

const ChatSocketContext = createContext<ChatSocketValue | null>(null);

export function ChatSocketProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const newMessageCbsRef = useRef<NewMessageCallback[]>([]);
  const typingCbsRef = useRef<TypingCallback[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
      return;
    }

    const token = getAccessToken();
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;
    setSocket(socket);

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('connect_error', () => setIsConnected(false));

    socket.on('new_message', (data: IncomingSocketMessage) => {
      const sender = data.sender;
      const msg = {
        id: data._id,
        roomId: data.roomId,
        sender: {
          id: sender._id || sender.id,
          name: sender.fullName,
          fullName: sender.fullName,
          avatar: sender.avatar,
        },
        content: data.content,
        channel: (data.channel || 'GROUP').toLowerCase() as ChatMessage['channel'],
        timestamp: data.timestamp,
      };
      newMessageCbsRef.current.forEach((cb) => cb(msg));
    });

    socket.on('user_typing', (data: { userId: string; fullName: string; isTyping: boolean }) => {
      typingCbsRef.current.forEach((cb) => cb(data));
    });

    // Real-time invitation notification — owner just invited this user.
    // We re-dispatch a window CustomEvent so any feature/component can listen
    // without coupling to the socket context directly.
    socket.on('invitation:new', (data: unknown) => {
      try {
        window.dispatchEvent(new CustomEvent('invitation:new', { detail: data }));
      } catch (err) {
        console.warn('[ChatSocket] failed to dispatch invitation:new', err);
      }
    });

    // When an invitee accepts/declines our invite, push a window event so
    // the bell drawer can update the notification list in real-time.
    socket.on('invitation:response', (data: unknown) => {
      try {
        window.dispatchEvent(new CustomEvent('invitation:response', { detail: data }));
      } catch (err) {
        console.warn('[ChatSocket] failed to dispatch invitation:response', err);
      }
    });

    // Project-wide events: broadcast to all members when someone joins/leaves.
    // Each feature component listens via window events so it can refresh its view
    // without coupling to the socket context directly.
    socket.on('project:member:joined', (data: unknown) => {
      try {
        window.dispatchEvent(new CustomEvent('project:member:joined', { detail: data }));
      } catch (err) {
        console.warn('[ChatSocket] failed to dispatch project:member:joined', err);
      }
    });

    socket.on('project:member:removed', (data: unknown) => {
      try {
        window.dispatchEvent(new CustomEvent('project:member:removed', { detail: data }));
      } catch (err) {
        console.warn('[ChatSocket] failed to dispatch project:member:removed', err);
      }
    });

    socket.on('error', (data: { message: string }) => {
      console.warn('[ChatSocket] error:', data.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    };
  }, [isAuthenticated]);

  const joinRoom = useCallback((roomId: string, projectId: string) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('join_room', { roomId, projectId });
  }, []);

  const leaveRoom = useCallback((roomId: string) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('leave_room', { roomId });
  }, []);

  const sendMessage = useCallback(
    (roomId: string, projectId: string, content: string, channel = 'GROUP') => {
      if (!socketRef.current?.connected) {
        console.warn('[ChatSocket] not connected, cannot send message');
        return;
      }
      socketRef.current.emit('send_message', { roomId, projectId, content, channel });
    },
    [],
  );

  const emitTyping = useCallback((roomId: string, isTyping: boolean) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('typing', { roomId, isTyping });
  }, []);

  const onNewMessage = useCallback((cb: NewMessageCallback) => {
    newMessageCbsRef.current.push(cb);
    return () => {
      newMessageCbsRef.current = newMessageCbsRef.current.filter((x) => x !== cb);
    };
  }, []);

  const onTyping = useCallback((cb: TypingCallback) => {
    typingCbsRef.current.push(cb);
    return () => {
      typingCbsRef.current = typingCbsRef.current.filter((x) => x !== cb);
    };
  }, []);

  // ── Project room subscription ────────────────────────────────────────────
  // Required so the client receives project-wide events (member:joined, member:removed)
  // broadcast by the backend. Re-emits automatically when the socket reconnects.
  const joinedProjectsRef = useRef<Set<string>>(new Set());

  const joinProject = useCallback((projectId: string) => {
    joinedProjectsRef.current.add(projectId);
    const sock = socketRef.current;
    if (!sock?.connected) return;
    sock.emit('join_project', { projectId });
  }, []);

  const leaveProject = useCallback((projectId: string) => {
    joinedProjectsRef.current.delete(projectId);
    const sock = socketRef.current;
    if (!sock?.connected) return;
    sock.emit('leave_project', { projectId });
  }, []);

  // After (re)connect, re-subscribe to all projects we want to follow.
  useEffect(() => {
    const sock = socketRef.current;
    if (!sock) return;
    const rejoin = () => {
      joinedProjectsRef.current.forEach((projectId) => {
        sock.emit('join_project', { projectId });
      });
    };
    sock.on('connect', rejoin);
    return () => {
      sock.off('connect', rejoin);
    };
  }, [socket]);

  return (
    <ChatSocketContext.Provider value={{
      socket,
      joinRoom,
      leaveRoom,
      sendMessage,
      onNewMessage,
      onTyping,
      emitTyping,
      joinProject,
      leaveProject,
      isConnected,
    }}>
      {children}
    </ChatSocketContext.Provider>
  );
}

export function useChatSocket(): ChatSocketValue {
  const ctx = useContext(ChatSocketContext);
  if (!ctx) throw new Error('useChatSocket must be used inside <ChatSocketProvider>');
  return ctx;
}
