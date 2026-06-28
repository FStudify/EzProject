/**
 * GoogleCallbackPage
 * ------------------
 * Backend redirect về đây sau OAuth Google:
 *   /auth/google/callback?accessToken=...&refreshToken=...
 *   hoặc
 *   /auth/google/callback?error=oauth_failed
 *
 * Trang này chỉ làm một việc: đọc params, lưu token, redirect vào app.
 */
import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { setTokens } from '@/api/config';
import { getMe } from '@/api/user.api';
import { useAuth } from '@/contexts/AuthContext';

export default function GoogleCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    // Chỉ chạy 1 lần (StrictMode mount 2 lần)
    if (processed.current) return;
    processed.current = true;

    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const error = searchParams.get('error');

    if (error || !accessToken || !refreshToken) {
      navigate('/login?error=google_auth_failed', { replace: true });
      return;
    }

    // Lưu tokens
    setTokens(accessToken, refreshToken);

    // Load user profile rồi redirect
    getMe()
      .then(() => refreshUser())
      .then(() => navigate('/app', { replace: true }))
      .catch(() => navigate('/login?error=google_auth_failed', { replace: true }));
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-lg">
        <GraduationCap className="h-6 w-6" />
      </div>
      <p className="text-sm font-medium text-ink-muted">Đang xử lý đăng nhập Google...</p>
      <div className="h-1 w-32 overflow-hidden rounded-full bg-surface-muted">
        <div className="h-full animate-[loading_1.2s_ease-in-out_infinite] rounded-full bg-primary" />
      </div>
    </div>
  );
}
