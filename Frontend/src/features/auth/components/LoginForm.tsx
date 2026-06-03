import type { FormEvent } from 'react';
import { Eye, EyeOff, LockKeyhole, UserCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { LanguageContextValue } from '@/contexts/LanguageContext';

interface LoginFormProps {
  username: string;
  password: string;
  rememberMe: boolean;
  showPassword: boolean;
  loading: boolean;
  error: string;
  t: LanguageContextValue['t'];
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onToggleShowPassword: () => void;
  onRememberMeChange: (checked: boolean) => void;
}

export default function LoginForm({
  username,
  password,
  rememberMe,
  showPassword,
  loading,
  error,
  t,
  onSubmit,
  onUsernameChange,
  onPasswordChange,
  onToggleShowPassword,
  onRememberMeChange,
}: LoginFormProps) {
  return (
    <div
      className="animate-ez-fade-up overflow-hidden rounded-2xl p-5 shadow-lg sm:p-6 lg:p-7"
      style={{ backgroundColor: 'rgba(255,253,251,0.96)', backdropFilter: 'blur(12px)', border: '1px solid #E8C7AE' }}
    >
      <div className="mb-6">
        <h1 className="text-[34px] font-extrabold" style={{ color: '#1F1F1F', letterSpacing: '-0.02em' }}>
          {t('login_title')}
        </h1>
        <p className="mt-1.5 text-sm" style={{ color: '#635648' }}>{t('login_subtitle')}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {/* Username */}
        <div>
          <label htmlFor="username" className="mb-1.5 block text-sm font-semibold" style={{ color: '#1F1F1F' }}>
            {t('username')}
          </label>
          <div className="relative">
            <UserCircle2
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2"
              style={{ color: '#9a9086' }}
              aria-hidden
            />
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => onUsernameChange(e.target.value)}
              className="h-[50px] w-full rounded-2xl border py-2.5 pl-12 pr-4 text-[15px] transition-all duration-200 focus:outline-none focus:ring-4"
              style={{ backgroundColor: '#FFFDFB', color: '#1F1F1F', borderColor: '#E8C7AE' }}
              placeholder={t('username')}
              required
              autoComplete="username"
              onFocus={e => {
                e.currentTarget.style.borderColor = '#D97853';
                e.currentTarget.style.boxShadow = '0 0 0 4px rgba(217,120,83,0.16)';
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = '#E8C7AE';
                e.currentTarget.style.boxShadow = '';
              }}
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-semibold" style={{ color: '#1F1F1F' }}>
            {t('password')}
          </label>
          <div className="relative">
            <LockKeyhole
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2"
              style={{ color: '#9a9086' }}
              aria-hidden
            />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              className="h-[50px] w-full rounded-2xl border py-2.5 pl-12 pr-12 text-[15px] transition-all duration-200 focus:outline-none focus:ring-4"
              style={{ backgroundColor: '#FFFDFB', color: '#1F1F1F', borderColor: '#E8C7AE' }}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              onFocus={e => {
                e.currentTarget.style.borderColor = '#D97853';
                e.currentTarget.style.boxShadow = '0 0 0 4px rgba(217,120,83,0.16)';
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = '#E8C7AE';
                e.currentTarget.style.boxShadow = '';
              }}
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full transition"
              style={{ color: '#9a9086' }}
              onClick={onToggleShowPassword}
              onMouseEnter={e => { e.currentTarget.style.color = '#D97853'; e.currentTarget.style.backgroundColor = '#FFF8F3'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#9a9086'; e.currentTarget.style.backgroundColor = 'transparent'; }}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
            </button>
          </div>
        </div>

        {/* Remember + Forgot */}
        <div className="flex items-center justify-between gap-4">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm" style={{ color: '#635648' }}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => onRememberMeChange(e.target.checked)}
              className="h-4 w-4 rounded"
              style={{ accentColor: '#53B848' }}
            />
            <span>{t('remember_me')}</span>
          </label>
          <button
            type="button"
            className="text-sm font-semibold transition"
            style={{ color: '#635648' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#D97853'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#635648'; }}
          >
            {t('forgot_password')}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div
            className="rounded-2xl px-4 py-3 text-sm"
            style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary btn-lg relative inline-flex h-11 w-full items-center justify-center text-base disabled:cursor-not-allowed disabled:opacity-65"
        >
          {loading ? t('loading') : t('sign_in')}
        </button>
      </form>

      <p className="mt-5 text-center text-sm" style={{ color: '#635648' }}>
        {t('no_account')}{' '}
        <Link
          to="/register"
          className="font-semibold transition hover:underline"
          style={{ color: '#0651A0' }}
        >
          {t('sign_up')}
        </Link>
      </p>
    </div>
  );
}
