import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Bell, LogOut, UserPen, Settings, Sun, Moon } from 'lucide-react';
import { Avatar } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getNotifications } from '@/api/user.api';
import NotificationDrawer from './NotificationDrawer';

interface TopbarProps {
  title: string;
}

export default function Topbar({ title }: TopbarProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, lang, setLang } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const data = await getNotifications();
        setUnreadCount(data.unreadCount);
      } catch (err) {
        console.error('Failed to fetch unread count:', err);
      }
    };
    fetchUnreadCount();
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-4 border-b border-border bg-surface px-4 lg:px-6">

        <h1 className="hidden min-w-0 shrink-0 truncate text-lg font-semibold text-ink sm:block md:max-w-[200px] lg:max-w-[280px]">
          {title}
        </h1>

        <div className="relative mx-auto hidden min-w-0 max-w-md flex-1 md:block">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
            aria-hidden
          />
          <input
            type="search"
            placeholder={t('search_placeholder')}
            className="h-9 w-full rounded-lg border border-border bg-surface-muted pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted transition-all focus:border-primary focus:bg-surface focus:outline-none focus:ring-4 focus:ring-primary/10"
            aria-label={t('search_placeholder')}
          />
        </div>

        <div className="ml-auto flex items-center gap-1.5">

          {/* Language switcher */}
          <div className="flex items-center rounded-lg border border-border bg-surface-muted p-0.5">
            <button
              type="button"
              onClick={() => setLang('vi')}
              className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-all ${
                lang === 'vi'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              VI
            </button>
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-all ${
                lang === 'en'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              EN
            </button>
          </div>

          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-muted text-ink-secondary transition-colors hover:border-primary/40 hover:bg-surface hover:text-primary"
            aria-label={theme === 'dark' ? t('theme_light') : t('theme_dark')}
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>

          {/* Notifications */}
          <button
            type="button"
            onClick={() => setIsNotifOpen(true)}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-muted text-ink-secondary transition-colors hover:border-primary/40 hover:bg-primary-50 hover:text-primary"
            aria-label={t('notifications')}
          >
            <Bell className="h-[18px] w-[18px]" aria-hidden />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>

          {/* User menu */}
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="rounded-full ring-2 ring-primary/25 transition-all hover:ring-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
              aria-label="Menu"
            >
              <Avatar name={user?.fullName ?? 'User'} size="sm" />
            </button>

            {isMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-40 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-surface p-1.5 shadow-lg"
              >
                <Link
                  to="/app/profile"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-ink transition-colors hover:bg-surface-muted"
                  onClick={() => setIsMenuOpen(false)}
                  role="menuitem"
                >
                  <UserPen className="h-4 w-4" />
                  {t('nav_profile')}
                </Link>
                <Link
                  to="/app/settings"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-ink transition-colors hover:bg-surface-muted"
                  onClick={() => setIsMenuOpen(false)}
                  role="menuitem"
                >
                  <Settings className="h-4 w-4" />
                  {t('nav_settings')}
                </Link>
                <div className="my-1 border-t border-border" />
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-ink transition-colors hover:bg-surface-muted"
                  onClick={() => {
                    setIsMenuOpen(false);
                    logout();
                  }}
                  role="menuitem"
                >
                  <LogOut className="h-4 w-4" />
                  {t('sign_out')}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <NotificationDrawer isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
    </>
  );
}
