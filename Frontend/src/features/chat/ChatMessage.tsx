import { Sparkles } from 'lucide-react';
import RichMessageRenderer from './components/RichMessageRenderer';
import type { ChatMessage as ChatMessageType, Member } from '@/types';
import Avatar from '@/components/ui/Avatar';

function sanitizeMessage(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/ {3,}/g, ' ')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

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
}

export default function ChatMessage({ message, isOwn }: ChatMessageProps) {
  const sender = message.sender;
  const isAI = sender === 'ai';
  const senderObj = !isAI && sender ? (sender as Member) : null;
  const senderName = isAI ? 'Chatbot AI' : (senderObj?.name ?? senderObj?.fullName ?? 'Unknown');

  return (
    <div className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
      <div className="flex-shrink-0">
        {isAI ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-violet-600">
            <Sparkles className="h-4 w-4" aria-hidden />
          </div>
        ) : senderObj ? (
          <Avatar name={senderObj.name ?? senderObj.fullName ?? 'User'} src={senderObj.avatar ?? undefined} size="sm" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-500">
            ?
          </div>
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
          {isAI ? (
            <RichMessageRenderer content={sanitizeMessage(message.content)} />
          ) : (
            <div className="break-words text-sm leading-relaxed">
              <RichMessageRenderer
                content={sanitizeMessage(message.content)}
              />
            </div>
          )}
        </div>
        <span className="mt-0.5 text-xs text-slate-500">{formatRelativeTime(message.timestamp)}</span>
      </div>
    </div>
  );
}
