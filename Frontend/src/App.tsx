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
import { ProtectedRoute, GuestRoute, LoginPage, RegisterPage, GoogleCallbackPage, ForgotPasswordPage, ResetPasswordPage } from '@/features/auth';
import { PaymentResultPage, PaymentHistoryPage } from '@/features/payment';
import { ToastProvider } from '@/components/ui';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ThemeProvider, LanguageProvider, AuthProvider } from '@/contexts';
import { ChatSocketProvider } from '@/contexts/ChatSocketContext';
import LandingPage from '@/features/landing/LandingPage';
import { PricingPage } from '@/features/pricing';
import JoinProjectPage from '@/features/members/JoinProjectPage';
import InviteLandingPage from '@/features/members/InviteLandingPage';
import {
  AdminRoute,
  AdminLayout,
  AdminOverviewPage,
  AdminUsersPage,
  AdminProjectsPage,
  AdminLogsPage,
  AdminHealthPage,
  AdminAnnouncementsPage,
  AdminProfilePage,
  AdminRevenuePage,
  AdminPricingPage,
} from '@/features/admin';

const router = createBrowserRouter([
  {
    path: '/login',
    errorElement: <ErrorBoundary />,
    element: (
      <GuestRoute>
        <LoginPage />
      </GuestRoute>
    ),
  },
  {
    path: '/register',
    errorElement: <ErrorBoundary />,
    element: (
      <GuestRoute>
        <RegisterPage />
      </GuestRoute>
    ),
  },
  {
    path: '/forgot-password',
    errorElement: <ErrorBoundary />,
    element: (
      <GuestRoute>
        <ForgotPasswordPage />
      </GuestRoute>
    ),
  },
  {
    // Không bọc GuestRoute: token có thể được mở từ email trong khi user
    // vẫn còn đăng nhập ở tab khác — không cần ép logout để đặt lại pass.
    path: '/reset-password',
    errorElement: <ErrorBoundary />,
    element: <ResetPasswordPage />,
  },
  {
    // Trang nhận callback từ Google OAuth
    path: '/auth/google/callback',
    errorElement: <ErrorBoundary />,
    element: <GoogleCallbackPage />,
  },
  {
    path: '/',
    errorElement: <ErrorBoundary />,
    element: <LandingPage />,
  },
  {
    path: '/pricing',
    errorElement: <ErrorBoundary />,
    element: <PricingPage />,
  },
  {
    // PayOS return/cancel URL — bắt buộc đăng nhập.
    path: '/payment/result',
    errorElement: <ErrorBoundary />,
    element: (
      <ProtectedRoute>
        <PaymentResultPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/invite/:token',
    errorElement: <ErrorBoundary />,
    element: <InviteLandingPage />,
  },
  {
    path: '/app/join/:token',
    errorElement: <ErrorBoundary />,
    element: <JoinProjectPage />,
  },
  {
    path: '/app',
    errorElement: <ErrorBoundary />,
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'payments', element: <PaymentHistoryPage /> },

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
  // ── Admin Panel ──────────────────────────────────────────────
  {
    path: '/admin',
    errorElement: <ErrorBoundary />,
    element: (
      <AdminRoute>
        <AdminLayout />
      </AdminRoute>
    ),
    children: [
      { index: true, element: <AdminOverviewPage /> },
      { path: 'users', element: <AdminUsersPage /> },
      { path: 'projects', element: <AdminProjectsPage /> },
      { path: 'revenue', element: <AdminRevenuePage /> },
      { path: 'pricing', element: <AdminPricingPage /> },
      { path: 'logs', element: <AdminLogsPage /> },
      { path: 'health', element: <AdminHealthPage /> },
      { path: 'announcements', element: <AdminAnnouncementsPage /> },
      { path: 'profile', element: <AdminProfilePage /> },
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
