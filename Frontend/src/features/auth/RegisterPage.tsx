import { type FormEvent, type ReactNode, useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { AtSign, Eye, EyeOff, LockKeyhole, UserCircle2, Sun, Moon, ArrowLeft, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import BrandingPanel from './components/BrandingPanel';
import GoogleAuthButton from './components/GoogleAuthButton';

const registerMessages = {
  vi: {
    usernameRequired: 'Vui lòng nhập tên đăng nhập',
    usernameMin: 'Tên đăng nhập phải có ít nhất 3 ký tự',
    usernameMax: 'Tên đăng nhập không được quá 30 ký tự',
    usernameFormat: 'Tên đăng nhập chỉ được chứa chữ cái, số, dấu gạch dưới hoặc dấu chấm',
    emailRequired: 'Vui lòng nhập email',
    emailInvalid: 'Email không đúng định dạng',
    passwordRequired: 'Vui lòng nhập mật khẩu',
    passwordMin: 'Mật khẩu phải có ít nhất 6 ký tự',
    confirmRequired: 'Vui lòng xác nhận mật khẩu',
    passwordMismatch: 'Mật khẩu xác nhận không khớp',
    emailTaken: 'Email đã được sử dụng',
    usernameTaken: 'Tên đăng nhập đã tồn tại',
  },
  en: {
    usernameRequired: 'Please enter a username',
    usernameMin: 'Username must be at least 3 characters',
    usernameMax: 'Username must be 30 characters or fewer',
    usernameFormat: 'Username can only contain letters, numbers, underscores, or dots',
    emailRequired: 'Please enter an email',
    emailInvalid: 'Email format is invalid',
    passwordRequired: 'Please enter a password',
    passwordMin: 'Password must be at least 6 characters',
    confirmRequired: 'Please confirm your password',
    passwordMismatch: 'Password confirmation does not match',
    emailTaken: 'Email is already in use',
    usernameTaken: 'Username is already taken',
  },
} as const;

const usernamePattern = /^[a-zA-Z0-9_.]+$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface RegisterInputProps {
  id: string;
  label: string;
  type: string;
  value: string;
  placeholder: string;
  icon: LucideIcon;
  onChange: (value: string) => void;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  toggleButton?: {
    onClick: () => void;
    label: string;
    icon: ReactNode;
  };
}

function RegisterInput({
  id,
  label,
  type,
  value,
  placeholder,
  icon: Icon,
  onChange,
  autoComplete,
  required,
  minLength,
  maxLength,
  toggleButton,
}: RegisterInputProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold" style={{ color: '#635648' }}>
        {label}
      </label>
      <div className="relative">
        <Icon
          className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2"
          style={{ color: '#9a9086' }}
          aria-hidden
        />
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full rounded-xl border px-4 py-2.5 pl-10 pr-11 text-[14px] transition-all duration-200 focus:outline-none focus:ring-4"
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          maxLength={maxLength}
          style={{
            backgroundColor: '#FFFDFB',
            color: '#1F1F1F',
            borderColor: '#E8C7AE',
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = '#D97853';
            e.currentTarget.style.boxShadow = '0 0 0 4px rgba(217,120,83,0.16)';
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = '#E8C7AE';
            e.currentTarget.style.boxShadow = '';
          }}
        />
        {toggleButton && (
          <button
            type="button"
            className="absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted transition"
            style={{ color: '#9a9086' }}
            onClick={toggleButton.onClick}
            aria-label={toggleButton.label}
          >
            {toggleButton.icon}
          </button>
        )}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite') ?? '';
  const prefilledEmail = searchParams.get('email') ?? '';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState(prefilledEmail);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register: registerUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, lang, setLang } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    if (prefilledEmail) setEmail(prefilledEmail);
  }, [prefilledEmail]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    const trimmedUsername = username.trim();
    const trimmedDisplayName = displayName.trim();
    const trimmedEmail = email.trim();
    const messages = registerMessages[lang];

    if (!trimmedUsername) {
      setError(messages.usernameRequired);
      return;
    }
    if (trimmedUsername.length < 3) {
      setError(messages.usernameMin);
      return;
    }
    if (trimmedUsername.length > 30) {
      setError(messages.usernameMax);
      return;
    }
    if (!usernamePattern.test(trimmedUsername)) {
      setError(messages.usernameFormat);
      return;
    }
    if (!trimmedEmail) {
      setError(messages.emailRequired);
      return;
    }
    if (!emailPattern.test(trimmedEmail)) {
      setError(messages.emailInvalid);
      return;
    }
    if (!password) {
      setError(messages.passwordRequired);
      return;
    }
    if (password.length < 6) {
      setError(messages.passwordMin);
      return;
    }
    if (!confirmPassword) {
      setError(messages.confirmRequired);
      return;
    }
    if (password !== confirmPassword) {
      setError(messages.passwordMismatch);
      return;
    }

    setLoading(true);
    try {
      const result = await registerUser({
        fullName: trimmedDisplayName || trimmedUsername,
        email: trimmedEmail,
        username: trimmedUsername,
        password,
        confirmPassword,
        inviteToken: inviteToken || undefined,
      });
      if (result.ok) {
        // Mới đăng ký — role mặc định là CUSTOMER, nên vào /app.
        // (Trừ khi có invite, đi qua /app/join/{token} để auto-accept.)
        if (inviteToken) {
          navigate(`/app/join/${inviteToken}`, { replace: true });
        } else if (result.user?.role === 'ADMIN') {
          navigate('/admin', { replace: true });
        } else {
          navigate('/app', { replace: true });
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('Email already in use') || message.includes('Email đã được sử dụng')) {
        setError(messages.emailTaken);
      } else if (message.includes('Username already taken') || message.includes('Tên đăng nhập đã tồn tại')) {
        setError(messages.usernameTaken);
      } else {
        setError(message || t('error'));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ez-login-shell relative h-[100dvh] overflow-y-auto lg:overflow-hidden">

      {/* Top bar */}
      <header className="relative z-30 flex h-14 shrink-0 items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{t('back_to_landing') || 'Về trang chủ'}</span>
          </button>
          <div className="h-5 w-px bg-white/20" />
          <div className="flex items-center gap-2.5 text-white drop-shadow">
            <img src="/logoEZProject.jpg" alt="EZProject" className="h-8 w-8 rounded-lg shadow-sm object-cover" />
            <span className="text-base font-bold tracking-tight">EZProject</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border border-white/20 bg-white/10 p-0.5 backdrop-blur">
            <button
              type="button"
              onClick={() => setLang('vi')}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                lang === 'vi' ? 'bg-[#D97853] text-white shadow-sm' : 'text-white/70 hover:text-white'
              }`}
            >
              VI
            </button>
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                lang === 'en' ? 'bg-[#D97853] text-white shadow-sm' : 'text-white/70 hover:text-white'
              }`}
            >
              EN
            </button>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 h-full w-full object-cover object-center"
      >
        <source src="/login.mp4" type="video/mp4" />
      </video>

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(112deg,rgba(19,42,66,0.72)_0%,rgba(30,58,84,0.56)_28%,rgba(45,85,120,0.38)_52%,rgba(31,73,88,0.68)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_34%,rgba(19,42,66,0.52),transparent_44%),radial-gradient(circle_at_14%_16%,rgba(37,99,235,0.18),transparent_30%),radial-gradient(circle_at_80%_22%,rgba(59,130,246,0.22),transparent_34%),radial-gradient(circle_at_72%_16%,rgba(99,102,241,0.16),transparent_22%),radial-gradient(circle_at_20%_84%,rgba(30,58,84,0.36),transparent_45%)]" />

      <div className="relative z-20 mx-auto grid h-full w-full max-w-[1320px] grid-cols-1 items-center gap-4 px-4 py-4 sm:gap-5 sm:px-6 sm:py-5 lg:grid-cols-[1.06fr_0.94fr] lg:gap-8 lg:px-8 lg:py-5 xl:py-6">
        <div className="lg:hidden">
          <BrandingPanel compact />
        </div>

        <BrandingPanel />

        <div className="flex items-center justify-center lg:justify-end">
          <div className="w-full max-w-[620px]">
            <div
              className="animate-ez-fade-up overflow-hidden rounded-2xl p-5 shadow-lg sm:p-6 lg:p-6"
              style={{ backgroundColor: 'rgba(255,253,251,0.96)', backdropFilter: 'blur(12px)', border: '1px solid #E8C7AE' }}
            >
              <div className="mb-4">
                <h1 className="text-[31px] font-extrabold leading-tight" style={{ color: '#1F1F1F', letterSpacing: '-0.02em' }}>
                  {t('register_title')}
                </h1>
                <p className="mt-1.5 text-sm leading-relaxed" style={{ color: '#635648' }}>
                  {t('register_subtitle')}
                </p>
                {inviteToken && prefilledEmail && (
                  <div
                    className="mt-3 flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm"
                    style={{ backgroundColor: '#FFF5EC', border: '1px solid #F0D6BD', color: '#7A4524' }}
                  >
                    <Users className="h-4 w-4 shrink-0" style={{ color: '#D97853' }} />
                    <span>Create your account to join the project. Email is pre-filled.</span>
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-3">
                  <RegisterInput
                    id="username"
                    label={t('username')}
                    type="text"
                    value={username}
                    onChange={setUsername}
                    placeholder={t('username')}
                    required
                    minLength={3}
                    maxLength={30}
                    autoComplete="username"
                    icon={UserCircle2}
                  />

                  <RegisterInput
                    id="displayName"
                    label={t('full_name')}
                    type="text"
                    value={displayName}
                    onChange={setDisplayName}
                    placeholder={t('full_name')}
                    autoComplete="name"
                    icon={UserCircle2}
                  />

                  <div className="md:col-span-2">
                    <RegisterInput
                      id="email"
                      label={t('email')}
                      type="email"
                      value={email}
                      onChange={setEmail}
                      placeholder={t('email')}
                      required
                      autoComplete="email"
                      icon={AtSign}
                    />
                  </div>

                  <RegisterInput
                    id="password"
                    label={t('password')}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={setPassword}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    icon={LockKeyhole}
                    toggleButton={{
                      onClick: () => setShowPassword((prev) => !prev),
                      label: showPassword ? 'Hide password' : 'Show password',
                      icon: showPassword ? (
                        <EyeOff className="h-[17px] w-[17px]" />
                      ) : (
                        <Eye className="h-[17px] w-[17px]" />
                      ),
                    }}
                  />

                  <RegisterInput
                    id="confirmPassword"
                    label={t('confirm_password')}
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                    icon={LockKeyhole}
                    toggleButton={{
                      onClick: () => setShowConfirmPassword((prev) => !prev),
                      label: showConfirmPassword ? 'Hide confirm password' : 'Show confirm password',
                      icon: showConfirmPassword ? (
                        <EyeOff className="h-[17px] w-[17px]" />
                      ) : (
                        <Eye className="h-[17px] w-[17px]" />
                      ),
                    }}
                  />
                </div>

                {error && (
                  <div
                    className="rounded-xl px-3.5 py-2.5 text-sm"
                    style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}
                    role="alert"
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-accent btn-lg relative inline-flex h-[46px] w-full items-center justify-center text-[15px] disabled:cursor-not-allowed disabled:opacity-65"
                >
                  {loading ? t('loading') : t('sign_up')}
                </button>

                {/* Divider */}
                <div className="relative flex items-center gap-3 py-1">
                  <div className="h-px flex-1" style={{ backgroundColor: '#E8C7AE' }} />
                  <span className="text-xs font-medium" style={{ color: '#9a9086' }}>
                    {t('or_continue_with') || 'hoặc'}
                  </span>
                  <div className="h-px flex-1" style={{ backgroundColor: '#E8C7AE' }} />
                </div>

                {/* Google OAuth */}
                <GoogleAuthButton label={t('register_with_google') || 'Đăng ký với Google'} />
              </form>

              <p className="mt-4 text-center text-sm" style={{ color: '#635648' }}>
                {t('have_account')}{' '}
                <Link
                  to="/login"
                  className="font-semibold transition hover:underline"
                  style={{ color: '#0651A0' }}
                >
                  {t('sign_in')}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
