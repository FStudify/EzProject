import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
} from 'lucide-react';
import { resetPassword, validateResetToken } from '@/api/auth.api';

type TokenState =
  | { status: 'loading' }
  | { status: 'valid'; expiresAt: string | null }
  | { status: 'invalid'; reason: 'MALFORMED' | 'NOT_FOUND' | 'USED' | 'EXPIRED' };

const reasonText: Record<Exclude<TokenState, { status: 'valid' } | { status: 'loading' }>['reason'], string> = {
  MALFORMED: 'Liên kết đặt lại không hợp lệ.',
  NOT_FOUND: 'Liên kết đặt lại không tồn tại hoặc đã được sử dụng.',
  USED: 'Liên kết đặt lại đã được sử dụng. Vui lòng yêu cầu liên kết mới.',
  EXPIRED: 'Liên kết đặt lại đã hết hạn. Vui lòng yêu cầu liên kết mới.',
};

/**
 * Trang đặt mật khẩu mới — user mở từ link trong email.
 *
 *  /reset-password?token=...
 *
 * 1. Validate token trước khi hiển thị form.
 * 2. Submit → POST /auth/reset-password → tự động đăng nhập lại sau khi thành công
 *    (chuyển hướng về /login để user đăng nhập với mật khẩu mới).
 */
export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [tokenState, setTokenState] = useState<TokenState>({ status: 'loading' });

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Validate token khi page mount / token đổi
  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (!token) {
        setTokenState({ status: 'invalid', reason: 'MALFORMED' });
        return;
      }
      try {
        const result = await validateResetToken(token);
        if (cancelled) return;
        if (result.valid) {
          setTokenState({ status: 'valid', expiresAt: result.expiresAt ?? null });
        } else {
          setTokenState({
            status: 'invalid',
            reason: (result.reason as 'MALFORMED' | 'NOT_FOUND' | 'USED' | 'EXPIRED') || 'NOT_FOUND',
          });
        }
      } catch {
        if (!cancelled) {
          setTokenState({ status: 'invalid', reason: 'NOT_FOUND' });
        }
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [token]);

  function validateInputs(): string {
    if (!newPassword) return 'Vui lòng nhập mật khẩu mới';
    if (newPassword.length < 6) return 'Mật khẩu phải có ít nhất 6 ký tự';
    if (!confirmPassword) return 'Vui lòng xác nhận mật khẩu';
    if (newPassword !== confirmPassword) return 'Mật khẩu xác nhận không khớp';
    return '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const msg = validateInputs();
    if (msg) {
      setError(msg);
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, newPassword, confirmPassword);
      setDone(true);
      // Sau 2.5 giây tự chuyển về /login.
      setTimeout(() => navigate('/login', { replace: true }), 2500);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Đặt lại mật khẩu thất bại. Vui lòng thử lại.';
      setError(message);
      // Nếu token đã được dùng hoặc hết hạn do race condition, refresh state.
      if (message.includes('đã được sử dụng') || message.includes('hết hạn')) {
        setTokenState({
          status: 'invalid',
          reason: message.includes('hết hạn') ? 'EXPIRED' : 'USED',
        });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-[#1F2937] via-[#2C3E50] to-[#34495E]">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#D97853] opacity-20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-[#53B848] opacity-20 blur-3xl" />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-md flex-col items-center justify-center px-5 py-10">
        <div className="mb-8 flex w-full items-center justify-between">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Quay lại đăng nhập</span>
          </Link>
          <div className="flex items-center gap-2 text-white drop-shadow">
            <img src="/logoEZProject.jpg" alt="EZProject" className="h-8 w-8 rounded-lg shadow-sm object-cover" />
            <span className="text-base font-bold tracking-tight">EZProject</span>
          </div>
        </div>

        <div
          className="w-full animate-ez-fade-up overflow-hidden rounded-2xl p-7 shadow-2xl"
          style={{
            backgroundColor: 'rgba(255,253,251,0.97)',
            border: '1px solid #E8C7AE',
          }}
        >
          {/* Loading state */}
          {tokenState.status === 'loading' && (
            <div className="flex flex-col items-center py-10">
              <Loader2 className="h-10 w-10 animate-spin" style={{ color: '#D97853' }} />
              <p className="mt-4 text-sm" style={{ color: '#635648' }}>
                Đang kiểm tra liên kết...
              </p>
            </div>
          )}

          {/* Invalid token */}
          {tokenState.status === 'invalid' && (
            <div className="flex flex-col items-center text-center">
              <div
                className="mb-4 flex h-14 w-14 items-center justify-center rounded-full"
                style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}
              >
                <AlertCircle className="h-8 w-8" style={{ color: '#dc2626' }} />
              </div>
              <h2 className="text-[22px] font-extrabold" style={{ color: '#1F1F1F' }}>
                Không thể đặt lại mật khẩu
              </h2>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: '#635648' }}>
                {reasonText[tokenState.reason]}
              </p>
              <Link
                to="/forgot-password"
                className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-2xl text-sm font-semibold transition"
                style={{ backgroundColor: '#D97853', color: '#fff' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#C4643E';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#D97853';
                }}
              >
                Yêu cầu liên kết mới
              </Link>
            </div>
          )}

          {/* Done state */}
          {done && (
            <div className="flex flex-col items-center text-center">
              <div
                className="mb-4 flex h-14 w-14 items-center justify-center rounded-full"
                style={{ backgroundColor: '#E8F5E5', border: '1px solid #C1E2B8' }}
              >
                <CheckCircle2 className="h-8 w-8" style={{ color: '#53B848' }} />
              </div>
              <h2 className="text-[22px] font-extrabold" style={{ color: '#1F1F1F' }}>
                Đặt lại mật khẩu thành công!
              </h2>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: '#635648' }}>
                Mật khẩu của bạn đã được cập nhật. Đang chuyển về trang đăng nhập...
              </p>
            </div>
          )}

          {/* Valid token + form */}
          {tokenState.status === 'valid' && !done && (
            <>
              <div className="mb-6 flex flex-col items-center text-center">
                <div
                  className="mb-4 flex h-14 w-14 items-center justify-center rounded-full"
                  style={{ backgroundColor: '#FFF5EC', border: '1px solid #F0D6BD' }}
                >
                  <KeyRound className="h-7 w-7" style={{ color: '#D97853' }} />
                </div>
                <h1 className="text-[26px] font-extrabold" style={{ color: '#1F1F1F', letterSpacing: '-0.02em' }}>
                  Đặt mật khẩu mới
                </h1>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: '#635648' }}>
                  Vui lòng nhập mật khẩu mới cho tài khoản của bạn. Mật khẩu phải có ít nhất 6 ký tự.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* New password */}
                <div>
                  <label
                    htmlFor="newPassword"
                    className="mb-1.5 block text-sm font-semibold"
                    style={{ color: '#1F1F1F' }}
                  >
                    Mật khẩu mới
                  </label>
                  <div className="relative">
                    <LockKeyhole
                      className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2"
                      style={{ color: '#9a9086' }}
                      aria-hidden
                    />
                    <input
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="h-[50px] w-full rounded-2xl border py-2.5 pl-12 pr-12 text-[15px] transition-all duration-200 focus:outline-none focus:ring-4"
                      style={{
                        backgroundColor: '#FFFDFB',
                        color: '#1F1F1F',
                        borderColor: '#E8C7AE',
                      }}
                      placeholder="••••••••"
                      required
                      autoComplete="new-password"
                      autoFocus
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#D97853';
                        e.currentTarget.style.boxShadow = '0 0 0 4px rgba(217,120,83,0.16)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#E8C7AE';
                        e.currentTarget.style.boxShadow = '';
                      }}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full transition"
                      style={{ color: '#9a9086' }}
                      onClick={() => setShowPassword((p) => !p)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#D97853';
                        e.currentTarget.style.backgroundColor = '#FFF8F3';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#9a9086';
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-1.5 block text-sm font-semibold"
                    style={{ color: '#1F1F1F' }}
                  >
                    Xác nhận mật khẩu
                  </label>
                  <div className="relative">
                    <LockKeyhole
                      className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2"
                      style={{ color: '#9a9086' }}
                      aria-hidden
                    />
                    <input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-[50px] w-full rounded-2xl border py-2.5 pl-12 pr-4 text-[15px] transition-all duration-200 focus:outline-none focus:ring-4"
                      style={{
                        backgroundColor: '#FFFDFB',
                        color: '#1F1F1F',
                        borderColor: '#E8C7AE',
                      }}
                      placeholder="••••••••"
                      required
                      autoComplete="new-password"
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#D97853';
                        e.currentTarget.style.boxShadow = '0 0 0 4px rgba(217,120,83,0.16)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#E8C7AE';
                        e.currentTarget.style.boxShadow = '';
                      }}
                    />
                  </div>
                </div>

                {error && (
                  <div
                    className="rounded-2xl px-4 py-3 text-sm"
                    style={{
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#dc2626',
                    }}
                    role="alert"
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary btn-lg relative inline-flex h-11 w-full items-center justify-center text-base disabled:cursor-not-allowed disabled:opacity-65"
                >
                  {loading ? 'Đang cập nhật...' : 'Đặt lại mật khẩu'}
                </button>

                <p className="text-center text-xs" style={{ color: '#9a9086' }}>
                  Sau khi đặt lại, tất cả phiên đăng nhập khác sẽ tự động bị đăng xuất.
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}