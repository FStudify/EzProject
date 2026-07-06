import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getChatRooms } from '@/api/chat.api';
import { useChatSocket } from '@/contexts/ChatSocketContext';
import { X, Send } from 'lucide-react';
import { Button } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import type { ChatRoom } from '@/types';

interface ShareDialogProps {
  title: string;
  sharePayload: string; // e.g., "[Task Name](task://taskId)"
  onClose: () => void;
}

export default function ShareDialog({ title, sharePayload, onClose }: ShareDialogProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const { sendMessage } = useChatSocket();
  const { user } = useAuth();
  const currentUserId = user?.id;
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Look up the selected room's channel type to send correctly for direct messages.
  // Note: room.type comes from the API in UPPERCASE ("DIRECT", "CHANNEL", "GENERAL").
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);
  const channel = (selectedRoom?.type ?? '').toLowerCase() === 'direct' ? 'DIRECT' : 'GROUP';

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    getChatRooms(projectId)
      .then((data) => {
        const allRooms = [...data.general, ...data.channels, ...data.direct];
        setRooms(allRooms);
        if (allRooms.length > 0) setSelectedRoomId(allRooms[0].id);
      })
      .catch((err) => console.error('Failed to load chat rooms:', err))
      .finally(() => setLoading(false));
  }, [projectId]);

  const handleShare = async () => {
    if (!projectId || !selectedRoomId || !sharePayload) return;
    setSending(true);
    try {
      sendMessage(selectedRoomId, projectId, sharePayload, channel);
      onClose();
    } catch (err) {
      console.error('Failed to share:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6">
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Select conversation
            </label>
            {loading ? (
              <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
            ) : (
              <select
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {rooms.map((room) => {
                  let displayName = room.name;
                  if (room.type === 'direct' && room.members) {
                    const other = room.members.find(m => m.id !== currentUserId);
                    if (other) displayName = other.name || other.fullName;
                  }
                  return (
                    <option key={room.id} value={room.id}>
                      {room.type === 'general' ? '💬 ' : room.type === 'direct' ? '👤 ' : '🏷️ '}
                      {displayName}
                    </option>
                  );
                })}
              </select>
            )}
          </div>
          
          <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            Preview will be generated in the chat.
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="accent"
              onClick={handleShare}
              disabled={!selectedRoomId || sending}
            >
              {sending ? 'Sending...' : 'Share'}
              <Send className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
