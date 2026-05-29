import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  CheckSquare,
  Users,
  TrendingUp,
  Video,
  FileText,
  Sun,
  Moon,
  ArrowRight,
  LayoutDashboard,
  MessageCircle,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui';

const features = [
  {
    icon: CheckSquare,
    titleKey: 'landing_feature_tasks_title',
    descKey: 'landing_feature_tasks_desc',
    color: 'from-blue-500 to-indigo-600',
  },
  {
    icon: Users,
    titleKey: 'landing_feature_team_title',
    descKey: 'landing_feature_team_desc',
    color: 'from-violet-500 to-purple-600',
  },
  {
    icon: TrendingUp,
    titleKey: 'landing_feature_progress_title',
    descKey: 'landing_feature_progress_desc',
    color: 'from-emerald-500 to-teal-600',
  },
  {
    icon: Video,
    titleKey: 'landing_feature_meeting_title',
    descKey: 'landing_feature_meeting_desc',
    color: 'from-orange-500 to-rose-600',
  },
  {
    icon: FileText,
    titleKey: 'landing_feature_docs_title',
    descKey: 'landing_feature_docs_desc',
    color: 'from-cyan-500 to-blue-600',
  },
  {
    icon: MessageCircle,
    titleKey: 'landing_feature_chat_title',
    descKey: 'landing_feature_chat_desc',
    color: 'from-pink-500 to-rose-600',
  },
];

const stats = [
  { value: '12', labelKey: 'landing_stat_tasks' },
  { value: '3', labelKey: 'landing_stat_projects' },
  { value: '78%', labelKey: 'landing_stat_progress' },
];

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const { t, lang, setLang } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-hidden bg-surface">
      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-transparent to-secondary/[0.06]" />

      {/* Top bar */}
      <header className="relative z-20 flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface/80 px-6 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
            <GraduationCap className="h-4 w-4" />
          </div>
          <span className="text-base font-bold tracking-tight text-ink">EZProject</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Lang pill */}
          <div className="flex items-center rounded-lg border border-border bg-surface-muted p-0.5">
            <button
              type="button"
              onClick={() => setLang('vi')}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                lang === 'vi' ? 'bg-primary text-white shadow-sm' : 'text-ink-muted hover:text-ink'
              }`}
            >
              VI
            </button>
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                lang === 'en' ? 'bg-primary text-white shadow-sm' : 'text-ink-muted hover:text-ink'
              }`}
            >
              EN
            </button>
          </div>

          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-muted text-ink-secondary transition-colors hover:border-primary/40 hover:text-primary"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/login')}
          >
            {t('sign_in')}
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 pt-16 pb-14 text-center">
        <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-[28rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-4 py-1.5">
            <LayoutDashboard className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary">{t('landing_badge')}</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-ink sm:text-5xl xl:text-[3.25rem]">
            {t('landing_hero_title')}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-ink-secondary">
            {t('landing_hero_desc')}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button
            variant="secondary"
            size="lg"
            onClick={() => navigate('/register')}
              className="gap-2"
            >
              {t('landing_cta_start')}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate('/register')}
            >
              {t('landing_cta_register')}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-14 flex flex-wrap items-center justify-center gap-8">
          {stats.map(({ value, labelKey }) => (
            <div key={labelKey} className="text-center">
              <p className="text-3xl font-extrabold text-ink">{value}</p>
              <p className="mt-0.5 text-sm text-ink-muted">{t(labelKey)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 pb-20">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold text-ink sm:text-3xl">{t('landing_features_title')}</h2>
          <p className="mt-2 text-ink-muted">{t('landing_features_subtitle')}</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, titleKey, descKey, color }) => (
            <div
              key={titleKey}
              className="group rounded-2xl border border-border bg-surface p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className={`mb-4 inline-flex rounded-xl bg-gradient-to-br p-3 text-white shadow-sm ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-base font-bold text-ink">{t(titleKey)}</h3>
              <p className="text-sm leading-relaxed text-ink-muted">{t(descKey)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border bg-surface-muted px-6 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-center sm:flex-row">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <span className="text-sm font-bold text-ink">EZProject</span>
          </div>
          <p className="text-sm text-ink-muted">{t('landing_footer')}</p>
        </div>
      </footer>
    </div>
  );
}
