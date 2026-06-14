import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { ProjectLayout } from '@/components/layout';
import DashboardPage from '@/features/dashboard/DashboardPage';
import ProjectListPage from '@/features/projects/ProjectListPage';
import ProjectOverview from '@/features/projects/ProjectOverview';
import TaskBoard from '@/features/tasks/TaskBoard';
import DocumentPage from '@/features/documents/DocumentPage';
import MemberList from '@/features/members/MemberList';
import MeetingList from '@/features/meetings/MeetingList';
import { ChatPage } from '@/features/chat';
import { PerformancePage } from '@/features/performance';
import { ProfilePage, SettingsPage } from '@/features/profile';
import { ProtectedRoute, GuestRoute, LoginPage, RegisterPage } from '@/features/auth';
import { ToastProvider } from '@/components/ui';
import { ThemeProvider, LanguageProvider, AuthProvider } from '@/contexts';
import { ChatSocketProvider } from '@/contexts/ChatSocketContext';
import LandingPage from '@/features/landing/LandingPage';
import JoinProjectPage from '@/features/members/JoinProjectPage';
import InviteLandingPage from '@/features/members/InviteLandingPage';

const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <GuestRoute>
        <LoginPage />
      </GuestRoute>
    ),
  },
  {
    path: '/register',
    element: (
      <GuestRoute>
        <RegisterPage />
      </GuestRoute>
    ),
  },
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/invite/:token',
    element: <InviteLandingPage />,
  },
  {
    path: '/app/join/:token',
    element: <JoinProjectPage />,
  },
  {
    path: '/app',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'projects', element: <ProjectListPage /> },
      {
        path: 'projects/:projectId',
        element: <ProjectLayout />,
        children: [
          { index: true, element: <ProjectOverview /> },
          { path: 'tasks', element: <TaskBoard /> },
          { path: 'documents', element: <DocumentPage /> },
          { path: 'members', element: <MemberList /> },
          { path: 'meetings', element: <MeetingList /> },
          { path: 'chat', element: <ChatPage /> },
          { path: 'performance', element: <PerformancePage /> },
        ],
      },
    ],
  },
]);

export default function App() {
  return (
    <AuthProvider>
      <ChatSocketProvider>
        <ThemeProvider>
          <LanguageProvider>
            <ToastProvider>
              <RouterProvider router={router} />
            </ToastProvider>
          </LanguageProvider>
        </ThemeProvider>
      </ChatSocketProvider>
    </AuthProvider>
  );
}
