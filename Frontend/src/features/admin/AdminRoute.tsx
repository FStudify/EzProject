import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { ReactNode } from 'react';

interface AdminRouteProps {
  children: ReactNode;
}

/**
 * AdminRoute — gate that requires:
 *  1. Logged-in user
 *  2. role === 'ADMIN'
 *
 * Non-admin authenticated users are redirected to /app with a friendly notice.
 */
export function AdminRoute({ children }: AdminRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="text-text-secondary">Đang tải...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.role !== 'ADMIN') {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}

export default AdminRoute;