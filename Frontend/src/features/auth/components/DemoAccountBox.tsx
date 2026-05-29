import { CircleAlert } from 'lucide-react';

interface DemoAccountBoxProps {
  t?: (key: string) => string;
}

export default function DemoAccountBox({ t }: DemoAccountBoxProps) {
  const title = t ? t('demo_account') : 'Demo Account';
  const desc = t ? t('demo_account_desc') : 'Quick login with demo account (user123 / 123)';

  return (
    <div className="rounded-2xl border border-border bg-primary-50 px-3.5 py-2.5">
      <div className="flex items-start gap-2">
        <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
        <div className="text-[13px] leading-relaxed">
          <p className="font-semibold text-ink">{title}</p>
          <p className="text-ink-secondary">{desc}</p>
        </div>
      </div>
    </div>
  );
}
