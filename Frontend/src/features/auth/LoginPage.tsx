import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { GraduationCap, Sun, Moon, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import BrandingPanel from './components/BrandingPanel';
import LoginForm from './components/LoginForm';

const loginMessages = {
  vi: {
    usernameRequired: 'Vui lòng nhập tên đăng nhập hoặc email',
    passwordRequired: 'Vui lòng nhập mật khẩu',
    invalidCredentials: 'Tài khoản hoặc mật khẩu sai',
  },
  en: {
    usernameRequired: 'Please enter your username or email',
    passwordRequired: 'Please enter your password',
    invalidCredentials: 'Incorrect account or password',
  },
} as const;

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, lang, setLang } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/app';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const trimmedUsername = username.trim();
    const messages = loginMessages[lang];

    if (!trimmedUsername) {
      setError(messages.usernameRequired);
      return;
    }
    if (!password) {
      setError(messages.passwordRequired);
      return;
    }

    setLoading(true);
    try {
      const ok = await login(trimmedUsername, password);
      if (ok) {
        navigate(from, { replace: true });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      setError(message === 'Tài khoản hoặc mật khẩu sai' ? messages.invalidCredentials : message || t('error'));
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
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D97853]">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className="text-base font-bold tracking-tight">EZProject</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Lang pill */}
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

          {/* Theme toggle */}
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

      <div className="relative z-20 mx-auto grid h-full w-full max-w-[1320px] grid-cols-1 items-center gap-4 px-4 py-4 sm:gap-5 sm:px-6 sm:py-5 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8 lg:px-8 lg:py-6 xl:py-7">
        <div className="lg:hidden">
          <BrandingPanel compact t={t} />
        </div>

        <BrandingPanel t={t} />

        <div className="flex items-center justify-center lg:justify-end">
          <div className="w-full max-w-[500px]">
            <LoginForm
              username={username}
              password={password}
              rememberMe={rememberMe}
              showPassword={showPassword}
              loading={loading}
              error={error}
              t={t}
              onSubmit={handleSubmit}
              onUsernameChange={setUsername}
              onPasswordChange={setPassword}
              onToggleShowPassword={() => setShowPassword((prev) => !prev)}
              onRememberMeChange={setRememberMe}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
