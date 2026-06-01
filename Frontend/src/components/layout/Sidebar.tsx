import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  GraduationCap,
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

function navItemClass(isActive: boolean, isDisabled: boolean) {
  if (isDisabled) {
    return 'cursor-not-allowed opacity-40 text-on-sidebar-muted/60';
  }
  if (isActive) {
    return 'text-[#8B4A2F] bg-[#FFF5EC] shadow-[0_16px_24px_-18px_rgba(45,18,4,0.55)]';
  }
  return 'text-on-sidebar hover:bg-[rgba(255,255,255,0.18)]';
}

export default function Sidebar() {
  const { pathname } = useLocation();
  const { collapsed, toggle } = useSidebar();
  const { user } = useAuth();
  const { t } = useLanguage();

  const activeProjectId = extractProjectId(pathname);
  const hasProject = !!activeProjectId;
  const basePath = hasProject ? `/app/projects/${activeProjectId}` : '';

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-full flex-col text-on-sidebar shadow-[0_16px_34px_-20px_rgba(59,27,13,0.68)] transition-all duration-200 ease-in-out ${
        collapsed ? 'w-[72px]' : 'w-[224px]'
      }`}
      style={{
        background: `linear-gradient(180deg, #C8774D 0%, #B86843 34%, #A75C3A 100%)`,
        boxShadow: '0 16px 34px -20px rgba(59,27,13,0.68)',
      }}
    >
      {/* Logo */}
      <div
        className="flex h-14 shrink-0 items-center"
        style={{ borderBottom: '1px solid rgba(186, 114, 75, 0.6)' }}
      >
        <div className={`flex flex-1 items-center ${collapsed ? 'justify-center px-0' : 'gap-3 px-4'}`}>
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
            style={{
              background: 'linear-gradient(145deg, #A75C3A, #8B4A2F)',
              boxShadow: '0 14px 24px -18px rgba(31,12,3,0.7)',
            }}
          >
            <GraduationCap className="h-5 w-5" aria-hidden />
          </span>
          {!collapsed && (
            <span className="truncate text-[22px] font-extrabold tracking-tight" style={{ fontWeight: 700 }}>
              EZProject
            </span>
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
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${navItemClass(isActive, false)}`
              }
            >
              <LayoutDashboard className="h-5 w-5 shrink-0" aria-hidden />
              {!collapsed && <span>{t('nav_dashboard')}</span>}
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/app/projects"
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${navItemClass(isActive, false)}`
              }
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
                return (
                  <div
                    key={suffix || 'overview'}
                    className={`flex items-center gap-2 rounded-r-xl py-2 pl-3 text-[13px] font-medium ${navItemClass(false, true)} ${collapsed ? 'justify-center rounded-xl px-2 py-2.5' : ''}`}
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
                  className={({ isActive }) =>
                    collapsed
                      ? `flex items-center justify-center rounded-xl p-2.5 transition-all duration-200 ${navItemClass(isActive, false)}`
                      : `flex items-center gap-2 rounded-r-xl border-l-[3px] py-2 pl-3 text-[13px] font-medium transition-all duration-200 ${
                          isActive
                            ? 'border-[#D97853] text-[#8B4A2F] bg-[#FFF5EC] shadow-[0_16px_24px_-18px_rgba(45,18,4,0.55)]'
                            : 'border-transparent text-on-sidebar-muted hover:bg-[rgba(255,255,255,0.18)] hover:text-on-sidebar'
                        }`
                  }
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
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${navItemClass(isActive, false)}`
                    }
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
                className={({ isActive }) =>
                  `flex items-center justify-center rounded-xl p-2.5 transition-all duration-200 ${navItemClass(isActive, false)}`
                }
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden />
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      {/* User */}
      <div
        className="px-2.5 py-3"
        style={{ borderTop: '1px solid rgba(186, 114, 75, 0.6)' }}
      >
        <NavLink
          to="/app/profile"
          className={({ isActive }) =>
            `flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-all duration-200 ${isActive ? 'bg-[#FFF5EC] text-[#8B4A2F]' : 'hover:bg-[rgba(255,255,255,0.18)]'}`
          }
        >
          <Avatar name={user?.fullName ?? 'User'} size="sm" />
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-on-sidebar">
                {user?.fullName ?? user?.username ?? 'User'}
              </p>
              <p className="truncate text-xs text-on-sidebar-muted">{t('role_student')}</p>
            </div>
          )}
        </NavLink>
      </div>
    </aside>
  );
}
