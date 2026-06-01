import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getProjects } from '@/api/project.api';
import { updateProfile, getUserActivities, uploadAvatar } from '@/api/user.api';
import type { Project } from '@/types';
import { useToast } from '@/components/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import './ProfileStyles.css';

const BADGES = [
  { id: 'b1', titleKey: 'badge_1' as const, icon: 'timer', colorClass: 'from-amber-200 to-amber-400 text-amber-900', borderClass: 'border-amber-100' },
  { id: 'b2', titleKey: 'badge_2' as const, icon: 'crowdsource', colorClass: 'from-purple-200 to-purple-400 text-purple-900', borderClass: 'border-purple-100' },
  { id: 'b3', titleKey: 'badge_3' as const, icon: 'verified', colorClass: 'from-emerald-200 to-emerald-400 text-emerald-900', borderClass: 'border-emerald-100' },
];

export default function ProfilePage() {
  const { user, refreshUser, patchUser } = useAuth();
  const { t, lang } = useLanguage();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so the same file can be selected again later
    e.target.value = '';
    try {
      const result = await uploadAvatar(file);
      patchUser({ avatar: result.avatar });   // instant context update — no extra API call
      setAvatarError(false);
      toast(t('avatar_update_success'), 'success');
    } catch (err) {
      console.error('Failed to upload avatar', err);
      toast(t('avatar_update_error'), 'error');
    }
  };

  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(user?.username ?? '');
  const [displayName, setDisplayName] = useState(user?.fullName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [description, setDescription] = useState(user?.bio ?? '');

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasksCompleted, setTasksCompleted] = useState(0);
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    setUsername(user?.username ?? '');
    setDisplayName(user?.fullName ?? '');
    setEmail(user?.email ?? '');
    setPhone(user?.phone ?? '');
    setDescription(user?.bio ?? '');
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;
    setIsLoading(true);
    Promise.all([
      getProjects({ limit: 50 }),
      getUserActivities().catch(() => []),
    ])
      .then(([res, acts]) => {
        const myProjects = res.data.filter((p) => p.members.some((m) => m.member.id === user.id));
        setProjects(myProjects);
        const total = myProjects.reduce((acc, p) => acc + p.completedTasks, 0);
        setTasksCompleted(total);
        setActivities(acts);
      })
      .catch((err) => {
        console.error('Failed to load profile data:', err);
        setProjects([]);
      })
      .finally(() => setIsLoading(false));
  }, [user?.id]);

  const canSaveProfile = Boolean(
    user &&
    (username.trim() !== user.username || displayName.trim() !== user.fullName ||
     email.trim() !== user.email || phone.trim() !== user.phone || description.trim() !== user.bio),
  );

  const saveProfile = async () => {
    if (!user || !canSaveProfile) return;
    try {
      await updateProfile({ fullName: displayName.trim(), phone: phone.trim(), bio: description.trim() });
      await refreshUser();
      setIsEditing(false);
      toast(t('profile_update_success'), 'success');
    } catch (err) {
      console.error('Failed to update profile:', err);
      toast(t('profile_update_error'), 'error');
    }
  };

  const onTimeRate = 85;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-t-transparent" style={{ borderColor: '#E8D8CF', borderTopColor: '#D97853' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Hero Section */}
      <section className={`relative rounded-2xl ${isEditing ? 'p-6 md:p-8' : 'p-8 md:p-12'} glass-panel neo-float animate-slide-up`} style={{ animationDelay: '0.1s' }}>
        {isEditing ? (
          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex items-center gap-3 border-b border-[var(--color-outline-variant)]/30 pb-4">
              <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)]">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>edit_square</span>
              </div>
              <div>
                <h2 className="font-headline-md text-headline-md font-bold text-[var(--color-on-surface)]">{t('edit_profile')}</h2>
                <p className="font-label-md text-label-md text-[var(--color-on-surface-variant)]">{t('update_personal_info')}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-4">
              <div className="space-y-1.5">
                <label className="font-label-md text-label-md text-[var(--color-on-surface-variant)] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">person</span>
                  {t('display_name') || 'Tên hiển thị'}
                </label>
                <input
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-outline-variant)]/50 rounded-xl px-4 py-2.5 text-[var(--color-on-surface)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] transition-all"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-label-md text-label-md text-[var(--color-on-surface-variant)] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">mail</span>
                  Email
                </label>
                <input
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-outline-variant)]/50 rounded-xl px-4 py-2.5 text-[var(--color-on-surface)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] transition-all"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-label-md text-label-md text-[var(--color-on-surface-variant)] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">phone</span>
                  {t('phone')}
                </label>
                <input
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-outline-variant)]/50 rounded-xl px-4 py-2.5 text-[var(--color-on-surface)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] transition-all"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-[var(--color-outline-variant)]/30">
              <button
                onClick={() => setIsEditing(false)}
                className="px-6 py-2.5 rounded-xl font-label-md text-label-md border border-[var(--color-outline)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-variant)] transition-all"
              >
                {t('cancel')}
              </button>
              <button
                onClick={saveProfile}
                disabled={!canSaveProfile}
                className="px-6 py-2.5 rounded-xl font-label-md text-label-md bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/20 hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">save</span>
                {t('save_changes')}
              </button>
            </div>
          </div>
        ) : (
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-8">
            {/* Avatar with 3D Ring */}
            <div className="relative shrink-0 group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="absolute inset-0 bg-[var(--color-primary)]/30 rounded-full blur-2xl scale-125"></div>
              <div className="metallic-ring rounded-full relative z-10 transition-transform group-hover:scale-105">
                {user?.avatar && !avatarError ? (
                  <img
                    src={user.avatar}
                    alt="Avatar"
                    onError={() => setAvatarError(true)}
                    className="w-[120px] h-[120px] rounded-full object-cover border-4 border-white shadow-inner"
                  />
                ) : (
                  <div className="w-[120px] h-[120px] rounded-full object-cover border-4 border-white shadow-inner bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-4xl font-bold uppercase">
                    {user?.fullName?.charAt(0) || 'U'}
                  </div>
                )}

                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="material-symbols-outlined text-white text-3xl">photo_camera</span>
                </div>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
            </div>

            {/* Info */}
            <div className="flex-1 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 w-full">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-gradient-animate font-extrabold lowercase">{user?.fullName || t('default_user')}</h2>
                  <span className="px-2.5 py-1 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-label-sm-caps text-label-sm-caps shadow-sm uppercase">@{user?.username || 'user'}</span>
                </div>
                <p className="font-body-lg text-body-lg font-semibold text-[var(--color-on-surface)]">{t('ezproject_member')}</p>

                <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2 font-body-md text-body-md font-medium text-[var(--color-on-surface-variant)]">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px]">mail</span>
                    <span>{user?.email || t('email_not_updated')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px]">phone</span>
                    <span>{user?.phone || t('phone_not_updated')}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-row md:flex-col gap-3 shrink-0 w-full md:w-auto mt-4 md:mt-0">
                <button onClick={() => setIsEditing(true)} className="flex-1 md:flex-none py-2.5 px-6 rounded-full btn-neon font-label-md text-label-md flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                  {t('edit_profile')}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 2. Statistics Row (3D Cards) */}
      <section className="py-2 animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="stat-glass flex flex-col items-center group cursor-pointer">
            <span className="font-label-md text-label-md uppercase tracking-wider mb-2 font-semibold text-[var(--color-on-surface-variant)]">{t('projects')}</span>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-primary)]/5 flex items-center justify-center shadow-inner">
                <span className="material-symbols-outlined text-[28px] text-[var(--color-primary)]" style={{ filter: 'drop-shadow(0 2px 4px rgba(53,37,205,0.3))' }}>folder_open</span>
              </div>
              <span className="font-headline-lg text-headline-lg font-extrabold text-[var(--color-on-surface)]" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>{projects.length}</span>
            </div>
          </div>

          <div className="stat-glass flex flex-col items-center group cursor-pointer">
            <span className="font-label-md text-label-md uppercase tracking-wider mb-2 font-semibold text-[var(--color-on-surface-variant)]">{t('completed_tasks')}</span>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--color-secondary)]/20 to-[var(--color-secondary)]/5 flex items-center justify-center shadow-inner">
                <span className="material-symbols-outlined text-[28px] text-[var(--color-secondary)]" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,101,145,0.3))' }}>task_alt</span>
              </div>
              <span className="font-headline-lg text-headline-lg font-extrabold text-[var(--color-on-surface)]" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>{tasksCompleted}</span>
            </div>
          </div>

          <div className="stat-glass flex flex-col items-center group cursor-pointer">
            <span className="font-label-md text-label-md uppercase tracking-wider mb-2 font-semibold text-[var(--color-on-surface-variant)]">{t('on_time_rate')}</span>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center shadow-inner">
                <span className="material-symbols-outlined text-emerald-600 text-[28px]" style={{ filter: 'drop-shadow(0 2px 4px rgba(5,150,105,0.3))' }}>trending_up</span>
              </div>
              <span className="font-headline-lg text-headline-lg font-extrabold text-[var(--color-on-surface)]" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>{onTimeRate}%</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Achievements (Premium Badges) */}
      <section className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
        <h3 className="font-headline-md text-headline-md mb-6 flex items-center gap-2 font-bold drop-shadow-sm text-[var(--color-on-surface)]">
          <span className="material-symbols-outlined text-amber-500" style={{ filter: 'drop-shadow(0 0 5px rgba(245,158,11,0.5))' }} style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span>
          {t('outstanding_achievements')}
        </h3>
        <div className="flex flex-wrap gap-4">
          {BADGES.map(badge => (
            <div key={badge.id} className="badge-3d rounded-xl px-5 py-3 flex items-center gap-3 cursor-default">
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center shrink-0 shadow-inner border ${badge.colorClass} ${badge.borderClass}`}>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{badge.icon}</span>
              </div>
              <span className={`font-label-md text-label-md font-bold ${badge.colorClass.split(' ').pop()}`}>{t(badge.titleKey as any)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Activity Timeline */}
      <section className="mt-4 animate-slide-up" style={{ animationDelay: '0.4s' }}>
        <h3 className="font-headline-md text-headline-md text-[var(--color-on-surface)] mb-8 flex items-center gap-2">
          <span className="material-symbols-outlined text-[var(--color-tertiary)]">history</span>
          {t('recent_activity')}
        </h3>
        <div className="relative pl-6 md:pl-8 border-l-2 border-[var(--color-outline-variant)]/30 space-y-10 ml-4">
          {activities.length > 0 ? (
            activities.map((act, index) => {
              const colors = ['primary', 'secondary', 'tertiary'];
              const color = colors[index % colors.length];
              return (
                <div key={act.id || index} className="relative group">
                  <div className={`absolute -left-[35px] md:-left-[43px] w-5 h-5 rounded-full bg-[var(--color-surface)] border-4 border-[var(--color-${color})] shadow-sm group-hover:scale-125 transition-transform`}></div>
                  <div className="bg-[var(--color-surface)] rounded-xl p-5 border border-[var(--color-outline-variant)]/30 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                      <h4 className="font-label-md text-label-md text-[var(--color-on-surface)] font-bold">{act.action}</h4>
                      <span className="font-label-sm-caps text-label-sm-caps text-[var(--color-outline)]">
                        {new Date(act.timestamp).toLocaleString(lang === 'en' ? 'en-US' : 'vi-VN')}
                      </span>
                    </div>
                    <p className="font-body-md text-body-md text-[var(--color-on-surface-variant)]">{act.target || t('system_interaction')}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-[var(--color-on-surface-variant)] text-sm">{t('no_recent_activity')}</div>
          )}
        </div>
      </section>
    </div>
  );
}
