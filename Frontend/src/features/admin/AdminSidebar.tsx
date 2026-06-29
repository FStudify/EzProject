import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  ScrollText,
  HeartPulse,
  Megaphone,
  Shield,
  LogOut,
} from 'lucide-react';
import { Avatar } from '@/components/ui';
import { useAdminSidebar } from './AdminSidebarContext';

const NAV_ITEMS = [
  { to: '/admin', label: 'Tổng quan', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Người dùng', icon: Users },
  { to: '/admin/projects', label: 'Dự án', icon: FolderKanban },
  { to: '/admin/logs', label: 'Nhật ký', icon: ScrollText },
  { to: '/admin/health', label: 'Sức khỏe hệ thống', icon: HeartPulse },
  { to: '/admin/announcements', label: 'Thông báo', icon: Megaphone },
];

function navItemClass(isActive: boolean) {
  if (isActive) {
    return 'text-white bg-white/15 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]';
  }
  return 'text-white/80 hover:bg-white/10';
}

export default function AdminSidebar() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const { collapsed, toggle, isMobile, setCollapsed } = useAdminSidebar();

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-full flex-col text-white shadow-[0_16px_34px_-20px_rgba(31,12,3,0.7)] transition-all duration-200 ease-in-out ${
        isMobile
          ? collapsed
            ? '-translate-x-full w-[256px]'
            : 'translate-x-0 w-[256px]'
          : collapsed
            ? 'w-[80px]'
            : 'w-[256px]'
      }`}
      style={{
        background: `linear-gradient(180deg, #1f2937 0%, #111827 60%, #0b1220 100%)`,
      }}
    >
      {/* Logo */}
      <div className="flex h-14 shrink-0 items-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className={`flex flex-1 items-center ${collapsed ? 'justify-center px-0' : 'gap-3 px-5'}`}>
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
            style={{
              background: 'linear-gradient(145deg, #ef4444, #b91c1c)',
              boxShadow: '0 14px 24px -18px rgba(127,29,29,0.8)',
            }}
          >
            <Shield className="h-5 w-5" aria-hidden />
          </span>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-[16px] font-extrabold tracking-tight">Admin Panel</span>
              <span className="text-[10px] font-medium uppercase tracking-widest text-white/50">EZProject</span>
            </div>
          )}
        </div>
      </div>

      {/* Toggle */}
      <button
        type="button"
        onClick={toggle}
        className="absolute -right-3 top-[4.5rem] z-50 flex h-6 w-6 items-center justify-center rounded-full text-white transition-colors"
        style={{ backgroundColor: '#374151', border: '1px solid rgba(255,255,255,0.1)' }}
        aria-label={collapsed ? 'Mở rộng' : 'Thu gọn'}
      >
        {collapsed ? (
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        ) : (
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        )}
      </button>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => {
            const isActive = end ? pathname === to : pathname.startsWith(to);
            return (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${navItemClass(isActive)}`}
                  title={collapsed ? label : undefined}
                  onClick={() => {
                    if (isMobile) setCollapsed(true);
                  }}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
                  {!collapsed && <span className="truncate">{label}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User */}
      <div className="px-3 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <NavLink
          to="/admin/profile"
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors ${isActive ? 'bg-white/10' : 'hover:bg-white/5'}`
          }
          onClick={() => isMobile && setCollapsed(true)}
        >
          <Avatar src={user?.avatar ?? undefined} name={user?.fullName ?? 'Admin'} size="sm" />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user?.fullName ?? 'Admin'}</p>
              <p className="truncate text-[11px] uppercase tracking-wider text-rose-300">Quản trị viên</p>
            </div>
          )}
          {!collapsed && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                logout();
              }}
              className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
              aria-label="Đăng xuất"
              title="Đăng xuất"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </NavLink>
      </div>
    </aside>
  );
}