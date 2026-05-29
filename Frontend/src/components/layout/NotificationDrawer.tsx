import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckSquare, FileText, MessageCircle, Video } from 'lucide-react';
import { Drawer } from '@/components/ui';
import { getNotifications } from '@/api/user.api';
import type { AppNotification, NotificationType } from '@/types';

type FilterTab = 'all' | 'unread' | Lowercase<NotificationType>;

const TYPE_ICONS: Record<Lowercase<NotificationType>, typeof Bell> = {
  task: CheckSquare,
  meeting: Video,
  chat: MessageCircle,
  document: FileText,
};

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

export default function NotificationDrawer({ isOpen, onClose }: NotificationDrawerProps) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [tab, setTab] = useState<FilterTab>('all');
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const data = await getNotifications();
      setItems(data.notifications);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetchNotifications();
    }
  }, [isOpen]);

  const filtered = useMemo(() => {
    if (tab === 'unread') return items.filter((n) => !n.read);
    if (tab === 'all') return items;
    return items.filter((n) => n.type.toLowerCase() === tab);
  }, [items, tab]);

  const unreadCount = items.filter((n) => !n.read).length;

  const markAllRead = () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const tabs: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'Tất cả' },
    { id: 'unread', label: 'Chưa đọc' },
    { id: 'task', label: 'Task' },
    { id: 'meeting', label: 'Họp' },
    { id: 'chat', label: 'Chat' },
  ];

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Thông báo">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex flex-wrap gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                tab === t.id
                  ? 'bg-primary text-white'
                  : 'bg-surface-muted text-ink-secondary hover:bg-primary-50'
              }`}
            >
              {t.label}
              {t.id === 'unread' && unreadCount > 0 && (
                <span className="ml-1 opacity-90">({unreadCount})</span>
              )}
            </button>
          ))}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="text-xs font-medium text-primary hover:underline"
          >
            Đánh dấu đã đọc
          </button>
        )}
      </div>

      <ul className="mt-3 divide-y divide-border">
        {isLoading ? (
          <li className="py-12 text-center text-sm text-ink-muted">Đang tải...</li>
        ) : filtered.length === 0 ? (
          <li className="py-12 text-center text-sm text-ink-muted">Không có thông báo.</li>
        ) : (
          filtered.map((n) => (
            <NotificationRow key={n.id} item={n} onRead={() => markRead(n.id)} onNavigate={onClose} />
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
  onRead: () => void;
  onNavigate: () => void;
}) {
  const Icon = TYPE_ICONS[item.type.toLowerCase() as Lowercase<NotificationType>];
  const content = (
    <div className="flex gap-3 py-3">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          item.read ? 'bg-surface-muted text-ink-muted' : 'bg-primary-50 text-primary'
        }`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${item.read ? 'font-medium text-ink-secondary' : 'font-semibold text-ink'}`}>
          {item.title}
        </p>
        <p className="mt-0.5 text-xs text-ink-muted line-clamp-2">{item.body}</p>
        <p className="mt-1 text-[11px] text-ink-muted">{formatTime(item.createdAt)}</p>
      </div>
      {!item.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />}
    </div>
  );

  if (item.link) {
    return (
      <li>
        <Link
          to={item.link}
          onClick={() => {
            onRead();
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
      <button type="button" onClick={onRead} className="w-full text-left rounded-lg hover:bg-surface-muted">
        {content}
      </button>
    </li>
  );
}
