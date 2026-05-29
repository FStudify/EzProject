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
  return isActive
    ? 'bg-sidebar-active text-on-sidebar'
    : 'text-on-sidebar-muted hover:bg-sidebar-hover hover:text-on-sidebar';
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
      className={`fixed left-0 top-0 z-40 flex h-full flex-col border-r border-sidebar-border bg-sidebar text-on-sidebar shadow-lg transition-all duration-200 ease-in-out ${
        collapsed ? 'w-[72px]' : 'w-[224px]'
      }`}
    >
      {/* Logo */}
      <div className="flex h-14 shrink-0 items-center border-b border-sidebar-border">
        <div className={`flex flex-1 items-center ${collapsed ? 'justify-center px-0' : 'gap-3 px-4'}`}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
            <GraduationCap className="h-4 w-4" aria-hidden />
          </span>
          {!collapsed && (
            <span className="truncate text-base font-bold tracking-tight text-on-sidebar">EZProject</span>
          )}
        </div>
      </div>

      {/* Toggle */}
      <button
        type="button"
        onClick={toggle}
        className="absolute -right-3 top-[4.5rem] z-50 flex h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar-hover text-on-sidebar transition-colors hover:bg-sidebar-active"
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
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-sidebar-active text-on-sidebar' : 'text-on-sidebar-muted hover:bg-sidebar-hover hover:text-on-sidebar'}`
              }
            >
              <LayoutDashboard className="h-4.5 w-4.5 shrink-0" aria-hidden />
              {!collapsed && <span>{t('nav_dashboard')}</span>}
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/app/projects"
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-sidebar-active text-on-sidebar' : 'text-on-sidebar-muted hover:bg-sidebar-hover hover:text-on-sidebar'}`
              }
            >
              <FolderKanban className="h-4.5 w-4.5 shrink-0" aria-hidden />
              {!collapsed && <span>{t('nav_projects')}</span>}
            </NavLink>
          </li>
        </ul>

        {/* Project sub-nav — full width always visible */}
        <div className={`mt-3 ${collapsed ? 'space-y-0.5' : ''}`}>
          <div className={collapsed ? '' : 'border-l border-white/10 ml-3 space-y-0.5'}>
            {projectSubNav.map(({ suffix, icon: Icon, labelKey }) => {
              const fullPath = basePath + suffix;
              const isDisabled = !hasProject;

              if (isDisabled) {
                return (
                  <div
                    key={suffix || 'overview'}
                    className={collapsed
                      ? 'flex items-center justify-center rounded-lg p-2.5 opacity-40'
                      : `flex items-center gap-2 rounded-r-lg py-2 pl-3 text-[13px] font-medium ${navItemClass(false, true)}`
                    }
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
                      ? `flex items-center justify-center rounded-lg p-2.5 transition-colors ${
                          isActive ? 'bg-sidebar-active text-on-sidebar' : 'text-on-sidebar-muted hover:bg-sidebar-hover hover:text-on-sidebar'
                        }`
                      : `flex items-center gap-2 rounded-r-lg border-l-[3px] py-2 pl-3 text-[13px] font-medium transition-colors ${
                          isActive
                            ? 'border-accent bg-sidebar-active text-on-sidebar'
                            : 'border-transparent text-on-sidebar-muted hover:bg-sidebar-hover hover:text-on-sidebar'
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
              <li>
                <NavLink
                  to="/app/profile"
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-sidebar-active text-on-sidebar' : 'text-on-sidebar-muted hover:bg-sidebar-hover hover:text-on-sidebar'}`
                  }
                >
                  <User className="h-4.5 w-4.5 shrink-0" aria-hidden />
                  <span>{t('nav_profile')}</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/app/settings"
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-sidebar-active text-on-sidebar' : 'text-on-sidebar-muted hover:bg-sidebar-hover hover:text-on-sidebar'}`
                  }
                >
                  <Settings className="h-4.5 w-4.5 shrink-0" aria-hidden />
                  <span>{t('nav_settings')}</span>
                </NavLink>
              </li>
            </ul>
          </div>
        ) : (
          <div className="mt-3 space-y-0.5">
            <div className="mx-3 border-t border-white/10" />
            <NavLink
              to="/app/profile"
              title={t('nav_profile')}
              className={({ isActive }) =>
                `flex items-center justify-center rounded-lg p-2.5 transition-colors ${
                  isActive ? 'bg-sidebar-active text-on-sidebar' : 'text-on-sidebar-muted hover:bg-sidebar-hover hover:text-on-sidebar'
                }`
              }
            >
              <User className="h-4.5 w-4.5 shrink-0" aria-hidden />
            </NavLink>
            <NavLink
              to="/app/settings"
              title={t('nav_settings')}
              className={({ isActive }) =>
                `flex items-center justify-center rounded-lg p-2.5 transition-colors ${
                  isActive ? 'bg-sidebar-active text-on-sidebar' : 'text-on-sidebar-muted hover:bg-sidebar-hover hover:text-on-sidebar'
                }`
              }
            >
              <Settings className="h-4.5 w-4.5 shrink-0" aria-hidden />
            </NavLink>
          </div>
        )}
      </nav>

      {/* User */}
      <div className="border-t border-sidebar-border px-2.5 py-3">
        <NavLink
          to="/app/profile"
          className={({ isActive }) =>
            `flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors ${isActive ? 'bg-sidebar-active' : 'hover:bg-sidebar-hover'}`
          }
        >
          <Avatar name={user?.displayName ?? 'User'} size="sm" />
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-on-sidebar">
                {user?.displayName ?? user?.username ?? 'User'}
              </p>
              <p className="truncate text-xs text-on-sidebar-muted">{t('role_student')}</p>
            </div>
          )}
        </NavLink>
      </div>
    </aside>
  );
}
