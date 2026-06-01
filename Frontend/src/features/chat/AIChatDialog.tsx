import { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, X, Send, Bot } from 'lucide-react';
import type { ChatMessage } from '@/types';
import ChatMessageBubble from './ChatMessage';
import Button from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { chatAI } from '@/api/chat.api';

interface AIChatDialogProps {
  projectId: string;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  roomId: 'ai',
  sender: 'ai',
  content:
    'Chao! Toi la tro ly AI cua du an. Ban co the hoi toi ve: nhien vu, thanh vien, deadline, tien do, kenh chat. Hay dat cau hoi ngay!',
  timestamp: new Date().toISOString(),
  channel: 'ai',
};

const ERROR_MESSAGE: ChatMessage = {
  id: 'error',
  roomId: 'ai',
  sender: 'ai',
  content: 'Da xay ra loi. Vui long thu lai.',
  timestamp: new Date().toISOString(),
  channel: 'ai',
};

export default function AIChatDialog({ projectId }: AIChatDialogProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    didMove: boolean;
    toggleOnClick: boolean;
  } | null>(null);

  useEffect(() => {
    if (isOpen && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [isOpen, messages]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('button[aria-label="Dong"]')) return;
      const isButton = !!t.closest('button[aria-label*="Chatbot AI"]');
      const isHeader = !!t.closest('[data-drag-header]');
      if (!isButton && !isHeader) return;
      e.preventDefault();
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origX: pos.x,
        origY: pos.y,
        didMove: false,
        toggleOnClick: isButton,
      };
    },
    [pos],
  );

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragRef.current.didMove = true;
      setPos({ x: dragRef.current.origX + dx, y: dragRef.current.origY + dy });
    };
    const handleUp = () => {
      const ref = dragRef.current;
      dragRef.current = null;
      if (ref && !ref.didMove && ref.toggleOnClick) setIsOpen((p) => !p);
    };
    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleUp);
    return () => {
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleUp);
    };
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || !projectId) return;

    const userMessage: ChatMessage = {
      id: `ai-user-${Date.now()}`,
      roomId: 'ai',
      sender: null,
      content: trimmed,
      timestamp: new Date().toISOString(),
      channel: 'ai',
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatAI(projectId, trimmed);
      const aiMessage: ChatMessage = {
        id: `ai-resp-${Date.now()}`,
        roomId: 'ai',
        sender: 'ai',
        content: response.content,
        timestamp: response.timestamp,
        channel: 'ai',
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch {
      setMessages((prev) => [...prev, ERROR_MESSAGE]);
    } finally {
      setIsLoading(false);
    }
  }, [input, projectId]);

  const btnStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 24,
    right: 24,
    transform: `translate(${pos.x}px, ${pos.y}px)`,
    zIndex: 50,
    touchAction: 'none',
  };

  const chatStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 88,
    right: 24,
    transform: `translate(${pos.x}px, ${pos.y}px)`,
    zIndex: 50,
  };

  return (
    <>
      {/* Draggable floating button */}
      <button
        type="button"
        style={btnStyle}
        onPointerDown={handlePointerDown}
        className={`group relative flex h-14 w-14 cursor-grab items-center justify-center rounded-2xl bg-[linear-gradient(145deg,#163B72,#274C7D)] text-white shadow-[0_18px_34px_-14px_rgba(22,59,114,0.8)] transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_22px_38px_-16px_rgba(22,59,114,0.85)] active:cursor-grabbing touch-none ${
          isOpen ? 'ring-4 ring-[#B8C9E2]' : ''
        }`}
        aria-label={isOpen ? 'Dong Chatbot AI' : 'Mo Chatbot AI'}
      >
        {isLoading ? (
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <Bot className="h-7 w-7 pointer-events-none" aria-hidden />
        )}
        <span className="animate-ez-green-pulse pointer-events-none absolute -right-0.5 -top-0.5 inline-flex h-3.5 w-3.5 rounded-full border-2 border-white bg-[#6DBE45] shadow-[0_0_0_4px_rgba(109,190,69,0.22)]" />
      </button>

      {/* Chat window */}
      {isOpen && (
        <div
          style={chatStyle}
          className="flex h-[500px] w-96 flex-col overflow-hidden rounded-2xl border border-[#D5E1F0] bg-white/95 shadow-[0_30px_48px_-24px_rgba(22,59,114,0.45)] backdrop-blur-xl touch-none"
        >
          {/* Header */}
          <div
            data-drag-header
            role="presentation"
            onPointerDown={handlePointerDown}
            className="flex cursor-grab active:cursor-grabbing items-center justify-between border-b border-[#274C7D]/20 bg-[linear-gradient(135deg,#163B72,#274C7D)] px-4 py-3 text-white"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#DCE8F7]" aria-hidden />
              <h3 className="text-sm font-semibold text-white">Chatbot AI</h3>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Dong"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>

          {/* Messages */}
          <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <ChatMessageBubble
                key={msg.id}
                message={msg}
                isOwn={msg.sender !== 'ai' && msg.sender !== null && (msg.sender as { id?: string }).id === user?.id}
              />
            ))}
            {isLoading && (
              <div className="flex gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100">
                  <Sparkles className="h-4 w-4 text-violet-600" />
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-2.5">
                  <div className="flex gap-1">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '0ms' }} />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '150ms' }} />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-[#DCE4F0] bg-white/70 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Hoi toi bat cu dieu gi..."
                disabled={isLoading}
                className="flex-1 rounded-xl border border-[#D6DFEC] px-4 py-2.5 text-sm placeholder:text-slate-400 focus:border-[#274C7D] focus:outline-none focus:ring-2 focus:ring-[#274C7D]/20 disabled:opacity-50"
              />
              <Button
                variant="primary"
                size="md"
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="bg-[#163B72] px-4 hover:bg-[#0F2D57] disabled:opacity-50"
                aria-label="Gui"
              >
                <Send className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
