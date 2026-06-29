import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import { AdminSidebarProvider, useAdminSidebar } from './AdminSidebarContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function AdminLayout() {
  return (
    <AdminSidebarProvider>
      <AdminShell />
    </AdminSidebarProvider>
  );
}

function AdminShell() {
  const { collapsed, isMobile, setCollapsed } = useAdminSidebar();
  const { theme } = useTheme();

  return (
    <div
      className="flex min-h-screen"
      style={{ backgroundColor: theme === 'dark' ? '#0b0f1a' : '#F5F1EC' }}
    >
      <AdminSidebar />
      {!collapsed && isMobile && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setCollapsed(true)}
          aria-hidden
        />
      )}
      <main
        className={`flex min-h-screen flex-1 flex-col transition-all duration-200 ${
          isMobile ? 'ml-0' : collapsed ? 'ml-[80px]' : 'ml-[256px]'
        }`}
      >
        <Outlet />
      </main>
    </div>
  );
}