import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui';
import type { Member } from '@/types';

interface ChatInputProps {
  value: string;
  onChange: (val: string) => void;
  onSend: (finalText?: string) => void;
  placeholder?: string;
  members: Member[];
  autoFocus?: boolean;
}

export default function ChatInput({ value, onChange, onSend, placeholder, members, autoFocus }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mentionState, setMentionState] = useState<{ active: boolean; query: string; index: number } | null>(null);
  const [selectedMentions, setSelectedMentions] = useState<Member[]>([]);

  // Clear selected mentions when value is completely cleared (after send)
  useEffect(() => {
    if (!value) setSelectedMentions([]);
  }, [value]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [value]);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  // Handle Mentions Logic
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionState?.active) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionState(prev => prev ? { ...prev, index: (prev.index + 1) % filteredMembers.length } : null);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionState(prev => prev ? { ...prev, index: (prev.index - 1 + filteredMembers.length) % filteredMembers.length } : null);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filteredMembers.length > 0) {
          insertMention(filteredMembers[mentionState.index]);
        } else {
          setMentionState(null);
        }
        return;
      }
      if (e.key === 'Escape') {
        setMentionState(null);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendClick();
    }
  };

  const handleSendClick = () => {
    let finalText = value;
    selectedMentions.forEach(m => {
      const name = m.name || m.fullName;
      // Escape regex special characters in name
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`@${escapedName}`, 'g');
      finalText = finalText.replace(regex, `[${name}](mention://${m.id})`);
    });
    onSend(finalText);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChange(val);

    // Naive mention trigger check
    const cursor = e.target.selectionStart || 0;
    const textBeforeCursor = val.slice(0, cursor);
    const match = /(?:^|\s)@([a-zA-Z0-9_\-\s]*)$/.exec(textBeforeCursor);
    
    if (match) {
      setMentionState({ active: true, query: match[1], index: 0 });
    } else {
      setMentionState(null);
    }
  };

  const filteredMembers = members
    .filter(m => {
      const name = m.name || m.fullName || '';
      return name.toLowerCase().includes((mentionState?.query || '').toLowerCase());
    })
    .slice(0, 5);

  const insertMention = (member: Member) => {
    if (!textareaRef.current || !mentionState) return;
    
    const cursor = textareaRef.current.selectionStart || 0;
    const textBeforeCursor = value.slice(0, cursor);
    const textAfterCursor = value.slice(cursor);
    
    // Find where the '@' started
    const match = /(?:^|\s)(@[a-zA-Z0-9_\-\s]*)$/.exec(textBeforeCursor);
    if (!match) {
      setMentionState(null);
      return;
    }

    const startPos = textBeforeCursor.lastIndexOf(match[1]);
    const beforeMention = value.slice(0, startPos);
    
    const mentionText = `@${member.name || member.fullName} `;
    
    const newValue = beforeMention + (beforeMention.endsWith(' ') || beforeMention.length === 0 ? '' : ' ') + mentionText + textAfterCursor;
    
    onChange(newValue);
    setMentionState(null);
    setSelectedMentions(prev => {
      if (prev.some(p => p.id === member.id)) return prev;
      return [...prev, member];
    });
    
    // Refocus and set cursor
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursor = startPos + mentionText.length + (beforeMention.endsWith(' ') || beforeMention.length === 0 ? 0 : 1);
        textareaRef.current.setSelectionRange(newCursor, newCursor);
      }
    }, 0);
  };

  return (
    <div className="relative flex min-w-0 flex-1 flex-col">
      {mentionState?.active && filteredMembers.length > 0 && (
        <div className="absolute bottom-full left-0 mb-2 w-64 rounded-lg border border-slate-200 bg-white shadow-xl max-h-48 overflow-y-auto z-50">
          <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-100 uppercase tracking-wider">
            Members
          </div>
          <ul className="py-1">
            {filteredMembers.map((m, i) => (
              <li
                key={m.id}
                className={`px-3 py-2 cursor-pointer flex items-center gap-2 text-sm ${i === mentionState.index ? 'bg-primary/10 text-primary' : 'hover:bg-slate-50 text-slate-700'}`}
                onClick={() => insertMention(m)}
                onMouseEnter={() => setMentionState(prev => prev ? { ...prev, index: i } : null)}
              >
                <div className="w-6 h-6 rounded-full bg-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center text-xs font-medium text-slate-600">
                  {m.avatar ? <img src={m.avatar} alt="avatar" className="w-full h-full object-cover" /> : (m.name || m.fullName || '?').charAt(0).toUpperCase()}
                </div>
                <span className="truncate">{m.name || m.fullName}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex gap-2 min-w-0">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || 'Nhập tin nhắn...'}
          className="min-w-0 flex-1 rounded-xl border py-2.5 pl-4 pr-4 text-sm transition-all focus:outline-none focus:ring-2 resize-none max-h-32 overflow-y-auto"
          style={{ backgroundColor: '#FFFDFB', color: '#1F1F1F', borderColor: '#E8C7AE' }}
          onFocus={e => { e.currentTarget.style.borderColor = '#D97853'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(217,120,83,0.16)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = '#E8C7AE'; e.currentTarget.style.boxShadow = ''; }}
        />
        <Button variant="accent" size="md" onClick={handleSendClick} aria-label="Gửi">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
