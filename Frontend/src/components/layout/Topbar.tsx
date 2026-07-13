import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Search, Bell, LogOut, UserPen, Settings, Sun, Moon, Shield, Sparkles, Crown, Receipt } from 'lucide-react';
import { Avatar, useToast } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getNotifications } from '@/api/user.api';
import { getMyInvitations } from '@/api/invitations.api';
import { fetchMyCurrentSubscription } from '@/api/payment.api';
import NotificationDrawer, { NOTIFICATIONS_UPDATED_EVENT } from './NotificationDrawer';
import { useSidebar } from './SidebarContext';
import SubscriptionModal from '@/components/payment/SubscriptionModal';
export default function Topbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, lang, setLang } = useLanguage();
  const { toggle, isMobile } = useSidebar();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [invitationCount, setInvitationCount] = useState(0);
  const [currentPlanKey, setCurrentPlanKey] = useState<string | null>(null);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
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

  // Real-time: a new notification arrived over the socket → re-pull counts
// immediately (so the bell badge lights up) AND show a toast for non-chat
// notifications so users see them even with the bell drawer closed.
  useEffect(() => {
    const handleNew = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      console.log('[Topbar] new_notification event received', detail);
      console.log('[Topbar] my user id =', user?.id);
      // Optimistic: bump badge immediately so the bell lights up before the API responds
      setUnreadCount((prev) => prev + 1);
      void fetchBadge();
      const payload = detail as { type?: string; title?: string; body?: string };
      if (!payload?.type || payload.type === 'CHAT') return;
      toast(`${payload.title ?? 'Thông báo'}: ${payload.body ?? ''}`, 'success');
    };
    window.addEventListener('new_notification', handleNew);
    return () => window.removeEventListener('new_notification', handleNew);
  }, [toast, user?.id]);

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

  /**
   * Refetch current subscription mỗi khi route đổi. Điều này đảm bảo:
   *  - Sau khi user thanh toán thành công (về từ PayOS → /payment/result → /app),
   *    button "Nâng cấp" tự đổi thành "Quản lý gói".
   *  - Tránh gọi thừa bằng cách skip đường dẫn public (/pricing, /payment/result).
   */
  useEffect(() => {
    if (!user) {
      setCurrentPlanKey(null);
      return;
    }
    if (!location.pathname.startsWith('/app')) {
      return;
    }
    let cancelled = false;
    fetchMyCurrentSubscription()
      .then((sub) => {
        if (cancelled) return;
        setCurrentPlanKey(sub?.planKey ?? null);
      })
      .catch(() => {
        if (!cancelled) setCurrentPlanKey(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user, location.pathname]);

  const onPaidPlan = currentPlanKey && currentPlanKey !== 'free';
  const planBadge = onPaidPlan
    ? ({ key: currentPlanKey, name: (currentPlanKey as string).toUpperCase() })
    : null;

  // ── Helpers: màu & icon cho plan badge ─────────────────────────
  const PLAN_STYLES: Record<string, { bg: string; color: string; border: string; icon: string }> = {
    pro: {
      bg: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
      color: '#ffffff',
      border: 'rgba(168, 85, 247, 0.5)',
      icon: '⚡',
    },
    ultra: {
      bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)',
      color: '#ffffff',
      border: 'rgba(245, 158, 11, 0.6)',
      icon: '👑',
    },
  };
  const planStyle = planBadge ? PLAN_STYLES[planBadge.key] ?? null : null;
  const isAdmin = user?.role === 'ADMIN';

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

          {/* Upgrade / Manage plan button — ẩn với ADMIN */}
          {!isAdmin && (
            <button
              onClick={() => setIsSubModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all"
              style={{
                background: onPaidPlan
                  ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                  : 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
                color: '#ffffff',
                boxShadow: '0 6px 16px -8px rgba(249, 115, 22, 0.5)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 10px 20px -8px rgba(249, 115, 22, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 6px 16px -8px rgba(249, 115, 22, 0.5)';
              }}
              title={onPaidPlan
                ? (lang === 'en' ? 'View your subscriptions and payment history' : 'Xem gói đang dùng và lịch sử thanh toán')
                : (lang === 'en' ? 'Upgrade to Pro or Ultra' : 'Nâng cấp lên Pro hoặc Ultra')}
            >
              {onPaidPlan ? (
                <>
                  <Crown className="h-3.5 w-3.5" aria-hidden />
                  <span className="hidden sm:inline">
                    {lang === 'en' ? 'My Plan' : 'Gói của tôi'}
                  </span>
                  <span className="sm:hidden">
                    {lang === 'en' ? 'Plan' : 'Gói'}
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  <span className="hidden sm:inline">
                    {lang === 'en' ? 'Upgrade' : 'Nâng cấp'}
                  </span>
                  <span className="sm:hidden">
                    {lang === 'en' ? 'Pro' : 'Pro'}
                  </span>
                </>
              )}
            </button>
          )}

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

          {/* Plan badge (Pro / Ultra) */}
          {planBadge && planStyle && (
            <span
              className="inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[10px] font-bold uppercase tracking-widest"
              title={lang === 'en'
                ? `You are on ${planBadge.name} plan`
                : `Bạn đang dùng gói ${planBadge.name}`}
              style={{
                background: planStyle.bg,
                color: planStyle.color,
                border: `1px solid ${planStyle.border}`,
                boxShadow: '0 4px 12px -4px rgba(0,0,0,0.25)',
                letterSpacing: '0.12em',
              }}
            >
              <span aria-hidden style={{ fontSize: '11px', lineHeight: 1 }}>
                {planStyle.icon}
              </span>
              <span>{planBadge.name}</span>
            </span>
          )}

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
              <Avatar src={user?.avatar ?? undefined} name={user?.fullName ?? 'User'} size="sm" planKey={currentPlanKey ?? undefined} />
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
                {user?.role === 'ADMIN' && (
                  <Link
                    to="/admin"
                    role="menuitem"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors"
                    style={{ color: '#b91c1c' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = theme === 'dark' ? '#2d261c' : '#FFF8F3')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <Shield className="h-4 w-4" />
                    Admin Panel
                  </Link>
                )}
                {user?.role === 'ADMIN' && (
                  <div className="my-1" style={{ borderTop: `1px solid ${theme === 'dark' ? '#4a3d2e' : '#E8D8CF'}` }} />
                )}
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
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    navigate('/app/payments');
                  }}
                  role="menuitem"
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors"
                  style={{ color: theme === 'dark' ? '#f0ebe3' : '#1F1F1F' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = theme === 'dark' ? '#2d261c' : '#FFF8F3')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Receipt className="h-4 w-4" style={{ color: theme === 'dark' ? '#9a9086' : '#635648' }} />
                  {lang === 'en' ? 'Payment History' : 'Lịch sử thanh toán'}
                </button>
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
      
      {!isAdmin && (
        <SubscriptionModal isOpen={isSubModalOpen} onClose={() => setIsSubModalOpen(false)} />
      )}
    </>
  );
}
