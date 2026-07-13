/**
 * GoogleCallbackPage
 * ------------------
 * Backend redirect về đây sau OAuth Google:
 *   /auth/google/callback?accessToken=...&refreshToken=...
 *   /auth/google/callback?error=oauth_failed
 *
 * Ngoài ra backend có thể redirect về /login?error=account_blocked&message=...
 * nếu user Google bị admin khoá — nhưng vì đây là entry Google, ta cũng xử
 * lý luôn: nếu callback là success nhưng later `/me` trả 403 ACCOUNT_BLOCKED,
 * thì xoá token và đẩy về /login với thông tin block.
 *
 * Trang này làm:
 *  1. Đọc params, lưu token (nếu có).
 *  2. Gọi `/me` để verify.
 *  3. Nếu role=ADMIN → redirect /admin; ngược lại → /app.
 */
import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { } from 'lucide-react';
import { setTokens, getAccessToken, clearTokens } from '@/api/config';
import { getMe } from '@/api/user.api';

export default function GoogleCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const error = searchParams.get('error');

    if (error || !accessToken || !refreshToken) {
      navigate('/login?error=google_auth_failed', { replace: true });
      return;
    }

    setTokens(accessToken, refreshToken);

    getMe()
      .then((user) => {
        const target = user?.role === 'ADMIN' ? '/admin' : '/app';
        navigate(target, { replace: true });
      })
      .catch((err) => {
        // Lỗi thường gặp: ACCOUNT_BLOCKED — xoá token và chuyển về login kèm thông báo.
        const message = err?.message || '';
        if (/bị\s*khoá|ACCOUNT_BLOCKED/i.test(message)) {
          clearTokens();
          navigate(`/login?error=account_blocked&message=${encodeURIComponent(message)}`, { replace: true });
          return;
        }
        clearTokens();
        navigate('/login?error=google_auth_failed', { replace: true });
      });
  }, []);

  if (getAccessToken() === null) {
    // Đang chuyển trang — render nhẹ để tránh flash
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <p className="text-sm text-text-secondary">Đang chuyển hướng...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas">
      <img src="/logoEZProject.jpg" alt="EZProject" className="h-12 w-12 rounded-2xl shadow-lg object-cover" />
      <p className="text-sm font-medium text-ink-muted">Đang xử lý đăng nhập Google...</p>
      <div className="h-1 w-32 overflow-hidden rounded-full bg-surface-muted">
        <div className="h-full animate-[loading_1.2s_ease-in-out_infinite] rounded-full bg-primary" />
      </div>
    </div>
  );
}
