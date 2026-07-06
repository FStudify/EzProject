import type { CSSProperties } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  FolderKanban,
  User,
  Settings,
  Info,
  CheckSquare,
  FileText,
  Users,
  Video,
  TrendingUp,
  MessageCircle,
} from 'lucide-react';
import { Avatar } from '@/components/ui';
import { useSidebar } from './SidebarContext';
import { useLanguage } from '@/contexts/LanguageContext';

const projectSubNav = [
  { suffix: '', icon: Info, labelKey: 'nav_overview' },
  { suffix: '/tasks', icon: CheckSquare, labelKey: 'nav_tasks' },
  { suffix: '/documents', icon: FileText, labelKey: 'nav_documents' },
  { suffix: '/members', icon: Users, labelKey: 'nav_members' },
  { suffix: '/meetings', icon: Video, labelKey: 'nav_meetings' },
  { suffix: '/chat', icon: MessageCircle, labelKey: 'nav_chat' },
  { suffix: '/performance', icon: TrendingUp, labelKey: 'nav_performance' },
] as const;

function extractProjectId(pathname: string): string | undefined {
  const match = pathname.match(/^\/app\/projects\/([^/]+)/);
  return match?.[1];
}

/**
 * Resolve the active/inactive styling for a sidebar NavLink.
 *
 * Why we return `{ className, style }` instead of a single className string:
 * Tailwind utilities like `text-[#8B4A2F]` and the theme-generated
 * `text-on-sidebar` are both single-class selectors, so they have equal
 * specificity. Whichever appears last in the compiled stylesheet wins, which
 * varies across builds and can cause the active state to silently fail
 * (the text stays white-on-orange and is unreadable). Inline `style.color`
 * beats both, so the active palette is applied through inline styles only.
 * The className is reserved for layout (padding, gap, flex, transition, etc).
 */
const ACTIVE_BG = '#FFF5EC';
const ACTIVE_TEXT = '#8B4A2F';
const ACTIVE_SHADOW = '0 16px 24px -18px rgba(45,18,4,0.55)';
const HOVER_BG = 'rgba(255,255,255,0.18)';

function navItemStyle(isActive: boolean, isDisabled: boolean): {
  className: string;
  style: CSSProperties;
} {
  if (isDisabled) {
    return {
      className: 'cursor-not-allowed opacity-40',
      style: { color: 'rgba(255,255,255,0.6)' },
    };
  }
  if (isActive) {
    return {
      className: '',
      style: { color: ACTIVE_TEXT, backgroundColor: ACTIVE_BG, boxShadow: ACTIVE_SHADOW },
    };
  }
  return {
    className: 'hover:bg-white/[0.18]',
    style: { color: '#FFFFFF' },
  };
}

/** Footer mini-item variant — same colour palette as `navItemStyle`, so the
 *  background, icon and text all flip together — no profile-only branch. */
function footerNavItemStyle(isActive: boolean): {
  className: string;
  style: CSSProperties;
} {
  if (isActive) {
    return {
      className: '',
      style: { color: ACTIVE_TEXT, backgroundColor: ACTIVE_BG, boxShadow: ACTIVE_SHADOW },
    };
  }
  return {
    className: 'hover:bg-white/[0.18]',
    style: { color: '#FFFFFF' },
  };
}

export default function Sidebar() {
  const { pathname } = useLocation();
  const { collapsed, toggle, isMobile } = useSidebar();
  const { user } = useAuth();
  const { t } = useLanguage();

  const activeProjectId = extractProjectId(pathname);
  const hasProject = !!activeProjectId;
  const basePath = hasProject ? `/app/projects/${activeProjectId}` : '';

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-full flex-col text-on-sidebar shadow-[0_16px_34px_-20px_rgba(59,27,13,0.68)] transition-all duration-200 ease-in-out ${
        isMobile
          ? collapsed
            ? '-translate-x-full w-[224px]'
            : 'translate-x-0 w-[224px]'
          : collapsed
            ? 'w-[72px]'
            : 'w-[224px]'
      }`}
      style={{
        background: `linear-gradient(180deg, #C8774D 0%, #B86843 34%, #A75C3A 100%)`,
        boxShadow: '0 16px 34px -20px rgba(59,27,13,0.68)',
      }}
    >
      {/* Logo */}
      <div
        className="flex h-16 shrink-0 items-center"
        style={{ borderBottom: '1px solid rgba(186, 114, 75, 0.6)' }}
      >
        <div className={`flex flex-1 items-center ${collapsed ? 'justify-center px-0' : 'px-3'}`}>
          {collapsed ? (
            <img src="/logo-icon.svg" alt="EZProject" className="h-10 w-10 rounded-2xl" />
          ) : (
            <img src="/logo-ezproject.svg" alt="EZProject" className="h-12 w-full rounded-sm object-contain object-left" />
          )}
        </div>
      </div>

      {/* Toggle */}
      <button
        type="button"
        onClick={toggle}
        className="absolute -right-3 top-[4.5rem] z-50 flex h-6 w-6 items-center justify-center rounded-full bg-[#B86843] text-white transition-colors hover:bg-[#A75C3A]"
        style={{ boxShadow: '0 10px 18px -14px rgba(68,34,18,0.56)', border: '1px solid rgba(186,114,75,0.6)' }}
        aria-label={collapsed ? t('expand') : t('collapse')}
      >
        {collapsed ? (
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        ) : (
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        )}
      </button>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-4">
        <ul className="space-y-0.5">
          <li>
            <NavLink
              to="/app"
              end
              className={({ isActive }) => {
                const s = navItemStyle(isActive, false);
                return `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${s.className}`;
              }}
              style={({ isActive }) => navItemStyle(isActive, false).style}
            >
              <LayoutDashboard className="h-5 w-5 shrink-0" aria-hidden />
              {!collapsed && <span>{t('nav_dashboard')}</span>}
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/app/projects"
              className={({ isActive }) => {
                const s = navItemStyle(isActive, false);
                return `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${s.className}`;
              }}
              style={({ isActive }) => navItemStyle(isActive, false).style}
            >
              <FolderKanban className="h-5 w-5 shrink-0" aria-hidden />
              {!collapsed && <span>{t('nav_projects')}</span>}
            </NavLink>
          </li>
        </ul>

        {/* Project sub-nav */}
        <div className={`mt-3 ${collapsed ? 'space-y-0.5' : ''}`}>
          <div className={collapsed ? '' : 'ml-3 space-y-0.5'} style={{ borderLeft: '1px solid rgba(255,255,255,0.16)' }}>
            {projectSubNav.map(({ suffix, icon: Icon, labelKey }) => {
              const fullPath = basePath + suffix;
              const isDisabled = !hasProject;

              if (isDisabled) {
                const s = navItemStyle(false, true);
                return (
                  <div
                    key={suffix || 'overview'}
                    style={s.style}
                    className={`flex items-center gap-2 rounded-r-xl py-2 pl-3 text-[13px] font-medium ${s.className} ${collapsed ? 'justify-center rounded-xl px-2 py-2.5' : ''}`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{t(labelKey)}</span>}
                  </div>
                );
              }

              return (
                <NavLink
                  key={suffix || 'overview'}
                  to={fullPath}
                  end={suffix === ''}
                  className={({ isActive }) => {
                    if (collapsed) {
                      const s = navItemStyle(isActive, false);
                      return `flex items-center justify-center rounded-xl p-2.5 transition-all duration-200 ${s.className}`;
                    }
                    return isActive
                      ? 'flex items-center gap-2 rounded-r-xl border-l-[3px] py-2 pl-3 text-[13px] font-medium transition-all duration-200'
                      : 'flex items-center gap-2 rounded-r-xl border-l-[3px] border-transparent py-2 pl-3 text-[13px] font-medium transition-all duration-200 hover:bg-white/[0.18]';
                  }}
                  style={({ isActive }) => {
                    if (collapsed) return navItemStyle(isActive, false).style;
                    if (isActive) {
                      return {
                        borderLeftColor: '#D97853',
                        color: ACTIVE_TEXT,
                        backgroundColor: ACTIVE_BG,
                        boxShadow: ACTIVE_SHADOW,
                      };
                    }
                    return { color: 'rgba(255,255,255,0.7)' };
                  }}
                  title={collapsed ? t(labelKey) : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{t(labelKey)}</span>}
                </NavLink>
              );
            })}
          </div>
        </div>

        {!collapsed ? (
          <div className="mt-6">
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-on-sidebar-muted/60">
              {t('personal')}
            </p>
            <ul className="space-y-0.5">
              {[
                { to: '/app/profile', icon: User, labelKey: 'nav_profile' },
                { to: '/app/settings', icon: Settings, labelKey: 'nav_settings' },
              ].map(({ to, icon: Icon, labelKey }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    className={({ isActive }) => {
                      const s = navItemStyle(isActive, false);
                      return `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${s.className}`;
                    }}
                    style={({ isActive }) => navItemStyle(isActive, false).style}
                  >
                    <Icon className="h-5 w-5 shrink-0" aria-hidden />
                    <span>{t(labelKey)}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="mt-3 space-y-0.5">
            <div className="mx-3" style={{ borderTop: '1px solid rgba(255,255,255,0.16)' }} />
            {[
              { to: '/app/profile', icon: User, labelKey: 'nav_profile' },
              { to: '/app/settings', icon: Settings, labelKey: 'nav_settings' },
            ].map(({ to, icon: Icon, labelKey }) => (
              <NavLink
                key={to}
                to={to}
                title={t(labelKey)}
                className={({ isActive }) => {
                  const s = navItemStyle(isActive, false);
                  return `flex items-center justify-center rounded-xl p-2.5 transition-all duration-200 ${s.className}`;
                }}
                style={({ isActive }) => navItemStyle(isActive, false).style}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden />
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      {/* User mini-card (footer) — same active styling as Profile item above */}
      <div
        className="px-2.5 py-3"
        style={{ borderTop: '1px solid rgba(186, 114, 75, 0.6)' }}
      >
        <NavLink
          to="/app/profile"
          className={({ isActive }) => {
            const s = footerNavItemStyle(isActive);
            return `flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-all duration-200 ${s.className}`;
          }}
          style={({ isActive }) => footerNavItemStyle(isActive).style}
        >
          <Avatar src={user?.avatar ?? undefined} name={user?.fullName ?? 'User'} size="sm" />
          {!collapsed && (
            <div className="min-w-0">
              <p
                className="truncate text-sm font-semibold"
                style={{ color: 'inherit' }}
              >
                {user?.fullName ?? user?.username ?? 'User'}
              </p>
              <p
                className="truncate text-xs"
                style={{ color: 'inherit', opacity: 0.75 }}
              >
                {t('role_student')}
              </p>
            </div>
          )}
        </NavLink>
      </div>
    </aside>
  );
}
