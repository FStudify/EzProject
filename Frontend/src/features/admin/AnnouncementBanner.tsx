import { useCallback, useEffect, useState } from 'react';
import { X, AlertTriangle, Info, Wrench } from 'lucide-react';
import { getActiveAnnouncements, type AdminAnnouncement } from '@/api/admin.api';

const ICON: Record<AdminAnnouncement['type'], React.ComponentType<{ className?: string }>> = {
  INFO: Info,
  WARNING: AlertTriangle,
  MAINTENANCE: Wrench,
};

const STYLE: Record<AdminAnnouncement['type'], { bg: string; border: string; text: string }> = {
  INFO: { bg: '#dbeafe', border: '#93c5fd', text: '#1e3a8a' },
  WARNING: { bg: '#fef3c7', border: '#fcd34d', text: '#78350f' },
  MAINTENANCE: { bg: '#fee2e2', border: '#fca5a5', text: '#7f1d1d' },
};

const DISMISSED_KEY = 'ez_dismissed_announcements';

function getDismissed(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function setDismissed(id: string) {
  try {
    const set = getDismissed();
    set.add(id);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

/**
 * AnnouncementBanner — fetches active announcements and shows the most recent one.
 * User can dismiss (except MAINTENANCE).
 * Renders nothing when nothing is active.
 */
export default function AnnouncementBanner() {
  const [items, setItems] = useState<AdminAnnouncement[]>([]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const fetch = useCallback(async () => {
    try {
      const list = await getActiveAnnouncements();
      setItems(list);
    } catch {
      // Silently fail — banner is non-essential
    }
  }, []);

  useEffect(() => {
    void fetch();
    setHidden(getDismissed());
    const id = setInterval(() => void fetch(), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetch]);

  const visible = items.filter((a) => !hidden.has(a.id));
  if (visible.length === 0) return null;

  // Show the most recent active one
  const top = visible[0];
  const Icon = ICON[top.type];
  const st = STYLE[top.type];
  const isMaintenance = top.type === 'MAINTENANCE';

  return (
    <div
      role="alert"
      className="flex items-start gap-3 border-b px-4 py-2.5"
      style={{ backgroundColor: st.bg, borderColor: st.border, color: st.text }}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 text-sm">
        <span className="font-semibold">{top.title}</span>
        <span className="mx-2 opacity-50">·</span>
        <span>{top.content}</span>
      </div>
      {!isMaintenance && (
        <button
          type="button"
          onClick={() => {
            setDismissed(top.id);
            setHidden((prev) => new Set(prev).add(top.id));
          }}
          className="rounded-md p-1 opacity-70 hover:bg-black/5 hover:opacity-100"
          aria-label="Đóng thông báo"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}