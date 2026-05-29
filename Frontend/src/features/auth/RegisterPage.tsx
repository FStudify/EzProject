import { type FormEvent, type ReactNode, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { AtSign, Eye, EyeOff, LockKeyhole, UserCircle2, GraduationCap, Sun, Moon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import BrandingPanel from './components/BrandingPanel';

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
  toggleButton,
}: RegisterInputProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-ink">
        {label}
      </label>
      <div className="relative">
        <Icon
          className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-ink-muted"
          aria-hidden
        />
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full rounded-xl border border-border bg-surface-muted pl-10 pr-11 text-[14px] text-ink placeholder:text-ink-muted transition-all duration-200 focus:border-primary focus:bg-surface focus:outline-none focus:ring-4 focus:ring-primary/10"
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
        />
        {toggleButton && (
          <button
            type="button"
            className="absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted transition hover:bg-surface-muted hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register: registerUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, lang, setLang } = useLanguage();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t('confirm_password'));
      return;
    }

    if (password.length < 3) {
      setError(t('error'));
      return;
    }

    setLoading(true);
    try {
      const ok = await registerUser({
        fullName: displayName || username,
        email: email || `${username}@example.com`,
        username,
        password,
        confirmPassword,
      });
      if (ok) {
        navigate('/app', { replace: true });
      } else {
        setError(t('error'));
      }
    } catch {
      setError(t('error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ez-login-shell relative h-[100dvh] overflow-y-auto bg-canvas lg:overflow-hidden">

      {/* Top bar */}
      <header className="relative z-30 flex h-14 shrink-0 items-center justify-between px-6">
        <div className="flex items-center gap-2.5 text-white drop-shadow">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
            <GraduationCap className="h-4 w-4" />
          </div>
          <span className="text-base font-bold tracking-tight">EZProject</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Lang pill */}
          <div className="flex items-center rounded-lg border border-white/20 bg-white/10 p-0.5 backdrop-blur">
            <button
              type="button"
              onClick={() => setLang('vi')}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                lang === 'vi' ? 'bg-primary text-white shadow-sm' : 'text-white/70 hover:text-white'
              }`}
            >
              VI
            </button>
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                lang === 'en' ? 'bg-primary text-white shadow-sm' : 'text-white/70 hover:text-white'
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

      <div className="relative z-20 mx-auto grid h-full w-full max-w-[1320px] grid-cols-1 items-center gap-4 px-4 py-4 sm:gap-5 sm:px-6 sm:py-5 lg:grid-cols-[1.06fr_0.94fr] lg:gap-8 lg:px-8 lg:py-5 xl:py-6">
        <div className="lg:hidden">
          <BrandingPanel compact />
        </div>

        <BrandingPanel />

        <div className="flex items-center justify-center lg:justify-end">
          <div className="w-full max-w-[620px]">
            <div className="animate-ez-fade-up rounded-[24px] border border-border bg-surface p-5 shadow-lg sm:p-6 lg:p-6">
              <div className="mb-4">
                <h1 className="text-[31px] font-extrabold leading-tight tracking-tight text-ink">{t('register_title')}</h1>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">
                  {t('register_subtitle')}
                </p>
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
                    minLength={3}
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
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700" role="alert">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="group relative inline-flex h-[46px] w-full items-center justify-center overflow-hidden rounded-xl bg-primary text-[15px] font-semibold text-white shadow-md transition duration-200 hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-65"
                >
                  <span className="absolute inset-0 bg-black/0 transition group-hover:bg-black/5" />
                  <span className="relative">{loading ? t('loading') : t('sign_up')}</span>
                </button>
              </form>

              <p className="mt-4 text-center text-sm text-ink-secondary">
                {t('have_account')}{' '}
                <Link
                  to="/login"
                  className="font-semibold text-ink transition hover:text-primary hover:underline"
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
