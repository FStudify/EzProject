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
import type { ChatMessage } from '@/types';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
  isConnected: boolean;
}

const ChatSocketContext = createContext<ChatSocketValue | null>(null);

export function ChatSocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const newMessageCbsRef = useRef<NewMessageCallback[]>([]);
  const typingCbsRef = useRef<TypingCallback[]>([]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

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

    socket.on('error', (data: { message: string }) => {
      console.warn('[ChatSocket] error:', data.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, []);

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

  return (
    <ChatSocketContext.Provider value={{ socket: socketRef.current, joinRoom, leaveRoom, sendMessage, onNewMessage, onTyping, emitTyping, isConnected }}>
      {children}
    </ChatSocketContext.Provider>
  );
}

export function useChatSocket(): ChatSocketValue {
  const ctx = useContext(ChatSocketContext);
  if (!ctx) throw new Error('useChatSocket must be used inside <ChatSocketProvider>');
  return ctx;
}
