import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
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
  Check,
  Zap,
  Mail,
  MapPin,
  Facebook,
  Sparkles,
  Target,
  Eye,
  Scale,
  AlertTriangle,
  CheckCircle2,
  Star,
  Quote,
  Menu,
  X,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui';

/* ──────────────────────────────────────────────────────────────────────
   HOOKS
   ────────────────────────────────────────────────────────────────────── */

/** Intersection Observer hook – triggers "visible" once per element */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return { ref, visible };
}

/** Count-up animation hook */
function useCountUp(target: number, duration = 2000, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf: number;
    const t0 = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCount(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, start]);
  return count;
}

/* ──────────────────────────────────────────────────────────────────────
   DATA
   ────────────────────────────────────────────────────────────────────── */

const features = [
  { icon: Sparkles,       titleKey: 'landing_feature_tasks_title', descKey: 'landing_feature_tasks_desc',     gradient: 'from-orange-500 to-rose-500' },
  { icon: Users,          titleKey: 'landing_feature_team_title',  descKey: 'landing_feature_team_desc',      gradient: 'from-amber-500 to-orange-500' },
  { icon: TrendingUp,     titleKey: 'landing_feature_progress_title', descKey: 'landing_feature_progress_desc', gradient: 'from-emerald-500 to-teal-500' },
  { icon: Video,          titleKey: 'landing_feature_meeting_title',  descKey: 'landing_feature_meeting_desc',  gradient: 'from-violet-500 to-purple-500' },
  { icon: FileText,       titleKey: 'landing_feature_docs_title', descKey: 'landing_feature_docs_desc',      gradient: 'from-sky-500 to-blue-500' },
  { icon: MessageCircle,  titleKey: 'landing_feature_chat_title', descKey: 'landing_feature_chat_desc',      gradient: 'from-pink-500 to-rose-500' },
];

const navLinks = [
  { key: 'landing_nav_about',    target: 'about-section' },
  { key: 'landing_nav_features', target: 'features-section' },
  { key: 'landing_nav_mission',  target: 'mission-section' },
  { key: 'landing_nav_pricing',  target: 'pricing-section' },
  { key: 'landing_nav_reviews',  target: 'reviews-section' },
];

/* ──────────────────────────────────────────────────────────────────────
   COMPONENT
   ────────────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const { t, lang, setLang } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isVi = lang === 'vi';
  const isDark = theme === 'dark';

  // Pricing CTA: từ landing đi vào flow chọn gói + thanh toán.
  // - Chưa login → /login (sau đó PricingPage sẽ đọc planKey từ state/query
  //   để auto-trigger handleUpgrade).
  // - Đã login → /pricing?planKey=... để PricingPage auto-trigger handleUpgrade.
  const handlePlanClick = (plan: { key: string }) => {
    if (!user) {
      navigate('/login', {
        state: { from: { pathname: '/pricing', search: `?planKey=${encodeURIComponent(plan.key)}` }, planKey: plan.key },
      });
    } else {
      navigate(`/pricing?planKey=${encodeURIComponent(plan.key)}`, { state: { planKey: plan.key } });
    }
  };

  // Mobile menu
  const [mobileOpen, setMobileOpen] = useState(false);

  // Scroll-to helper
  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileOpen(false);
  }, []);

  // Reveal hooks for each section
  const heroReveal     = useReveal();
  const aboutReveal    = useReveal();
  const problemReveal  = useReveal();
  const featReveal     = useReveal();
  const missionReveal  = useReveal();
  const statsReveal    = useReveal();
  const pricingReveal  = useReveal();
  const reviewsReveal  = useReveal();
  const ctaReveal      = useReveal();

  // Count-up values
  const c1 = useCountUp(2500,  2200, statsReveal.visible);
  const c2 = useCountUp(850,   2000, statsReveal.visible);
  const c3 = useCountUp(12000, 2400, statsReveal.visible);
  const c4 = useCountUp(15,    1800, statsReveal.visible);

  // Shared styles
  const glass = isDark ? 'rgba(31,24,20,0.72)' : 'rgba(255,253,251,0.72)';
  const borderC = isDark ? '#3E2A20' : '#E8D8CF';
  const cardBg = isDark ? 'rgba(37,32,24,0.85)' : 'rgba(255,255,255,0.92)';

  /* ── Pricing Data ── */
  const pricingPlans = [
    {
      name: 'Free', key: 'free',
      price: isVi ? '0đ' : '$0',
      descKey: 'pricing_free_desc',
      accent: false,
      features: [
        'pricing_limit_projects_free', 'pricing_limit_tasks_free', 'pricing_limit_members_free',
        'pricing_limit_ai_free', 'pricing_feature_kanban',
      ],
      excluded: ['pricing_feature_timeline', 'pricing_feature_perf', 'pricing_feature_eval_leader', 'pricing_feature_eval_supervisor'],
    },
    {
      name: 'Pro', key: 'pro',
      price: isVi ? '99.000đ' : '$4.99',
      descKey: 'pricing_pro_desc',
      accent: true,
      features: [
        'pricing_limit_projects_pro', 'pricing_limit_tasks_pro', 'pricing_limit_members_pro',
        'pricing_limit_ai_pro', 'pricing_feature_kanban', 'pricing_feature_timeline',
        'pricing_feature_perf', 'pricing_feature_eval_leader',
      ],
      excluded: ['pricing_feature_eval_supervisor', 'pricing_feature_export'],
    },
    {
      name: 'Premium', key: 'premium',
      price: isVi ? '219.000đ' : '$9.99',
      descKey: 'pricing_premium_desc',
      accent: false,
      features: [
        'pricing_limit_projects_premium', 'pricing_limit_tasks_premium', 'pricing_limit_members_premium',
        'pricing_limit_ai_premium', 'pricing_feature_kanban', 'pricing_feature_timeline',
        'pricing_feature_perf', 'pricing_feature_eval_leader', 'pricing_feature_eval_supervisor',
        'pricing_feature_export', 'pricing_feature_support',
      ],
      excluded: [],
    },
  ];

  /* ── Reveal class helper ── */
  const rc = (v: boolean) =>
    `transition-all duration-700 ease-out ${v ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`;

  /* ──────── RENDER ──────── */
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-surface font-sans transition-colors duration-300">

      {/* ═══ Animated background blobs ═══ */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -left-[20%] -top-[15%] h-[60vw] w-[60vw] rounded-full opacity-30 blur-[140px]"
             style={{ background: 'radial-gradient(circle, #F97316 0%, transparent 70%)', animation: 'blobFloat 18s ease-in-out infinite' }} />
        <div className="absolute -right-[15%] top-[30%] h-[50vw] w-[50vw] rounded-full opacity-20 blur-[120px]"
             style={{ background: 'radial-gradient(circle, #D97853 0%, transparent 70%)', animation: 'blobFloat 22s ease-in-out infinite reverse' }} />
        <div className="absolute bottom-[-10%] left-[30%] h-[40vw] w-[40vw] rounded-full opacity-15 blur-[100px]"
             style={{ background: 'radial-gradient(circle, #FB923C 0%, transparent 70%)', animation: 'blobFloat 20s ease-in-out infinite 4s' }} />
      </div>

      {/* ═══ NAVBAR ═══ */}
      <header className="sticky top-0 z-50 border-b backdrop-blur-xl transition-all" style={{ background: glass, borderColor: borderC }}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          {/* Logo */}
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2.5 focus:outline-none">
            <img src="/logoEZProject.jpg" alt="EZProject" className="h-9 w-9 rounded-xl shadow-lg object-cover" />
            <span className="text-lg font-extrabold tracking-tight text-ink-primary">EZProject</span>
          </button>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ key, target }) => (
              <button key={key} type="button" onClick={() => scrollTo(target)}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-ink-muted transition-all hover:text-primary hover:bg-primary/5">
                {t(key)}
              </button>
            ))}
          </nav>

          {/* Right side controls */}
          <div className="flex items-center gap-3">
            {/* Language Toggle */}
            <div className="flex items-center rounded-lg border p-0.5" style={{ borderColor: borderC, background: isDark ? '#2F231C' : '#FFF8F3' }}>
              {(['vi', 'en'] as const).map(l => (
                <button key={l} type="button" onClick={() => setLang(l)}
                  className="rounded-md px-2 py-1 text-[11px] font-bold uppercase transition-all"
                  style={lang === l ? { background: '#F97316', color: '#fff', boxShadow: '0 2px 6px rgba(249,115,22,0.3)' } : { color: isDark ? '#C4B5A6' : '#635648' }}>
                  {l}
                </button>
              ))}
            </div>

            {/* Theme toggle */}
            <button type="button" onClick={toggleTheme}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-all hover:scale-105 active:scale-95"
              style={{ borderColor: borderC, background: isDark ? '#2F231C' : '#FFFDFB', color: isDark ? '#FFFDFB' : '#635648' }}>
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Sign in */}
            <Button variant="accent" size="md" onClick={() => navigate('/login')} className="hidden sm:inline-flex font-bold shadow-md hover:scale-[1.03] active:scale-[0.97]">
              {t('sign_in')}
            </Button>

            {/* Mobile hamburger */}
            <button type="button" onClick={() => setMobileOpen(!mobileOpen)} className="inline-flex md:hidden h-9 w-9 items-center justify-center rounded-lg border transition-all" style={{ borderColor: borderC }}>
              {mobileOpen ? <X className="h-4 w-4 text-ink-primary" /> : <Menu className="h-4 w-4 text-ink-primary" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div className="md:hidden border-t px-5 pb-4 pt-2" style={{ borderColor: borderC, background: glass }}>
            {navLinks.map(({ key, target }) => (
              <button key={key} type="button" onClick={() => scrollTo(target)}
                className="block w-full text-left rounded-lg px-3 py-2.5 text-sm font-semibold text-ink-muted transition-colors hover:text-primary hover:bg-primary/5">
                {t(key)}
              </button>
            ))}
            <Button variant="accent" size="md" onClick={() => navigate('/login')} className="mt-3 w-full font-bold sm:hidden">
              {t('sign_in')}
            </Button>
          </div>
        )}
      </header>

      {/* ═══ HERO SECTION ═══ */}
      <section ref={heroReveal.ref} className="relative z-10 mx-auto max-w-7xl px-5 pt-20 pb-10 lg:pt-28 lg:pb-16">
        <div className={`text-center ${rc(heroReveal.visible)}`}>
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 border transition-transform hover:scale-105"
               style={{ background: isDark ? '#3B261D' : '#FFF5EC', borderColor: isDark ? '#5E3827' : '#EFC8B4' }}>
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-bold text-primary">{t('landing_badge')}</span>
          </div>

          {/* Headline */}
          <h1 className="mx-auto max-w-4xl text-4xl font-black leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl"
              style={{ background: isDark ? 'linear-gradient(135deg,#FFFDFB 30%,#E8D8CF)' : 'linear-gradient(135deg,#1F1814 30%,#C2410C)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {t('landing_hero_title')}
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg leading-relaxed text-ink-muted font-medium">
            {t('landing_hero_desc')}
          </p>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button variant="accent" size="lg" onClick={() => navigate('/register')}
              className="gap-2 font-bold shadow-xl shadow-primary/20 transition-all hover:-translate-y-1 hover:shadow-primary/30 active:translate-y-0 active:scale-[0.98]">
              {t('landing_cta_start')}
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button variant="secondary" size="lg" onClick={() => navigate('/pricing')}
              className="font-bold border transition-all hover:-translate-y-1" style={{ borderColor: borderC }}>
              {isVi ? 'Xem các gói & giá' : 'View Plans'}
            </Button>
            <Button variant="ghost" size="lg" onClick={() => scrollTo('features-section')}
              className="font-bold transition-all hover:bg-surface-hover hover:-translate-y-1">
              {isVi ? 'Tính năng' : 'Features'}
            </Button>
          </div>
        </div>

        {/* ── WORKSPACE MOCKUP ── */}
        <div className={`mt-16 lg:mt-20 mx-auto max-w-5xl transition-all duration-1000 delay-200 ${heroReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
          <div className="rounded-3xl border p-1.5 md:p-3 shadow-2xl overflow-hidden" style={{ background: cardBg, borderColor: borderC, backdropFilter: 'blur(16px)' }}>
            {/* Window chrome */}
            <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: borderC }}>
              <div className="flex gap-2">
                <span className="w-3 h-3 rounded-full bg-red-400/80" />
                <span className="w-3 h-3 rounded-full bg-yellow-400/80" />
                <span className="w-3 h-3 rounded-full bg-green-400/80" />
              </div>
              <div className="flex-1 mx-6">
                <div className="mx-auto max-w-sm h-6 rounded-md flex items-center justify-center text-[11px] font-semibold tracking-wide text-ink-muted/50 border" style={{ borderColor: borderC, background: isDark ? '#1F1510' : '#FFF8F3' }}>
                  ezproject.io/workspace
                </div>
              </div>
              <div className="w-10" />
            </div>

            {/* Workspace body */}
            <div className="flex min-h-[260px] md:min-h-[320px]">
              {/* Sidebar mock */}
              <div className="hidden md:flex flex-col w-48 shrink-0 border-r p-4 gap-3" style={{ borderColor: borderC, background: isDark ? 'rgba(31,21,16,0.6)' : 'rgba(255,245,236,0.5)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <img src="/logoEZProject.jpg" alt="EZProject" className="h-7 w-7 rounded-lg object-cover" />
                  <span className="text-xs font-bold text-ink-primary">EZProject</span>
                </div>
                {[{ icon: LayoutDashboard, label: 'Dashboard', active: true }, { icon: CheckSquare, label: 'Tasks', active: false }, { icon: MessageCircle, label: 'Chat', active: false }, { icon: FileText, label: 'Files', active: false }].map(item => (
                  <div key={item.label} className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${item.active ? 'bg-primary/10 text-primary' : 'text-ink-muted hover:text-ink-secondary'}`}>
                    <item.icon className="h-3.5 w-3.5" />
                    {item.label}
                  </div>
                ))}
              </div>

              {/* Main content area */}
              <div className="flex-1 p-4 md:p-5 space-y-4">
                {/* Top bar */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-ink-primary">{isVi ? 'Đồ án Kỹ thuật phần mềm' : 'Software Engineering Capstone'}</h3>
                    <p className="text-[11px] text-ink-muted mt-0.5">{isVi ? '4 thành viên · Sprint 3' : '4 members · Sprint 3'}</p>
                  </div>
                  <div className="flex -space-x-1.5">
                    {['bg-orange-500', 'bg-blue-500', 'bg-emerald-500', 'bg-purple-500'].map((c, i) => (
                      <div key={i} className={`w-6 h-6 rounded-full ${c} border-2 flex items-center justify-center text-[9px] font-bold text-white`} style={{ borderColor: isDark ? '#252018' : '#fff' }}>
                        {['T', 'K', 'H', 'M'][i]}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Kanban columns */}
                <div className="grid grid-cols-3 gap-3">
                  {/* To Do */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">{isVi ? 'Chờ làm' : 'To Do'}</span>
                      <span className="text-[10px] font-bold text-ink-muted/50 bg-surface-muted px-1.5 rounded">2</span>
                    </div>
                    {[isVi ? 'Thiết kế UI Login' : 'Design Login UI', isVi ? 'Viết API Auth' : 'Auth API'].map((task, i) => (
                      <div key={i} className="rounded-xl border p-2.5 text-[11px] font-semibold text-ink-secondary transition-all hover:-translate-y-0.5 hover:shadow-sm" style={{ borderColor: borderC, background: cardBg }}>
                        {task}
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[9px] font-bold text-ink-muted/60">{isVi ? '2 ngày nữa' : 'In 2 days'}</span>
                          <div className={`w-4 h-4 rounded-full ${i === 0 ? 'bg-orange-500' : 'bg-blue-500'} flex items-center justify-center text-[8px] font-bold text-white`}>{i === 0 ? 'T' : 'K'}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* In Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">{isVi ? 'Đang làm' : 'In Progress'}</span>
                      <span className="text-[10px] font-bold text-ink-muted/50 bg-surface-muted px-1.5 rounded">1</span>
                    </div>
                    <div className="rounded-xl border p-2.5 text-[11px] font-semibold text-ink-secondary" style={{ borderColor: '#F97316', background: cardBg, boxShadow: '0 0 0 1px rgba(249,115,22,0.15)' }}>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Sparkles className="h-3 w-3 text-primary" />
                        <span className="text-[9px] font-bold text-primary">AI Generated</span>
                      </div>
                      {isVi ? 'Tích hợp Chat nhóm' : 'Integrate Team Chat'}
                      <div className="mt-2">
                        <div className="flex justify-between text-[9px] font-bold text-ink-muted/60 mb-1">
                          <span>65%</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? '#3E2A20' : '#FFF0E6' }}>
                          <div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-500 w-[65%]" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Done */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">{isVi ? 'Hoàn thành' : 'Done'}</span>
                      <span className="text-[10px] font-bold text-ink-muted/50 bg-surface-muted px-1.5 rounded">3</span>
                    </div>
                    <div className="rounded-xl border p-2.5 text-[11px] font-semibold text-ink-secondary/60 line-through transition-all hover:-translate-y-0.5" style={{ borderColor: borderC, background: cardBg }}>
                      {isVi ? 'Setup Database' : 'Setup Database'}
                      <div className="mt-2 flex items-center gap-1 no-underline">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        <span className="text-[9px] font-bold text-emerald-600 no-underline">{isVi ? 'Hoàn thành' : 'Completed'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ ABOUT SECTION ═══ */}
      <section id="about-section" ref={aboutReveal.ref} className="relative z-10 mx-auto max-w-5xl px-5 py-20 lg:py-28">
        <div className={rc(aboutReveal.visible)}>
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-black sm:text-4xl text-ink-primary">{t('landing_about_title')}</h2>
            <p className="mt-6 text-base sm:text-lg leading-relaxed text-ink-muted font-medium">
              {t('landing_about_desc')}
            </p>
          </div>
        </div>
      </section>

      {/* ═══ PROBLEM / SOLUTION ═══ */}
      <section ref={problemReveal.ref} className="relative z-10 mx-auto max-w-6xl px-5 pb-20 lg:pb-28">
        <div className={`grid md:grid-cols-2 gap-8 lg:gap-12 ${rc(problemReveal.visible)}`}>
          {/* Problem */}
          <div className="rounded-3xl border p-8 lg:p-10" style={{ background: isDark ? 'rgba(60,20,20,0.25)' : 'rgba(255,240,235,0.7)', borderColor: isDark ? '#5E2A20' : '#F5D0C4' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <h3 className="text-xl font-black text-ink-primary">{t('landing_problem_title')}</h3>
            </div>
            <ul className="space-y-4">
              {(['landing_problem_1', 'landing_problem_2', 'landing_problem_3'] as const).map(k => (
                <li key={k} className="flex items-start gap-3 text-sm font-medium text-ink-secondary leading-relaxed">
                  <X className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                  {t(k)}
                </li>
              ))}
            </ul>
          </div>

          {/* Solution */}
          <div className="rounded-3xl border p-8 lg:p-10" style={{ background: isDark ? 'rgba(20,60,20,0.2)' : 'rgba(236,253,245,0.7)', borderColor: isDark ? '#1E4A2A' : '#B6E8CA' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <h3 className="text-xl font-black text-ink-primary">{t('landing_solution_title')}</h3>
            </div>
            <ul className="space-y-4">
              {(['landing_solution_1', 'landing_solution_2', 'landing_solution_3'] as const).map(k => (
                <li key={k} className="flex items-start gap-3 text-sm font-medium text-ink-secondary leading-relaxed">
                  <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  {t(k)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ═══ FEATURES SECTION ═══ */}
      <section id="features-section" ref={featReveal.ref} className="relative z-10 mx-auto max-w-6xl px-5 py-20 lg:py-28">
        <div className={rc(featReveal.visible)}>
          <div className="text-center mb-14">
            <h2 className="text-3xl font-black sm:text-4xl text-ink-primary">{t('landing_features_title')}</h2>
            <p className="mt-4 text-base sm:text-lg text-ink-muted max-w-2xl mx-auto font-medium">{t('landing_features_subtitle')}</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, titleKey, descKey, gradient }, idx) => (
              <div key={titleKey}
                className="group relative flex flex-col rounded-2xl border p-7 transition-all duration-500 hover:-translate-y-2 overflow-hidden cursor-default"
                style={{ background: cardBg, borderColor: borderC, transitionDelay: `${idx * 60}ms`,
                  boxShadow: '0 8px 24px -12px rgba(0,0,0,0.08)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#F97316'; e.currentTarget.style.boxShadow = '0 20px 40px -12px rgba(249,115,22,0.15)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = borderC; e.currentTarget.style.boxShadow = '0 8px 24px -12px rgba(0,0,0,0.08)'; }}>
                {/* Glow */}
                <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-primary/5 blur-2xl transition-all duration-500 group-hover:bg-primary/10 group-hover:w-40 group-hover:h-40" />

                <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-base font-bold text-ink-primary relative z-10">{t(titleKey)}</h3>
                <p className="text-sm leading-relaxed text-ink-muted font-medium relative z-10">{t(descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ MISSION SECTION ═══ */}
      <section id="mission-section" ref={missionReveal.ref} className="relative z-10 mx-auto max-w-6xl px-5 py-20 lg:py-28">
        <div className={rc(missionReveal.visible)}>
          <div className="text-center mb-14">
            <h2 className="text-3xl font-black sm:text-4xl text-ink-primary">{t('landing_mission_title')}</h2>
            <p className="mt-4 text-base sm:text-lg text-ink-muted max-w-2xl mx-auto font-medium">{t('landing_mission_desc')}</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { icon: Eye,    titleKey: 'landing_mission_1_title', descKey: 'landing_mission_1_desc', color: 'from-sky-500 to-blue-600' },
              { icon: Target, titleKey: 'landing_mission_2_title', descKey: 'landing_mission_2_desc', color: 'from-orange-500 to-rose-500' },
              { icon: Scale,  titleKey: 'landing_mission_3_title', descKey: 'landing_mission_3_desc', color: 'from-emerald-500 to-teal-600' },
            ].map(({ icon: MIcon, titleKey, descKey, color }) => (
              <div key={titleKey} className="group text-center rounded-2xl border p-8 transition-all duration-500 hover:-translate-y-2"
                   style={{ background: cardBg, borderColor: borderC }}
                   onMouseEnter={e => { e.currentTarget.style.borderColor = '#F97316'; }}
                   onMouseLeave={e => { e.currentTarget.style.borderColor = borderC; }}>
                <div className={`mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${color} text-white shadow-lg transition-transform duration-500 group-hover:scale-110`}>
                  <MIcon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-ink-primary mb-2">{t(titleKey)}</h3>
                <p className="text-sm text-ink-muted font-medium leading-relaxed">{t(descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ COUNT-UP STATS ═══ */}
      <section ref={statsReveal.ref} className="relative z-10 mx-auto max-w-5xl px-5 py-16">
        <div className={`grid grid-cols-2 sm:grid-cols-4 gap-6 ${rc(statsReveal.visible)}`}>
          {[
            { value: c1, suffix: '+', key: 'landing_countup_students' },
            { value: c2, suffix: '+', key: 'landing_countup_projects' },
            { value: c3, suffix: '+', key: 'landing_countup_tasks' },
            { value: c4, suffix: '+', key: 'landing_countup_universities' },
          ].map(({ value, suffix, key }) => (
            <div key={key} className="text-center p-5 rounded-2xl border transition-all hover:scale-105" style={{ background: cardBg, borderColor: borderC }}>
              <p className="text-3xl sm:text-4xl font-black" style={{ color: '#F97316' }}>
                {value.toLocaleString()}{suffix}
              </p>
              <p className="mt-2 text-xs sm:text-sm font-bold text-ink-muted uppercase tracking-wider">{t(key)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ PRICING SECTION ═══ */}
      <section id="pricing-section" ref={pricingReveal.ref} className="relative z-10 mx-auto max-w-6xl px-5 py-20 lg:py-28">
        <div className={rc(pricingReveal.visible)}>
          <div className="text-center mb-14">
            <h2 className="text-3xl font-black sm:text-4xl text-ink-primary">{t('pricing_title')}</h2>
            <p className="mt-4 text-base sm:text-lg text-ink-muted max-w-2xl mx-auto font-medium">{t('pricing_subtitle')}</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3 items-stretch max-w-5xl mx-auto">
            {pricingPlans.map((plan) => (
              <div key={plan.key}
                className={`relative flex flex-col rounded-3xl border p-7 lg:p-8 transition-all duration-500 ${plan.accent ? 'z-10 lg:scale-105' : 'z-0'}`}
                style={{
                  background: plan.accent ? (isDark ? 'linear-gradient(180deg,#3B261D,#1F1510)' : 'linear-gradient(180deg,#FFF5EC,#FFFDFB)') : cardBg,
                  borderColor: plan.accent ? '#F97316' : borderC,
                  boxShadow: plan.accent ? '0 24px 48px -12px rgba(249,115,22,0.25)' : '0 8px 24px -12px rgba(0,0,0,0.08)',
                }}
                onMouseEnter={e => {
                  if (!plan.accent) { e.currentTarget.style.borderColor = '#F97316'; e.currentTarget.style.transform = 'translateY(-6px)'; }
                  else { e.currentTarget.style.transform = 'scale(1.07)'; e.currentTarget.style.boxShadow = '0 32px 64px -12px rgba(249,115,22,0.35)'; }
                }}
                onMouseLeave={e => {
                  if (!plan.accent) { e.currentTarget.style.borderColor = borderC; e.currentTarget.style.transform = 'none'; }
                  else { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 24px 48px -12px rgba(249,115,22,0.25)'; }
                }}
              >
                {plan.accent && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-black text-white bg-gradient-to-r from-orange-500 to-amber-500 shadow-lg shadow-orange-500/30">
                    {t('pricing_popular')}
                  </span>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-black text-ink-primary uppercase tracking-widest">{plan.name}</h3>
                  <p className="mt-2 text-sm font-medium text-ink-muted min-h-[40px]">{t(plan.descKey)}</p>
                  <div className="mt-5 flex items-baseline gap-1 text-ink-primary">
                    <span className="text-4xl sm:text-5xl font-black tracking-tight">{plan.price}</span>
                    <span className="text-sm font-bold text-ink-muted">{t('pricing_per_month')}</span>
                  </div>
                </div>

                <Button variant={plan.accent ? 'accent' : 'secondary'} size="lg" onClick={() => handlePlanClick(plan)}
                  className="w-full font-bold shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0 rounded-xl">
                  {t('pricing_get_started')}
                </Button>

                <hr className="my-6 border-dashed opacity-40" style={{ borderColor: isDark ? '#634737' : '#D8C9BD' }} />

                <div className="space-y-4 flex-1">
                  <p className="text-[11px] font-black text-ink-secondary uppercase tracking-widest">{t('pricing_features_title')}</p>
                  <ul className="space-y-3 text-sm font-medium">
                    {plan.features.map(fk => (
                      <li key={fk} className="flex items-start gap-2.5 text-ink-primary">
                        <div className="mt-0.5 rounded-full bg-emerald-100 p-0.5 dark:bg-emerald-900/30 shrink-0">
                          <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className="leading-snug">{t(fk)}</span>
                      </li>
                    ))}
                    {plan.excluded.map(fk => (
                      <li key={fk} className="flex items-start gap-2.5 text-ink-muted/40 line-through">
                        <span className="text-red-400 font-bold text-xs shrink-0 w-4 text-center mt-0.5">×</span>
                        <span className="leading-snug">{t(fk)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TESTIMONIALS ═══ */}
      <section id="reviews-section" ref={reviewsReveal.ref} className="relative z-10 mx-auto max-w-6xl px-5 py-20 lg:py-28">
        <div className={rc(reviewsReveal.visible)}>
          <div className="text-center mb-14">
            <h2 className="text-3xl font-black sm:text-4xl text-ink-primary">{t('landing_testimonial_title')}</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="group relative rounded-2xl border p-7 transition-all duration-500 hover:-translate-y-2"
                   style={{ background: cardBg, borderColor: borderC }}
                   onMouseEnter={e => { e.currentTarget.style.borderColor = '#F97316'; }}
                   onMouseLeave={e => { e.currentTarget.style.borderColor = borderC; }}>
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, s) => <Star key={s} className="h-4 w-4 fill-amber-400 text-amber-400" />)}
                </div>
                <Quote className="h-6 w-6 text-primary/20 mb-3" />
                <p className="text-sm leading-relaxed text-ink-secondary font-medium italic">
                  {t(`landing_testimonial_${i}_text` as keyof typeof import('@/i18n/dict').vi)}
                </p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center text-xs font-bold text-white shadow">
                    {t(`landing_testimonial_${i}_name` as keyof typeof import('@/i18n/dict').vi).charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-ink-primary">{t(`landing_testimonial_${i}_name` as keyof typeof import('@/i18n/dict').vi)}</p>
                    <p className="text-xs text-ink-muted font-medium">{t(`landing_testimonial_${i}_role` as keyof typeof import('@/i18n/dict').vi)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section ref={ctaReveal.ref} className="relative z-10 mx-auto max-w-4xl px-5 py-20 lg:py-28">
        <div className={rc(ctaReveal.visible)}>
          <div className="text-center rounded-3xl border p-10 lg:p-16 relative overflow-hidden"
               style={{ background: 'linear-gradient(145deg,#F97316,#C2410C)', borderColor: 'rgba(255,255,255,0.1)' }}>
            {/* Glow spots */}
            <div className="absolute top-0 left-1/4 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-56 h-56 bg-amber-400/15 rounded-full blur-3xl" />

            <h2 className="relative text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight">
              {t('landing_final_cta_title')}
            </h2>
            <p className="relative mt-4 text-base text-white/80 font-medium max-w-lg mx-auto">
              {t('landing_final_cta_desc')}
            </p>
            <div className="relative mt-8 flex flex-wrap justify-center gap-4">
              <button type="button" onClick={() => navigate('/register')}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-orange-600 shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl active:translate-y-0 active:scale-[0.98]">
                {t('landing_cta_start')}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="relative z-10 pt-16 pb-8 border-t" style={{ borderColor: borderC, background: isDark ? '#1F1510' : '#FFFDFB' }}>
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2.5 mb-5">
                <img src="/logoEZProject.jpg" alt="EZProject" className="h-9 w-9 rounded-xl shadow-lg object-cover" />
                <span className="text-lg font-black text-ink-primary">EZProject</span>
              </div>
              <p className="text-sm font-medium text-ink-muted max-w-sm leading-relaxed">{t('landing_footer')}</p>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-xs font-black text-ink-primary uppercase tracking-widest mb-5">{isVi ? 'Liên hệ' : 'Contact'}</h4>
              <ul className="space-y-3.5">
                <li className="flex items-start gap-2.5 text-sm font-medium text-ink-muted hover:text-primary transition-colors">
                  <Mail className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <a href="mailto:ezproject.work43@gmail.com" className="hover:underline">ezproject.work43@gmail.com</a>
                </li>
                <li className="flex items-start gap-2.5 text-sm font-medium text-ink-muted hover:text-primary transition-colors">
                  <MapPin className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <span>Ngũ Hành Sơn, Đà Nẵng</span>
                </li>
              </ul>
            </div>

            {/* Social */}
            <div>
              <h4 className="text-xs font-black text-ink-primary uppercase tracking-widest mb-5">{isVi ? 'Mạng xã hội' : 'Social'}</h4>
              <ul className="space-y-3.5">
                <li className="flex items-center gap-2.5 text-sm font-medium text-ink-muted hover:text-blue-600 transition-colors">
                  <Facebook className="h-4 w-4 text-blue-600 shrink-0" />
                  <a href="https://www.facebook.com/ezproject.edu" target="_blank" rel="noopener noreferrer" className="hover:underline">
                    EzProject Education
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4" style={{ borderColor: borderC }}>
            <p className="text-xs font-semibold text-ink-muted/60">© {new Date().getFullYear()} EZProject. All rights reserved.</p>
            <div className="flex items-center gap-6 text-xs font-semibold text-ink-muted/60">
              <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>

      {/* ═══ Global keyframes (injected via style tag) ═══ */}
      <style>{`
        @keyframes blobFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.05); }
          66% { transform: translate(-20px, 30px) scale(0.95); }
        }
      `}</style>
    </div>
  );
}
