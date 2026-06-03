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
  color: 'from-orange-500 to-amber-600',
  },
  {
    icon: Users,
    titleKey: 'landing_feature_team_title',
    descKey: 'landing_feature_team_desc',
    color: 'from-orange-400 to-orange-600',
  },
  {
    icon: TrendingUp,
    titleKey: 'landing_feature_progress_title',
    descKey: 'landing_feature_progress_desc',
    color: 'from-amber-500 to-orange-500',
  },
  {
    icon: Video,
    titleKey: 'landing_feature_meeting_title',
    descKey: 'landing_feature_meeting_desc',
    color: 'from-orange-500 to-red-500',
  },
  {
    icon: FileText,
    titleKey: 'landing_feature_docs_title',
    descKey: 'landing_feature_docs_desc',
    color: 'from-amber-400 to-orange-500',
  },
  {
    icon: MessageCircle,
    titleKey: 'landing_feature_chat_title',
    descKey: 'landing_feature_chat_desc',
    color: 'from-orange-400 to-amber-600',
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
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.08] via-transparent to-secondary/[0.08]" />

      {/* Top bar */}
      <header
        className="relative z-20 flex h-14 shrink-0 items-center justify-between border-b px-6"
        style={{ backgroundColor: '#FFFDFB', borderColor: '#E8D8CF' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
            style={{ background: 'linear-gradient(145deg, #A75C3A, #8B4A2F)', boxShadow: '0 14px 24px -18px rgba(31,12,3,0.7)' }}
          >
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="text-base font-bold tracking-tight" style={{ color: '#1F1F1F' }}>EZProject</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Lang pill */}
          <div
            className="flex items-center rounded-xl p-0.5"
            style={{ backgroundColor: '#F8F3EE', border: '1px solid #E8C7AE' }}
          >
            <button
              type="button"
              onClick={() => setLang('vi')}
              className="rounded-lg px-2.5 py-1 text-xs font-semibold transition-all"
              style={lang === 'vi'
                ? { backgroundColor: '#D97853', color: 'white', boxShadow: '0 2px 4px rgba(201,107,72,0.3)' }
                : { color: '#635648' }}
            >
              VI
            </button>
            <button
              type="button"
              onClick={() => setLang('en')}
              className="rounded-lg px-2.5 py-1 text-xs font-semibold transition-all"
              style={lang === 'en'
                ? { backgroundColor: '#D97853', color: 'white', boxShadow: '0 2px 4px rgba(201,107,72,0.3)' }
                : { color: '#635648' }}
            >
              EN
            </button>
          </div>

          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-colors"
            style={{ borderColor: '#E6D6CC', backgroundColor: '#FFFDFB', color: '#635648' }}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <Button variant="accent" size="sm" onClick={() => navigate('/login')}>
            {t('sign_in')}
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 pt-16 pb-14 text-center">
        <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-[28rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative">
          <div
            className="mb-5 inline-flex items-center gap-2 rounded-full px-4 py-1.5"
            style={{ backgroundColor: '#FFF5EC', border: '1px solid #EFC8B4' }}
          >
            <LayoutDashboard className="h-3.5 w-3.5" style={{ color: '#D97853' }} />
            <span className="text-xs font-semibold" style={{ color: '#B76442' }}>{t('landing_badge')}</span>
          </div>
          <h1
            className="text-4xl font-extrabold tracking-tight sm:text-5xl xl:text-[3.25rem]"
            style={{ color: '#1F1F1F', letterSpacing: '-0.02em' }}
          >
            {t('landing_hero_title')}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed" style={{ color: '#635648' }}>
            {t('landing_hero_desc')}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="accent"
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
              <p className="text-3xl font-extrabold" style={{ color: '#1F1F1F' }}>{value}</p>
              <p className="mt-0.5 text-sm" style={{ color: '#7D6F66' }}>{t(labelKey)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 pb-20">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl" style={{ color: '#1F1F1F' }}>{t('landing_features_title')}</h2>
          <p className="mt-2" style={{ color: '#7D6F66' }}>{t('landing_features_subtitle')}</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, titleKey, descKey, color }) => (
            <div
              key={titleKey}
              className="group flex flex-col rounded-2xl p-6 transition-all duration-200"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,249,244,0.72) 100%)',
                border: '1px solid #E8D8CF',
                boxShadow: '0 18px 30px -24px rgba(38,24,16,0.6)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 22px 36px -24px rgba(38,24,16,0.55)';
                e.currentTarget.style.borderColor = '#D8C9BD';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = '';
                e.currentTarget.style.boxShadow = '0 18px 30px -24px rgba(38,24,16,0.6)';
                e.currentTarget.style.borderColor = '#E8D8CF';
              }}
            >
              <div
                className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${color ? `bg-gradient-to-br ${color} text-white` : ''}`}
                style={undefined}
              >
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-base font-bold" style={{ color: '#1F1F1F' }}>{t(titleKey)}</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#635648' }}>{t(descKey)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer
        className="relative z-10 px-6 py-8"
        style={{ borderTop: '1px solid #E8D8CF', backgroundColor: '#FFF8F3' }}
      >
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-center sm:flex-row">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" style={{ color: '#D97853' }} />
            <span className="text-sm font-bold" style={{ color: '#1F1F1F' }}>EZProject</span>
          </div>
          <p className="text-sm" style={{ color: '#7D6F66' }}>{t('landing_footer')}</p>
        </div>
      </footer>
    </div>
  );
}
