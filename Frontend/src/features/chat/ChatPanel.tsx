import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, MessageCircle } from 'lucide-react';
import { getChatMessages } from '@/api/chat.api';
import type { ChatMessage } from '@/types';
import ChatMessageBubble from './ChatMessage';
import ChatInput from './components/ChatInput';

interface ChatPanelProps {
  projectId: string;
  channel: 'task' | 'document';
}

const channelLabels: Record<'task' | 'document', string> = {
  task: 'Thảo luận công việc',
  document: 'Thảo luận tài liệu',
};

export default function ChatPanel({ projectId, channel }: ChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    const roomId = channel === 'task' ? 'task-panel' : 'doc-panel';
    getChatMessages(projectId, roomId)
      .then((data) => setMessages(data.messages as ChatMessage[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen, projectId, channel]);

  useEffect(() => {
    if (isOpen && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [isOpen, messages]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [input]);

  const handleSend = useCallback((finalText?: string) => {
    const textToProcess = (typeof finalText === 'string' ? finalText : input).trim();
    if (!textToProcess) return;

    const newMessage: ChatMessage = {
      id: `msg-new-${Date.now()}`,
      roomId: channel === 'task' ? 'task-panel' : 'doc-panel',
      sender: null,
      content: textToProcess,
      timestamp: new Date().toISOString(),
      channel: channel === 'task' ? 'task' : 'document',
    };
    setMessages((prev) => [...prev, newMessage]);
    setInput('');
  }, [input, channel]);

  return (
    <>
      {/* Floating tab button when closed - fixed on right edge */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed right-0 top-1/2 z-40 flex h-14 w-8 -translate-y-1/2 items-center justify-center rounded-l-lg border border-r-0 border-slate-200 bg-white text-slate-500 shadow-lg transition-colors hover:bg-primary-50 hover:text-primary hover:border-primary/30"
          title={`Mở ${channelLabels[channel]}`}
        >
          <MessageCircle className="h-5 w-5" />
        </button>
      )}

      {/* Popup overlay - covers content when open, bring to front */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop - dims content behind, click to close */}
          <div
            className="absolute inset-0 bg-black/20 transition-opacity"
            onClick={() => setIsOpen(false)}
            aria-hidden
          />
          {/* Panel - slides in from right */}
          <div className="relative flex h-full w-80 flex-col border-l border-slate-200 bg-white shadow-2xl translate-x-0 transition-transform duration-300 ease-out">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-slate-900">{channelLabels[channel]}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                title="Đóng"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="text-xs font-medium">Đóng</span>
              </button>
            </div>

            {/* Messages */}
            <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                  <MessageCircle className="mb-2 h-8 w-8" />
                  <p className="text-xs">Chưa có tin nhắn</p>
                </div>
              )}
              {messages.map((msg) => (
                <ChatMessageBubble
                  key={msg.id}
                  message={msg}
                  isOwn={msg.sender !== 'ai' && msg.sender !== null && (msg.sender as { id: string }).id === 'mem-1'}
                />
              ))}
            </div>

            {/* Input */}
            <div className="border-t border-slate-200 p-3">
              <ChatInput 
                value={input} 
                onChange={setInput} 
                onSend={handleSend} 
                members={[]} // panel doesn't have project members easily available, would need to fetch or pass them
                placeholder="Nhập tin nhắn..." 
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
