import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { homePathForRole } from './homePath';

interface GuestRouteProps {
  children: React.ReactNode;
}

/** Chỉ cho phép truy cập khi chưa đăng nhập (login/register).
 *  Nếu đã đăng nhập, đẩy về trang phù hợp với role. */
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
    return <Navigate to={homePathForRole(user.role)} replace />;
  }

  return <>{children}</>;
}
