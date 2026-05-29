import type { FormEvent } from 'react';
import { Eye, EyeOff, LockKeyhole, UserCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { LanguageContextValue } from '@/contexts/LanguageContext';
import DemoAccountBox from './DemoAccountBox';

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
    <div className="animate-ez-fade-up rounded-[24px] border border-border bg-surface p-5 shadow-lg sm:p-6 lg:p-7">
      <div className="mb-6">
        <h1 className="text-[34px] font-extrabold tracking-tight text-ink">{t('login_title')}</h1>
        <p className="mt-1.5 text-sm text-ink-secondary">{t('login_subtitle')}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="username" className="mb-1.5 block text-sm font-semibold text-ink">
            {t('username')}
          </label>
          <div className="relative">
            <UserCircle2
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted"
              aria-hidden
            />
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => onUsernameChange(e.target.value)}
              className="h-[50px] w-full rounded-2xl border border-border bg-surface-muted pl-12 pr-4 text-[15px] text-ink placeholder:text-ink-muted transition-all duration-200 focus:border-primary focus:bg-surface focus:outline-none focus:ring-4 focus:ring-primary/10"
              placeholder={t('username')}
              required
              autoComplete="username"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-ink">
            {t('password')}
          </label>
          <div className="relative">
            <LockKeyhole
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted"
              aria-hidden
            />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              className="h-[50px] w-full rounded-2xl border border-border bg-surface-muted pl-12 pr-12 text-[15px] text-ink placeholder:text-ink-muted transition-all duration-200 focus:border-primary focus:bg-surface focus:outline-none focus:ring-4 focus:ring-primary/10"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted transition hover:bg-surface-muted hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              onClick={onToggleShowPassword}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-ink-secondary">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => onRememberMeChange(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
            />
            <span>{t('remember_me')}</span>
          </label>

          <button
            type="button"
            onClick={(e) => e.preventDefault()}
            className="text-sm font-semibold text-ink transition hover:text-primary"
          >
            {t('forgot_password')}
          </button>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="group relative inline-flex h-11 w-full items-center justify-center overflow-hidden rounded-lg bg-primary text-base font-semibold text-white shadow-sm transition duration-200 hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-65"
        >
          <span className="absolute inset-0 bg-black/0 transition group-hover:bg-black/5" />
          <span className="relative">{loading ? t('loading') : t('sign_in')}</span>
        </button>

        <DemoAccountBox t={t} />
      </form>

      <p className="mt-5 text-center text-sm text-ink-secondary">
        {t('no_account')}{' '}
        <Link to="/register" className="font-semibold text-ink transition hover:text-primary hover:underline">
          {t('sign_up')}
        </Link>
      </p>
    </div>
  );
}
