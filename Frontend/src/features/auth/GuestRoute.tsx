import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface GuestRouteProps {
  children: React.ReactNode;
}

/** Chỉ cho phép truy cập khi chưa đăng nhập (login/register) */
export function GuestRoute({ children }: GuestRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="text-text-secondary">Đang tải...</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}
