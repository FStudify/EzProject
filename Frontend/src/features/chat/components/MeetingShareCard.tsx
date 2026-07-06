import { Calendar, Clock, Video } from 'lucide-react';
import { Badge } from '@/components/ui';

interface MeetingShareCardProps {
  meetingId: string;
  title: string;
  date: string; // ISO string
  status: string;
}

const statusColors: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-700',
  ONGOING: 'bg-emerald-100 text-emerald-700',
  COMPLETED: 'bg-slate-100 text-slate-700',
  CANCELLED: 'bg-rose-100 text-rose-700',
};

export default function MeetingShareCard({ meetingId, title, date, status }: MeetingShareCardProps) {
  const meetingDate = new Date(date);
  const formattedDate = meetingDate.toLocaleDateString();
  const formattedTime = meetingDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleJoinMeeting = () => {
    // Navigate or open meeting modal
    window.location.href = `/meetings/${meetingId}`; // Fallback, could use react-router navigate
  };

  return (
    <div className="my-2 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md max-w-sm">
      <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
          <Video className="w-3.5 h-3.5" /> Shared Meeting
        </span>
        <Badge className={statusColors[status] || statusColors.SCHEDULED}>
          {status}
        </Badge>
      </div>
      <div className="p-4">
        <h4 className="mb-3 font-semibold text-slate-900 line-clamp-2">{title}</h4>
        
        <div className="flex flex-col gap-1.5 mb-4 text-sm text-slate-600">
          <span className="flex items-center">
            <Calendar className="mr-2 h-4 w-4 text-slate-400" />
            {formattedDate}
          </span>
          <span className="flex items-center">
            <Clock className="mr-2 h-4 w-4 text-slate-400" />
            {formattedTime}
          </span>
        </div>

        <button
          onClick={handleJoinMeeting}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
        >
          Join Meeting
        </button>
      </div>
    </div>
  );
}
