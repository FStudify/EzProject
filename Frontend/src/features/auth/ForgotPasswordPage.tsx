import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  GraduationCap,
  Mail,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import { forgotPassword } from '@/api/auth.api';

/**
 * Trang nhập email để nhận liên kết đặt lại mật khẩu.
 *
 * Flow:
 *  1. User nhập email → POST /auth/forgot-password.
 *  2. Backend luôn trả message generic (chống enumeration).
 *  3. Sau khi submit thành công → đổi sang "trạng thái đã gửi" để user yên tâm,
 *     kể cả khi email không tồn tại trong hệ thống.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [serverMessage, setServerMessage] = useState('');

  function validate(): string {
    const trimmed = email.trim();
    if (!trimmed) return 'Vui lòng nhập email';
    // Regex email đơn giản — server vẫn validate lại.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'Email không đúng định dạng';
    return '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }

    setLoading(true);
    try {
      const result = await forgotPassword(email.trim().toLowerCase());
      // Backend trả về { message: '...' } (unwrap từ { success, data }).
      // Phòng trường hợp response không đúng shape, fallback message mặc định.
      setServerMessage(result?.message ?? '');
      setSent(true);
    } catch (err) {
      // Lỗi validate (400) hoặc lỗi server — hiển thị message từ server
      // hoặc fallback message nếu error không phải Error instance.
      const message = err instanceof Error ? err.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-[#1F2937] via-[#2C3E50] to-[#34495E]">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#D97853] opacity-20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-[#53B848] opacity-20 blur-3xl" />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-md flex-col items-center justify-center px-5 py-10">
        {/* Logo + back */}
        <div className="mb-8 flex w-full items-center justify-between">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Quay lại đăng nhập</span>
          </Link>
          <div className="flex items-center gap-2 text-white drop-shadow">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D97853]">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className="text-base font-bold tracking-tight">EZProject</span>
          </div>
        </div>

        {/* Card */}
        <div
          className="w-full animate-ez-fade-up overflow-hidden rounded-2xl p-7 shadow-2xl"
          style={{
            backgroundColor: 'rgba(255,253,251,0.97)',
            border: '1px solid #E8C7AE',
          }}
        >
          {!sent ? (
            <>
              <div className="mb-6 flex flex-col items-center text-center">
                <div
                  className="mb-4 flex h-14 w-14 items-center justify-center rounded-full"
                  style={{ backgroundColor: '#FFF5EC', border: '1px solid #F0D6BD' }}
                >
                  <KeyRound className="h-7 w-7" style={{ color: '#D97853' }} />
                </div>
                <h1 className="text-[26px] font-extrabold" style={{ color: '#1F1F1F', letterSpacing: '-0.02em' }}>
                  Quên mật khẩu?
                </h1>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: '#635648' }}>
                  Nhập email bạn đã dùng để đăng ký. Chúng tôi sẽ gửi liên kết đặt lại mật khẩu
                  qua Gmail.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-sm font-semibold"
                    style={{ color: '#1F1F1F' }}
                  >
                    Email
                  </label>
                  <div className="relative">
                    <Mail
                      className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2"
                      style={{ color: '#9a9086' }}
                      aria-hidden
                    />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-[50px] w-full rounded-2xl border py-2.5 pl-12 pr-4 text-[15px] transition-all duration-200 focus:outline-none focus:ring-4"
                      style={{
                        backgroundColor: '#FFFDFB',
                        color: '#1F1F1F',
                        borderColor: '#E8C7AE',
                      }}
                      placeholder="you@example.com"
                      required
                      autoComplete="email"
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
                  {loading ? 'Đang gửi...' : 'Gửi liên kết đặt lại'}
                </button>

                <div className="flex items-center gap-3 py-1">
                  <div className="h-px flex-1" style={{ backgroundColor: '#E8C7AE' }} />
                  <span className="text-xs" style={{ color: '#9a9086' }}>hoặc</span>
                  <div className="h-px flex-1" style={{ backgroundColor: '#E8C7AE' }} />
                </div>

                <p className="text-center text-sm" style={{ color: '#635648' }}>
                  Nhớ mật khẩu rồi?{' '}
                  <Link
                    to="/login"
                    className="font-semibold transition hover:underline"
                    style={{ color: '#0651A0' }}
                  >
                    Đăng nhập
                  </Link>
                </p>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center text-center">
              <div
                className="mb-4 flex h-14 w-14 items-center justify-center rounded-full"
                style={{ backgroundColor: '#E8F5E5', border: '1px solid #C1E2B8' }}
              >
                <CheckCircle2 className="h-8 w-8" style={{ color: '#53B848' }} />
              </div>
              <h2 className="text-[22px] font-extrabold" style={{ color: '#1F1F1F' }}>
                Đã gửi yêu cầu!
              </h2>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: '#635648' }}>
                {serverMessage ||
                  'Nếu email tồn tại trong hệ thống, chúng tôi đã gửi liên kết đặt lại mật khẩu. ' +
                    'Vui lòng kiểm tra hộp thư đến (kể cả thư mục Spam).'}
              </p>
              <p className="mt-2 text-xs" style={{ color: '#9a9086' }}>
                Liên kết có hiệu lực trong 30 phút.
              </p>

              <div className="mt-6 flex w-full flex-col gap-2">
                <Link
                  to="/login"
                  className="inline-flex h-11 w-full items-center justify-center rounded-2xl text-sm font-semibold transition"
                  style={{
                    backgroundColor: '#D97853',
                    color: '#fff',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#C4643E';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#D97853';
                  }}
                >
                  Về trang đăng nhập
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setSent(false);
                    setEmail('');
                    setError('');
                    setServerMessage('');
                  }}
                  className="inline-flex h-11 w-full items-center justify-center rounded-2xl text-sm font-semibold transition"
                  style={{
                    backgroundColor: 'transparent',
                    color: '#635648',
                    border: '1px solid #E8C7AE',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFF8F3';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  Gửi lại cho email khác
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-white/60">
          Cần trợ giúp? Liên hệ{' '}
          <a href="mailto:support@ezproject.local" className="underline hover:text-white">
            support@ezproject.local
          </a>
        </p>
      </div>
    </div>
  );
}