import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Search, Bell, LogOut, UserPen, Settings, Sun, Moon } from 'lucide-react';
import { Avatar, useToast } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getNotifications } from '@/api/user.api';
import { getMyInvitations } from '@/api/invitations.api';
import NotificationDrawer, { NOTIFICATIONS_UPDATED_EVENT } from './NotificationDrawer';
import { useSidebar } from './SidebarContext';

interface TopbarProps {
  title: string;
}

export default function Topbar({ title }: TopbarProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, lang, setLang } = useLanguage();
  const { toggle, isMobile } = useSidebar();
  const { toast } = useToast();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [invitationCount, setInvitationCount] = useState(0);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const fetchBadge = async () => {
    try {
      const [notif, invites] = await Promise.allSettled([
        getNotifications(),
        getMyInvitations(),
      ]);
      const notifUnread = notif.status === 'fulfilled' ? notif.value.unreadCount : 0;
      const inviteUnread = invites.status === 'fulfilled' ? invites.value.length : 0;
      setUnreadCount(notifUnread);
      setInvitationCount(inviteUnread);
    } catch (err) {
      console.error('Failed to fetch badge counts:', err);
    }
  };

  useEffect(() => {
    void fetchBadge();

    const handleNotificationUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ unreadCount?: number; invitationCount?: number }>).detail;
      if (typeof detail?.unreadCount === 'number') setUnreadCount(detail.unreadCount);
      if (typeof detail?.invitationCount === 'number') setInvitationCount(detail.invitationCount);
      if (detail?.unreadCount == null && detail?.invitationCount == null) {
        void fetchBadge();
      }
    };

    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, handleNotificationUpdate);
    window.addEventListener('invitations:updated', handleNotificationUpdate);
    return () => {
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, handleNotificationUpdate);
      window.removeEventListener('invitations:updated', handleNotificationUpdate);
    };
  }, []);

  // Real-time: someone invited us → +1 on invitation badge + toast
  useEffect(() => {
    const handleInvitation = (event: Event) => {
      const detail = (event as CustomEvent<{ projectName?: string; invitedBy?: { fullName?: string } }>).detail;
      const inviter = detail?.invitedBy?.fullName || 'Ai đó';
      const project = detail?.projectName || 'một dự án';
      setInvitationCount((prev) => prev + 1);
      toast(`${inviter} đã mời bạn vào dự án "${project}"`, 'success');
    };
    window.addEventListener('invitation:new', handleInvitation);
    return () => window.removeEventListener('invitation:new', handleInvitation);
  }, [toast]);

  // Real-time: an invitee accepted/declined our invite → toast so we know
  useEffect(() => {
    const handleResponse = (event: Event) => {
      const detail = (event as CustomEvent<{
        projectName?: string;
        invitedUsername?: string;
        invitedEmail?: string;
        action?: 'accepted' | 'declined';
      }>).detail;
      const who = detail?.invitedUsername || detail?.invitedEmail || 'Người được mời';
      const project = detail?.projectName || 'dự án';
      const verb = detail?.action === 'declined' ? 'đã từ chối' : 'đã đồng ý tham gia';
      toast(`${who} ${verb} dự án "${project}"`, detail?.action === 'declined' ? 'warning' : 'success');
    };
    window.addEventListener('invitation:response', handleResponse);
    return () => window.removeEventListener('invitation:response', handleResponse);
  }, [toast]);

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
      <header
        className={`ez-topbar sticky top-0 z-30 flex h-14 shrink-0 items-center gap-4 border-b px-4 lg:px-6 ${
          theme === 'dark' ? 'header-dark' : ''
        }`}
        style={{
          backgroundColor: theme === 'dark' ? undefined : '#FFFDFB',
          borderColor: theme === 'dark' ? undefined : '#E8D8CF',
        }}
      >
        {isMobile && (
          <button
            type="button"
            onClick={toggle}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-colors lg:hidden mr-1 shrink-0"
            style={{
              borderColor: theme === 'dark' ? '#4a3d2e' : '#E6D6CC',
              backgroundColor: theme === 'dark' ? '#252018' : '#FFFDFB',
              color: theme === 'dark' ? '#c8bfb3' : '#635648',
            }}
            aria-label="Toggle Sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        <h1
          className="hidden min-w-0 shrink-0 truncate text-lg font-bold sm:block md:max-w-[200px] lg:max-w-[280px]"
          style={{
            color: theme === 'dark' ? '#f0ebe3' : '#1F1F1F',
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </h1>

        <div className="relative mx-auto hidden min-w-0 max-w-md flex-1 md:block">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: theme === 'dark' ? '#9a9086' : '#7E7A76' }}
            aria-hidden
          />
          <input
            type="search"
            placeholder={t('search_placeholder')}
            className="h-9 w-full rounded-xl py-2 pl-9 pr-3 text-sm shadow-sm transition-all focus:outline-none"
            style={{
              backgroundColor: theme === 'dark' ? '#2d261c' : '#F8F3EE',
              color: theme === 'dark' ? '#f0ebe3' : '#2A2725',
              border: `1px solid ${theme === 'dark' ? '#4a3d2e' : '#E8C7AE'}`,
            }}
            aria-label={t('search_placeholder')}
          />
        </div>

        <div className="ml-auto flex items-center gap-1.5">

          {/* Language switcher */}
          <div
            className="flex items-center rounded-xl p-0.5"
            style={{
              backgroundColor: theme === 'dark' ? '#2d261c' : '#F8F3EE',
              border: `1px solid ${theme === 'dark' ? '#4a3d2e' : '#E8C7AE'}`,
            }}
          >
            <button
              type="button"
              onClick={() => setLang('vi')}
              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all"
              style={lang === 'vi'
                ? { backgroundColor: '#D97853', color: 'white', boxShadow: '0 2px 4px rgba(201,107,72,0.3)' }
                : { color: theme === 'dark' ? '#c8bfb3' : '#635648' }}
            >
              VI
            </button>
            <button
              type="button"
              onClick={() => setLang('en')}
              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all"
              style={lang === 'en'
                ? { backgroundColor: '#D97853', color: 'white', boxShadow: '0 2px 4px rgba(201,107,72,0.3)' }
                : { color: theme === 'dark' ? '#c8bfb3' : '#635648' }}
            >
              EN
            </button>
          </div>

          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-colors"
            style={{
              borderColor: theme === 'dark' ? '#4a3d2e' : '#E6D6CC',
              backgroundColor: theme === 'dark' ? '#252018' : '#FFFDFB',
              color: theme === 'dark' ? '#c8bfb3' : '#635648',
            }}
            aria-label={theme === 'dark' ? t('theme_light') : t('theme_dark')}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Notifications */}
          <button
            type="button"
            onClick={() => setIsNotifOpen(true)}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-colors"
            style={{
              borderColor: theme === 'dark' ? '#4a3d2e' : '#E6D6CC',
              backgroundColor: theme === 'dark' ? '#252018' : '#FFFDFB',
              color: theme === 'dark' ? '#9a9086' : '#4F637F',
            }}
            aria-label={t('notifications')}
          >
            <Bell className="h-[18px] w-[18px]" aria-hidden />
            {unreadCount + invitationCount > 0 && (
              <span
                className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                style={{ backgroundColor: '#ef4444' }}
              >
                {unreadCount + invitationCount}
              </span>
            )}
          </button>

          {/* User menu */}
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="rounded-full transition-all focus:outline-none"
              style={{ boxShadow: theme === 'dark' ? '0 0 0 3px #4a3d2e' : '0 0 0 3px #DDE7F4' }}
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
              aria-label="Menu"
            >
              <Avatar src={user?.avatar ?? undefined} name={user?.fullName ?? 'User'} size="sm" />
            </button>

            {isMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-40 w-56 overflow-hidden rounded-2xl p-1.5 shadow-xl"
                style={{
                  backgroundColor: theme === 'dark' ? '#252018' : '#FFFDFB',
                  border: `1px solid ${theme === 'dark' ? '#4a3d2e' : '#E8D8CF'}`,
                  marginTop: '8px',
                }}
              >
                <Link
                  to="/app/profile"
                  role="menuitem"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors"
                  style={{ color: theme === 'dark' ? '#f0ebe3' : '#1F1F1F' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = theme === 'dark' ? '#2d261c' : '#FFF8F3')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <UserPen className="h-4 w-4" style={{ color: theme === 'dark' ? '#9a9086' : '#635648' }} />
                  {t('nav_profile')}
                </Link>
                <Link
                  to="/app/settings"
                  role="menuitem"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors"
                  style={{ color: theme === 'dark' ? '#f0ebe3' : '#1F1F1F' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = theme === 'dark' ? '#2d261c' : '#FFF8F3')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Settings className="h-4 w-4" style={{ color: theme === 'dark' ? '#9a9086' : '#635648' }} />
                  {t('nav_settings')}
                </Link>
                <div className="my-1" style={{ borderTop: `1px solid ${theme === 'dark' ? '#4a3d2e' : '#E8D8CF'}` }} />
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors"
                  style={{ color: '#ef4444' }}
                  onClick={() => { setIsMenuOpen(false); logout(); }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = theme === 'dark' ? '#2d261c' : '#FFF8F3')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
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
