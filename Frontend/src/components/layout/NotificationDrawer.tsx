import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckSquare, FileText, Inbox, MessageCircle, Video } from 'lucide-react';
import { Drawer, SkeletonList } from '@/components/ui';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/api/user.api';
import type { NotificationType } from '@/api/types';
import type { AppNotification } from '@/types';

type FilterTab = 'all' | 'unread' | Lowercase<NotificationType>;

export const NOTIFICATIONS_UPDATED_EVENT = 'notifications:updated';

const TYPE_ICONS: Record<Lowercase<NotificationType>, typeof Bell> = {
  task: CheckSquare,
  meeting: Video,
  chat: MessageCircle,
  document: FileText,
};

const TYPE_LABELS: Record<Lowercase<NotificationType>, string> = {
  task: 'Task',
  meeting: 'Họp',
  chat: 'Chat',
  document: 'Tài liệu',
};

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

type ApiNotification = {
  id?: string;
  _id?: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

function formatTime(iso: string): string {
  const timestamp = new Date(iso).getTime();
  if (Number.isNaN(timestamp)) return '';

  const diff = Date.now() - timestamp;
  if (diff < 0) return 'Sắp diễn ra';

  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);

  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  if (days < 7) return `${days} ngày trước`;

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(timestamp));
}

function normalizeNotification(notification: ApiNotification): AppNotification {
  const type = notification.type.toLowerCase();

  return {
    ...notification,
    id: notification.id ?? notification._id ?? '',
    type: (type in TYPE_LABELS ? type : 'chat') as AppNotification['type'],
    link: normalizeNotificationLink(notification.link, type),
  };
}

function emitUnreadCount(unreadCount: number) {
  window.dispatchEvent(
    new CustomEvent(NOTIFICATIONS_UPDATED_EVENT, {
      detail: { unreadCount },
    }),
  );
}

function normalizeNotificationLink(link: string | null, type: string): string | null {
  if (!link) return null;
  if (link.startsWith('/app/')) return link;

  if (link.startsWith('/projects/')) {
    return `/app${link}`;
  }

  // Legacy seed/data links such as /meetings/1 or /tasks/2 do not contain a
  // projectId, so they cannot resolve to the nested project route directly.
  if (link.startsWith('/meetings')) return '/app/projects';
  if (link.startsWith('/tasks')) return '/app/projects';
  if (link.startsWith('/documents')) return '/app/projects';
  if (link.startsWith('/chat')) return '/app/projects';

  if (type === 'meeting' || type === 'task' || type === 'document' || type === 'chat') {
    return '/app/projects';
  }

  return null;
}

export default function NotificationDrawer({ isOpen, onClose }: NotificationDrawerProps) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [tab, setTab] = useState<FilterTab>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const fetchNotifications = async () => {
    try {
      const data = await getNotifications();
      setItems(data.notifications.map(normalizeNotification));
      emitUnreadCount(data.unreadCount);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      void fetchNotifications();
    }
  }, [isOpen]);

  const filtered = useMemo(() => {
    if (tab === 'unread') return items.filter((n) => !n.read);
    if (tab === 'all') return items;
    return items.filter((n) => n.type === tab);
  }, [items, tab]);

  const unreadCount = items.filter((n) => !n.read).length;

  const typeCounts = useMemo(
    () =>
      items.reduce<Record<Lowercase<NotificationType>, number>>(
        (acc, n) => {
          acc[n.type] += 1;
          return acc;
        },
        { task: 0, meeting: 0, chat: 0, document: 0 },
      ),
    [items],
  );

  const markAllRead = async () => {
    const previous = items;
    setIsMarkingAll(true);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    emitUnreadCount(0);

    try {
      await markAllNotificationsRead();
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      setItems(previous);
      emitUnreadCount(previous.filter((n) => !n.read).length);
    } finally {
      setIsMarkingAll(false);
    }
  };

  const markRead = async (id: string) => {
    const target = items.find((n) => n.id === id);
    if (!target || target.read) return;

    const previous = items;
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    emitUnreadCount(Math.max(0, unreadCount - 1));

    try {
      await markNotificationRead(id);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      setItems(previous);
      emitUnreadCount(previous.filter((n) => !n.read).length);
    }
  };

  const tabs: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'Tất cả' },
    { id: 'unread', label: 'Chưa đọc' },
    { id: 'task', label: TYPE_LABELS.task },
    { id: 'meeting', label: TYPE_LABELS.meeting },
    { id: 'chat', label: TYPE_LABELS.chat },
    { id: 'document', label: TYPE_LABELS.document },
  ];

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Thông báo">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex flex-wrap gap-1">
          {tabs.map((currentTab) => (
            <button
              key={currentTab.id}
              type="button"
              onClick={() => setTab(currentTab.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                tab === currentTab.id
                  ? 'bg-primary text-white'
                  : 'bg-surface-muted text-ink-secondary hover:bg-primary-50'
              }`}
            >
              {currentTab.label}
              {currentTab.id === 'unread' && unreadCount > 0 && (
                <span className="ml-1 opacity-90">({unreadCount})</span>
              )}
              {currentTab.id !== 'all' &&
                currentTab.id !== 'unread' &&
                typeCounts[currentTab.id] > 0 && (
                  <span className="ml-1 opacity-75">({typeCounts[currentTab.id]})</span>
                )}
            </button>
          ))}
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => void markAllRead()}
            disabled={isMarkingAll}
            className="text-xs font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-60"
          >
            Đánh dấu đã đọc
          </button>
        )}
      </div>

      <ul className="mt-3 divide-y divide-border">
        {isLoading ? (
          <div className="py-4">
            <SkeletonList rows={5} />
          </div>
        ) : filtered.length === 0 ? (
          <li className="flex flex-col items-center gap-2 py-16 text-center text-sm text-ink-muted">
            <Inbox className="h-8 w-8 text-ink-muted/60" />
            {tab === 'unread' ? 'Không còn thông báo chưa đọc.' : 'Không có thông báo phù hợp.'}
          </li>
        ) : (
          filtered.map((notification) => (
            <NotificationRow
              key={notification.id}
              item={notification}
              onRead={() => markRead(notification.id)}
              onNavigate={onClose}
            />
          ))
        )}
      </ul>
    </Drawer>
  );
}

function NotificationRow({
  item,
  onRead,
  onNavigate,
}: {
  item: AppNotification;
  onRead: () => Promise<void>;
  onNavigate: () => void;
}) {
  const Icon = TYPE_ICONS[item.type] ?? Bell;

  const content = (
    <div className="flex gap-3 px-1 py-3">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          item.read ? 'bg-surface-muted text-ink-muted' : 'bg-primary-50 text-primary'
        }`}
      >
        <Icon className="h-4 w-4" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-start gap-2">
          <p className={`min-w-0 flex-1 text-sm ${item.read ? 'font-medium text-ink-secondary' : 'font-semibold text-ink'}`}>
            {item.title}
          </p>
          <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold text-ink-muted">
            {TYPE_LABELS[item.type] ?? 'Khác'}
          </span>
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">{item.body}</p>
        <p className="mt-1 text-[11px] text-ink-muted">{formatTime(item.createdAt)}</p>
      </div>

      {!item.read && (
        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Chưa đọc" />
      )}
    </div>
  );

  if (!item.id) {
    return (
      <li>
        <div className="block rounded-lg">{content}</div>
      </li>
    );
  }

  if (item.link) {
    return (
      <li>
        <Link
          to={item.link}
          onClick={() => {
            void onRead();
            onNavigate();
          }}
          className="block rounded-lg transition-colors hover:bg-surface-muted"
        >
          {content}
        </Link>
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => void onRead()}
        className="w-full rounded-lg text-left hover:bg-surface-muted"
      >
        {content}
      </button>
    </li>
  );
}
