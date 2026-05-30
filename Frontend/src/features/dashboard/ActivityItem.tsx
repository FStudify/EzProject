import type { Activity } from '@/api/types';
import Avatar from '@/components/ui/Avatar';

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

interface ActivityItemProps {
  activity: Activity;
}

export default function ActivityItem({ activity }: ActivityItemProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-slate-50">
      <Avatar src={activity.user.avatar ?? undefined} name={activity.user.fullName} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-700">
          <span className="font-medium text-slate-900">{activity.user.fullName}</span>{' '}
          {activity.action}{' '}
          <span className="font-medium text-slate-800">{activity.target}</span>
        </p>
      </div>
      <span className="shrink-0 text-xs text-slate-500 tabular-nums">
        {formatRelativeTime(activity.timestamp)}
      </span>
    </div>
  );
}
