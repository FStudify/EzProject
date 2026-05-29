import { useState } from 'react';
import { Bell, Globe, Moon, Sun } from 'lucide-react';
import { Card, Button, useToast } from '@/components/ui';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

const NOTIF_TYPES = [
  { id: 'deadline', labelKey: 'task_due_soon' as const },
  { id: 'review', labelKey: 'status_review' as const },
  { id: 'mention', labelKey: 'task_comments' as const },
  { id: 'meeting', labelKey: 'meeting_reminder' as const },
];

export default function SettingsPage() {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { t, lang, setLang } = useLanguage();
  const [quietHours, setQuietHours] = useState(false);
  const [notifs, setNotifs] = useState<Record<string, boolean>>({
    deadline: true,
    review: true,
    mention: true,
    meeting: false,
  });

  const toggleNotif = (id: string) => {
    setNotifs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">{t('nav_settings')}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t('appearance')}</p>
      </div>

      <Card>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink-muted">
          {t('theme')}
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition-colors ${
              theme === 'light'
                ? 'border-primary bg-primary-50 text-primary-dark'
                : 'border-border text-ink hover:border-primary/40'
            }`}
          >
            <Sun className="h-4 w-4" />
            {t('theme_light')}
          </button>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition-colors ${
              theme === 'dark'
                ? 'border-primary bg-primary-50 text-primary-dark'
                : 'border-border text-ink hover:border-primary/40'
            }`}
          >
            <Moon className="h-4 w-4" />
            {t('theme_dark')}
          </button>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink-muted">
          <Globe className="h-4 w-4" />
          {t('language')}
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setLang('vi')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition-colors ${
              lang === 'vi'
                ? 'border-primary bg-primary-50 text-primary-dark'
                : 'border-border text-ink hover:border-primary/40'
            }`}
          >
            Tiếng Việt
          </button>
          <button
            type="button"
            onClick={() => setLang('en')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition-colors ${
              lang === 'en'
                ? 'border-primary bg-primary-50 text-primary-dark'
                : 'border-border text-ink hover:border-primary/40'
            }`}
          >
            English
          </button>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink-muted">
          <Bell className="h-4 w-4" />
          {t('notifications_settings')}
        </h2>
        <ul className="space-y-3">
          {NOTIF_TYPES.map((nt) => (
            <li key={nt.id} className="flex items-center justify-between">
              <span className="text-sm text-ink">{t(nt.labelKey)}</span>
              <button
                type="button"
                role="switch"
                aria-checked={notifs[nt.id]}
                onClick={() => toggleNotif(nt.id)}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  notifs[nt.id] ? 'bg-primary' : 'bg-border-strong'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    notifs[nt.id] ? 'left-5' : 'left-0.5'
                  }`}
                />
              </button>
            </li>
          ))}
        </ul>
        <label className="mt-4 flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border bg-surface-muted px-3 py-2.5">
          <span className="text-sm text-ink">Quiet hours (22:00 – 7:00)</span>
          <input
            type="checkbox"
            checked={quietHours}
            onChange={(e) => setQuietHours(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary"
          />
        </label>
      </Card>

      <Button
        variant="primary"
        onClick={() => toast(t('success'), 'success')}
      >
        {t('save_changes')}
      </Button>
    </div>
  );
}
