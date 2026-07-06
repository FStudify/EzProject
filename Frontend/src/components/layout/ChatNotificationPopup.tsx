import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, MessageCircle } from 'lucide-react';
import type { ChatMessage } from '@/types';
import Avatar from '@/components/ui/Avatar';

interface PopupItem {
  id: string;
  message: ChatMessage;
  createdAt: number;
}

export default function ChatNotificationPopup() {
  const [popups, setPopups] = useState<PopupItem[]>([]);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleNewMessage = (e: Event) => {
      const customEvent = e as CustomEvent<ChatMessage>;
      const msg = customEvent.detail;
      
      // Do not show popup if it's from the current user
      const currentUserId = localStorage.getItem('userId');
      if (currentUserId && typeof msg.sender !== 'string' && msg.sender?.id === currentUserId) return;
      
      // Do not show popup if AI
      if (msg.sender === 'ai' || !msg.sender) return;

      if (msg.projectId && location.pathname.includes(`/app/projects/${msg.projectId}/chat`)) {
        const activeRoom = localStorage.getItem(`ez_active_chat_room_${msg.projectId}`);
        if (activeRoom === msg.roomId) {
          return;
        }
      }

      // Check mute state from localStorage (synced by ChatPage / API)
      const muteKey = `mute_${msg.roomId}`;
      const mutedUntil = localStorage.getItem(muteKey);
      if (mutedUntil && new Date(mutedUntil).getTime() > Date.now()) {
        return; // Suppressed by mute
      }

      const id = `popup-${Date.now()}-${Math.random()}`;
      setPopups((prev) => {
        // Max 3 popups visible
        const next = [...prev, { id, message: msg, createdAt: Date.now() }];
        if (next.length > 3) return next.slice(next.length - 3);
        return next;
      });

      // Auto dismiss after 3s
      setTimeout(() => {
        setPopups((prev) => prev.filter((p) => p.id !== id));
      }, 3000);
    };

    window.addEventListener('chat:new_message', handleNewMessage);
    return () => window.removeEventListener('chat:new_message', handleNewMessage);
  }, [location]);

  const handleClose = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPopups((prev) => prev.filter((p) => p.id !== id));
  };

  const handleClick = (msg: ChatMessage) => {
    if (msg.projectId) {
      // Save to localStorage so ChatPage picks it up
      localStorage.setItem(`ez_active_chat_room_${msg.projectId}`, msg.roomId);
      navigate(`/app/projects/${msg.projectId}/chat`);
    }
  };

  if (popups.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
      {popups.map((popup) => {
        const senderName = typeof popup.message.sender !== 'string' ? popup.message.sender?.fullName : 'Unknown';
        const avatar = typeof popup.message.sender !== 'string' ? popup.message.sender?.avatar : undefined;
        
        return (
          <div
            key={popup.id}
            onClick={() => handleClick(popup.message)}
            className="group relative flex w-80 cursor-pointer items-start gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-xl transition-all hover:bg-slate-50 hover:shadow-2xl animate-in slide-in-from-right-8 fade-in duration-300"
          >
            <div className="relative shrink-0 mt-0.5">
              <Avatar name={senderName ?? '?'} src={avatar ?? undefined} size="md" />
              <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-blue-500">
                <MessageCircle className="h-3 w-3 text-white" />
              </div>
            </div>
            
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-center justify-between">
                <span className="truncate text-sm font-bold text-slate-900">{senderName}</span>
                <span className="shrink-0 text-xs text-slate-500">Bây giờ</span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                {popup.message.content}
              </p>
            </div>

            <button
              onClick={(e) => handleClose(popup.id, e)}
              className="absolute right-2 top-2 rounded-full p-1 text-slate-400 opacity-0 transition-opacity hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
