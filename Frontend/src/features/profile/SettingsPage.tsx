import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useToast } from '@/components/ui';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import './ProfileStyles.css';

const NOTIF_TYPES = [
  { id: 'deadline', labelKey: 'task_due_soon' as const, icon: 'timer' },
  { id: 'review', labelKey: 'status_review' as const, icon: 'fact_check' },
  { id: 'mention', labelKey: 'task_comments' as const, icon: 'alternate_email' },
  { id: 'meeting', labelKey: 'meeting_reminder' as const, icon: 'groups' },
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

  const handleSave = () => {
    toast(t('success'), 'success');
  };

  return (
    <div className="profile-container max-w-[900px] mx-auto flex flex-col gap-5 pb-8">
      {/* Header */}
      <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <h1 className="font-headline-md text-headline-md font-extrabold text-[var(--color-on-surface)] text-gradient-animate">
          {t('nav_settings')}
        </h1>
        <p className="mt-1 text-body-md text-[var(--color-on-surface-variant)]">
          {t('appearance')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left Column */}
        <div className="flex flex-col gap-5">
          
          {/* Theme Section */}
          <section className="glass-panel neo-float rounded-2xl p-5 animate-slide-up relative overflow-hidden group" style={{ animationDelay: '0.2s' }}>
            <div className="absolute -right-10 -top-10 w-24 h-24 bg-[var(--color-primary)]/10 rounded-full blur-3xl group-hover:bg-[var(--color-primary)]/20 transition-all duration-500"></div>
            
            <h2 className="mb-4 flex items-center gap-2 font-label-md text-label-md uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              <span className="material-symbols-outlined text-[var(--color-primary)] text-[24px]">palette</span>
              {t('theme')}
            </h2>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl flex-1 transition-all duration-300 border-2 ${
                  theme === 'light'
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-[0_0_15px_rgba(53,37,205,0.2)]'
                    : 'border-transparent bg-white/40 hover:bg-white/60 shadow-sm'
                }`}
              >
                <div className={`p-2.5 rounded-full transition-colors ${theme === 'light' ? 'bg-[var(--color-primary)] text-white shadow-md shadow-indigo-500/40' : 'bg-gray-100 text-gray-500'}`}>
                  <Sun className="h-5 w-5" />
                </div>
                <span className={`font-semibold text-base ${theme === 'light' ? 'text-[var(--color-primary)]' : 'text-gray-600'}`}>{t('theme_light')}</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl flex-1 transition-all duration-300 border-2 ${
                  theme === 'dark'
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-[0_0_15px_rgba(53,37,205,0.2)]'
                    : 'border-transparent bg-white/40 hover:bg-white/60 shadow-sm'
                }`}
              >
                <div className={`p-2.5 rounded-full transition-colors ${theme === 'dark' ? 'bg-[var(--color-primary)] text-white shadow-md shadow-indigo-500/40' : 'bg-gray-100 text-gray-500'}`}>
                  <Moon className="h-5 w-5" />
                </div>
                <span className={`font-semibold text-base ${theme === 'dark' ? 'text-[var(--color-primary)]' : 'text-gray-600'}`}>{t('theme_dark')}</span>
              </button>
            </div>
          </section>

          {/* Language Section */}
          <section className="glass-panel neo-float rounded-2xl p-5 animate-slide-up relative overflow-hidden group" style={{ animationDelay: '0.3s' }}>
            <div className="absolute -right-10 -top-10 w-24 h-24 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-500"></div>
            
            <h2 className="mb-4 flex items-center gap-2 font-label-md text-label-md uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              <span className="material-symbols-outlined text-blue-500 text-[24px]">language</span>
              {t('language')}
            </h2>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setLang('vi')}
                className={`flex flex-1 items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all duration-300 border-2 ${
                  lang === 'vi'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md shadow-blue-500/20'
                    : 'border-transparent bg-white/50 text-gray-600 hover:bg-white/80 shadow-sm'
                }`}
              >
                <span className="text-xl drop-shadow-sm">🇻🇳</span> 
                <span className="text-base">Tiếng Việt</span>
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`flex flex-1 items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all duration-300 border-2 ${
                  lang === 'en'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md shadow-blue-500/20'
                    : 'border-transparent bg-white/50 text-gray-600 hover:bg-white/80 shadow-sm'
                }`}
              >
                <span className="text-xl drop-shadow-sm">🇬🇧</span> 
                <span className="text-base">English</span>
              </button>
            </div>
          </section>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-5">
          
          {/* Notifications Section */}
          <section className="glass-panel neo-float rounded-2xl p-5 animate-slide-up relative overflow-hidden group h-full" style={{ animationDelay: '0.4s' }}>
            <div className="absolute -right-10 -top-10 w-24 h-24 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all duration-500"></div>
            
            <h2 className="mb-4 flex items-center gap-2 font-label-md text-label-md uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              <span className="material-symbols-outlined text-emerald-500 text-[24px]">notifications_active</span>
              {t('notifications_settings')}
            </h2>
            
            <ul className="space-y-3">
              {NOTIF_TYPES.map((nt) => (
                <li key={nt.id} className="flex items-center justify-between p-3 rounded-xl bg-white/40 hover:bg-white/70 transition-all duration-300 border border-white/60 shadow-sm group/item cursor-pointer" onClick={() => toggleNotif(nt.id)}>
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg flex items-center justify-center transition-colors ${notifs[nt.id] ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                      <span className="material-symbols-outlined text-[20px]">{nt.icon}</span>
                    </div>
                    <span className={`font-semibold text-sm transition-colors ${notifs[nt.id] ? 'text-gray-800' : 'text-gray-500'}`}>{t(nt.labelKey)}</span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={notifs[nt.id]}
                    className={`relative h-6 w-11 rounded-full transition-colors duration-300 ease-in-out shadow-inner focus:outline-none ${
                      notifs[nt.id] ? 'bg-emerald-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-300 ease-in-out ${
                        notifs[nt.id] ? 'left-5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </li>
              ))}
            </ul>
            
            <div className="mt-4 pt-4 border-t border-[var(--color-outline-variant)]/30">
              <div 
                className="flex cursor-pointer items-center justify-between gap-3 p-3 rounded-xl bg-[var(--color-surface-container-low)]/50 border border-[var(--color-outline-variant)]/40 hover:bg-white/80 transition-all duration-300 shadow-sm"
                onClick={() => setQuietHours(!quietHours)}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg flex items-center justify-center transition-colors ${quietHours ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                    <span className="material-symbols-outlined text-[20px]">bedtime</span>
                  </div>
                  <div>
                    <div className={`font-semibold text-sm transition-colors ${quietHours ? 'text-gray-800' : 'text-gray-500'}`}>Quiet hours</div>
                    <div className="text-xs text-gray-500">22:00 – 07:00</div>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={quietHours}
                  className={`relative h-6 w-11 rounded-full transition-colors duration-300 ease-in-out shadow-inner focus:outline-none ${
                    quietHours ? 'bg-indigo-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-300 ease-in-out ${
                      quietHours ? 'left-5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>

        </div>
      </div>
      
      {/* Save Button */}
      <div className="flex justify-end mt-2 animate-slide-up" style={{ animationDelay: '0.5s' }}>
        <button
          onClick={handleSave}
          className="btn-neon px-6 py-2.5 rounded-full font-semibold flex items-center justify-center gap-2 text-base shadow-lg hover:shadow-xl transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">save</span>
          {t('save_changes')}
        </button>
      </div>
    </div>
  );
}
