import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { SidebarProvider, useSidebar } from './SidebarContext';
import AnnouncementBanner from '@/features/admin/AnnouncementBanner';

export default function AppLayout() {
  return (
    <SidebarProvider>
      <AppLayoutContent />
    </SidebarProvider>
  );
}

function AppLayoutContent() {
  const { collapsed, setCollapsed, isMobile } = useSidebar();

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar />
      {!collapsed && isMobile && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setCollapsed(true)}
          aria-hidden="true"
        />
      )}
      <AppMain />
    </div>
  );
}

function AppMain() {
  const { collapsed, isMobile } = useSidebar();

  return (
    <main
      className={`flex min-h-screen flex-1 flex-col transition-all duration-200 ${
        isMobile ? 'ml-0' : collapsed ? 'ml-[72px]' : 'ml-[224px]'
      }`}
    >
      <Topbar title="EZProject" />
      <AnnouncementBanner />
      <div className="flex-1 min-w-0 overflow-y-auto bg-canvas p-6">
        <div className="mx-auto w-full max-w-[1200px]">
          <Outlet />
        </div>
      </div>
    </main>
  );
}
