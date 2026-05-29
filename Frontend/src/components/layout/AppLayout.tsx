import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { SidebarProvider, useSidebar } from './SidebarContext';

export default function AppLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-canvas">
        <Sidebar />
        <AppMain />
      </div>
    </SidebarProvider>
  );
}

function AppMain() {
  const { collapsed } = useSidebar();

  return (
    <main
      className={`flex min-h-screen flex-1 flex-col transition-all duration-200 ${
        collapsed ? 'ml-[72px]' : 'ml-[224px]'
      }`}
    >
      <Topbar title="EZProject" />
      <div className="flex-1 min-w-0 overflow-y-auto bg-canvas p-6">
        <div className="mx-auto w-full max-w-[1200px]">
          <Outlet />
        </div>
      </div>
    </main>
  );
}
