import { Sparkles } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '@/types';
import { ProjectMemberAvatar } from '@/components/ui';

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  if (diffHour < 24) return `${diffHour} giờ trước`;
  if (diffDay < 7) return `${diffDay} ngày trước`;
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

interface ChatMessageProps {
  message: ChatMessageType;
  isOwn: boolean;
  projectMembers?: import('@/types').ProjectMember[];
}

export default function ChatMessage({ message, isOwn, projectMembers = [] }: ChatMessageProps) {
  const sender = message.sender;
  const isAI = sender === 'ai';
  const senderName = isAI ? 'Chatbot AI' : sender.name;

  return (
    <div className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
      <div className="flex-shrink-0">
        {isAI ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-violet-600">
            <Sparkles className="h-4 w-4" aria-hidden />
          </div>
        ) : (
          <ProjectMemberAvatar member={message.sender as import('@/types').Member} projectMembers={projectMembers} size="sm" />
        )}
      </div>
      <div className={`flex min-w-0 max-w-[85%] flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
        <span className="mb-0.5 text-xs font-medium text-slate-600">{senderName}</span>
        <div
          className={`rounded-2xl px-4 py-2.5 ${
            isOwn
              ? 'bg-primary text-white'
              : isAI
                ? 'bg-violet-100 text-violet-900'
                : 'bg-slate-100 text-slate-900'
          }`}
        >
          <p className="text-sm leading-relaxed break-words">{message.content}</p>
        </div>
        <span className="mt-0.5 text-xs text-slate-500">{formatRelativeTime(message.timestamp)}</span>
      </div>
    </div>
  );
}
