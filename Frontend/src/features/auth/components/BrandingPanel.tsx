import type { LucideIcon } from 'lucide-react';
import { CalendarClock, CheckCircle2, FolderKanban, GraduationCap } from 'lucide-react';

interface BrandingPanelProps {
  compact?: boolean;
  t?: (key: string) => string;
}

interface FloatingBadge {
  icon: LucideIcon;
  text: string;
  className: string;
  delay: number;
  greenAccent?: boolean;
  shimmer?: boolean;
}

export default function BrandingPanel({ compact = false, t }: BrandingPanelProps) {
  const badges: FloatingBadge[] = [
    {
      icon: CheckCircle2,
      text: t ? t('landing_badge_done') : '12 Tasks completed',
      className: 'left-4 top-20 xl:left-8',
      delay: 0,
    },
    {
      icon: FolderKanban,
      text: t ? t('landing_badge_projects') : '3 Active projects',
      className: 'right-4 top-20 xl:right-10',
      delay: 1.2,
      greenAccent: true,
    },
    {
      icon: GraduationCap,
      text: t ? t('landing_badge_progress') : 'Team progress 78%',
      className: 'left-7 bottom-24 xl:left-12',
      delay: 1.9,
      greenAccent: true,
      shimmer: true,
    },
    {
      icon: CalendarClock,
      text: t ? t('landing_badge_deadline') : 'Due today',
      className: 'right-8 bottom-11 xl:right-12',
      delay: 0.7,
    },
  ];

  const heroTitle = t ? t('landing_hero_title') : 'Manage Projects Clearly, Together';
  const heroDesc = t ? t('landing_hero_desc') : 'Tasks, discussions, and progress — all in one collaborative workspace.';
  const heroSub = t ? t('landing_hero_sub') : 'Built for student teams who want to work smarter.';

  if (compact) {
    return (
      <section className="relative z-20 p-0.5">
        <div className="inline-flex items-center gap-2.5 text-white drop-shadow-[0_8px_18px_rgba(0,0,0,0.4)]">
          <GraduationCap className="h-6 w-6 text-primary-light" aria-hidden />
          <span className="text-[28px] font-extrabold leading-none tracking-[-0.012em]">EZProject</span>
        </div>
        <h2 className="mt-3.5 max-w-[520px] text-[26px] font-extrabold leading-[1.12] tracking-[-0.01em] text-white drop-shadow-[0_8px_18px_rgba(0,0,0,0.45)] sm:text-[31px]">
          {heroTitle}
        </h2>
        <p className="mt-2.5 max-w-[500px] text-[16px] leading-relaxed text-slate-200">
          {heroDesc}
        </p>
        <p className="mt-1.5 max-w-[500px] text-[13px] leading-relaxed text-slate-300">
          {heroSub}
        </p>
      </section>
    );
  }

  return (
    <section className="relative hidden h-full min-h-0 flex-col justify-center lg:flex">
      <div className="pointer-events-none absolute -left-12 top-20 h-52 w-[24rem] rounded-full bg-primary/20 blur-3xl" />

      <div className="relative z-20 max-w-[570px] space-y-4.5 pr-6 xl:pr-8">
        <div className="inline-flex items-center gap-3 text-white drop-shadow-[0_10px_22px_rgba(0,0,0,0.45)]">
          <GraduationCap className="h-10 w-10 text-primary-light" aria-hidden />
          <span className="text-[48px] font-extrabold leading-none tracking-[-0.02em] xl:text-[56px]">EZProject</span>
        </div>

        <h2 className="whitespace-nowrap text-[26px] font-extrabold leading-[1.1] tracking-[-0.012em] text-white drop-shadow-[0_10px_20px_rgba(0,0,0,0.47)] xl:text-[29px]">
          {heroTitle}
        </h2>

        <p className="whitespace-nowrap text-[16px] leading-relaxed text-slate-200 drop-shadow-[0_5px_14px_rgba(0,0,0,0.25)]">
          {heroDesc}
        </p>

        <p className="max-w-[500px] text-[15px] leading-relaxed text-slate-300">
          {heroSub}
        </p>
      </div>

      {badges.map(({ icon: Icon, text, className, delay, greenAccent, shimmer }) => (
        <div
          key={text}
          className={[
            'animate-ez-float absolute z-30 flex items-center gap-3 overflow-hidden rounded-full border border-white/60',
            'bg-sidebar/80 px-3.5 py-1.5 text-[13px] font-semibold text-white',
            'shadow-[0_22px_36px_-24px_rgba(0,0,0,0.8)] backdrop-blur-lg',
            greenAccent ? 'ring-1 ring-primary/60' : '',
            className,
          ].join(' ')}
          style={{ animationDelay: `${delay}s` }}
        >
          {shimmer && (
            <span className="pointer-events-none absolute left-0 top-0 h-px w-full overflow-hidden">
              <span className="animate-ez-green-shimmer block h-full w-20 bg-[linear-gradient(90deg,transparent,rgba(59,130,246,0.95),transparent)]" />
            </span>
          )}
          <Icon className="h-[17px] w-[17px] text-primary-light" aria-hidden />
          <span>{text}</span>
          {greenAccent && (
            <span className="pointer-events-none absolute -right-3 -top-3 inline-flex h-5 w-5 items-center justify-center">
              <span className="animate-ez-green-pulse absolute inline-flex h-5 w-5 rounded-full bg-primary/52" />
              <span className="relative inline-flex h-3 w-3 rounded-full border border-primary/85 bg-primary" />
            </span>
          )}
        </div>
      ))}
    </section>
  );
}
