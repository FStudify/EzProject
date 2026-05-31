import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getProjects } from '@/api/project.api';
import { updateProfile, getUserActivities, uploadAvatar } from '@/api/user.api';
import type { Project } from '@/types';
import { useToast } from '@/components/ui';
import './ProfileStyles.css';

const BADGES = [
  { id: 'b1', title: 'Đúng hạn liên tiếp 7 task', icon: 'timer', bg: '#FDF0E8', border: '#EFC8B4', text: '#B76442', iconColor: '#D97853' },
  { id: 'b2', title: 'Nhóm trưởng đầu tiên', icon: 'crowdsource', bg: '#f5f0ff', border: '#dcd4f5', text: '#6B46C1', iconColor: '#8B4A2F' },
  { id: 'b3', title: '100% review pass', icon: 'verified', bg: '#EFF9E8', border: '#CDE8BF', text: '#4B9331', iconColor: '#53B848' },
];

function BadgeIcon({ icon }: { icon: string }) {
  const map: Record<string, string> = {
    timer: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z',
    crowdsource: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
    verified: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
  };
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d={map[icon] ?? map.timer} />
    </svg>
  );
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadAvatar(file);
      setAvatarError(false);
      await refreshUser();
      toast('Đã cập nhật ảnh đại diện thành công', 'success');
    } catch (err) {
      console.error('Failed to upload avatar', err);
      toast('Không thể cập nhật ảnh đại diện', 'error');
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
      toast('Đã cập nhật thông tin thành công', 'success');
    } catch (err) {
      console.error('Failed to update profile:', err);
      toast('Không thể cập nhật thông tin', 'error');
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
      {/* Hero Card */}
      <div
        className="overflow-hidden rounded-2xl"
        style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,249,244,0.72) 100%)', border: '1px solid #E8D8CF', boxShadow: '0 18px 30px -24px rgba(38,24,16,0.6)' }}
      >
        {/* Top accent bar */}
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #C8774D 0%, #B86843 34%, #A75C3A 100%)' }} />

        {isEditing ? (
          /* Edit mode */
          <div className="p-6 md:p-8">
            <div className="mb-5 flex items-center gap-3 pb-4" style={{ borderBottom: '1px solid #E8D8CF' }}>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: '#FFF5EC' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#D97853" strokeWidth="2" strokeLinecap="round" className="h-5 w-5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </div>
              <div>
                <h2 className="text-base font-bold" style={{ color: '#1F1F1F' }}>Chỉnh sửa hồ sơ</h2>
                <p className="text-sm" style={{ color: '#7D6F66' }}>Cập nhật thông tin cá nhân của bạn</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: '#7D6F66' }}>Tên hiển thị</label>
                <input className="ez-input" value={displayName} onChange={e => setDisplayName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: '#7D6F66' }}>Email</label>
                <input className="ez-input" type="email" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: '#7D6F66' }}>Số điện thoại</label>
                <input className="ez-input" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-3 pt-4" style={{ borderTop: '1px solid #E8D8CF' }}>
              <button
                onClick={() => setIsEditing(false)}
                className="btn-secondary btn-md"
              >
                Hủy
              </button>
              <button
                onClick={saveProfile}
                disabled={!canSaveProfile}
                className="btn-accent btn-md flex items-center gap-2"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                Lưu thay đổi
              </button>
            </div>
          </div>
        ) : (
          /* View mode */
          <div className="flex flex-col gap-6 p-8 md:flex-row md:items-center md:justify-between">
            {/* Avatar */}
            <div className="flex items-center gap-5">
              <div
                className="relative shrink-0 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                title="Nhấn để đổi ảnh"
              >
                <div className="h-[120px] w-[120px] overflow-hidden rounded-full" style={{ boxShadow: '0 8px 24px rgba(38,24,16,0.2)' }}>
                  {user?.avatar && !avatarError ? (
                    <img src={user.avatar} alt="Avatar" onError={() => setAvatarError(true)} className="h-full w-full object-cover" />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center text-4xl font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, #0651A0, #008DDE)' }}
                    >
                      {user?.fullName?.charAt(0) || 'U'}
                    </div>
                  )}
                </div>
                <div
                  className="absolute inset-0 flex items-center justify-center rounded-full opacity-0 transition-opacity hover:opacity-100"
                  style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
                >
                  <svg viewBox="0 0 24 24" fill="white" className="h-8 w-8"><path d="M12 12m-3.2 0a3.2 3.2 0 1 0 6.4 0a3.2 3.2 0 1 0 -6.4 0M9 2L7.17 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3.17L15 2H9zm3 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10z"/></svg>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-extrabold" style={{ color: '#1F1F1F', letterSpacing: '-0.02em' }}>
                    {user?.fullName || 'Người dùng'}
                  </h2>
                  <span
                    className="rounded-full px-2.5 py-1 text-xs font-semibold"
                    style={{ backgroundColor: '#e6f2fa', color: '#0651A0' }}
                  >
                    @{user?.username || 'user'}
                  </span>
                </div>
                <p className="text-sm font-medium" style={{ color: '#635648' }}>Thành viên EzProject</p>
                <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm" style={{ color: '#7D6F66' }}>
                  <span className="flex items-center gap-1.5">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    {user?.email || 'Chưa cập nhật email'}
                  </span>
                  {user?.phone && (
                    <span className="flex items-center gap-1.5">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.37a2 2 0 0 1 1.99-2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6.06 6.06l1.27-1.34a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                      {user.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsEditing(true)}
              className="btn-accent btn-md self-start md:self-auto flex items-center gap-2"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Chỉnh sửa hồ sơ
            </button>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Dự án tham gia', value: projects.length, color: '#0651A0', bg: '#e6f2fa' },
          { label: 'Task hoàn thành', value: tasksCompleted, color: '#D97853', bg: '#FFF5EC' },
          { label: 'Đúng hạn', value: `${onTimeRate}%`, color: '#53B848', bg: '#EFF9E8' },
        ].map(({ label, value, color, bg }) => (
          <div
            key={label}
            className="flex flex-col items-center rounded-2xl p-5 text-center"
            style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,249,244,0.72) 100%)', border: '1px solid #E8D8CF', boxShadow: '0 18px 30px -24px rgba(38,24,16,0.6)' }}
          >
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: bg }}>
              <svg viewBox="0 0 24 24" fill={color} className="h-5 w-5"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" opacity="0.3"/><path d="M10 17l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
            </div>
            <p className="text-2xl font-extrabold" style={{ color: '#1F1F1F' }}>{value}</p>
            <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider" style={{ color: '#7D6F66' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Badges */}
      <div>
        <h3 className="mb-4 flex items-center gap-2 text-base font-bold" style={{ color: '#1F1F1F' }}>
          <svg viewBox="0 0 24 24" fill="#F37124" className="h-5 w-5"><path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z"/></svg>
          Thành tích nổi bật
        </h3>
        <div className="flex flex-wrap gap-3">
          {BADGES.map(badge => (
            <div
              key={badge.id}
              className="flex items-center gap-3 rounded-xl px-5 py-3"
              style={{ backgroundColor: badge.bg, border: `1px solid ${badge.border}`, boxShadow: '0 4px 12px rgba(38,24,16,0.08)' }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: badge.bg, color: badge.iconColor }}>
                <BadgeIcon icon={badge.icon} />
              </div>
              <span className="text-sm font-semibold" style={{ color: badge.text }}>{badge.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Activity Timeline */}
      <div>
        <h3 className="mb-6 flex items-center gap-2 text-base font-bold" style={{ color: '#1F1F1F' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#D97853" strokeWidth="2" className="h-5 w-5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Hoạt động gần đây
        </h3>
        {activities.length === 0 ? (
          <p className="py-8 text-center text-sm" style={{ color: '#7D6F66' }}>Chưa có hoạt động nào.</p>
        ) : (
          <div className="relative pl-6 space-y-8" style={{ borderLeft: '2px solid #E8D8CF', marginLeft: '10px' }}>
            {activities.map((act, index) => {
              const dotColors = ['#0651A0', '#D97853', '#53B848'];
              const dotColor = dotColors[index % dotColors.length];
              return (
                <div key={act.id || index} className="relative">
                  <div
                    className="absolute -left-[22px] top-1 h-4 w-4 rounded-full"
                    style={{ backgroundColor: dotColor, border: '3px solid white', boxShadow: '0 0 0 1px #E8D8CF' }}
                  />
                  <div
                    className="rounded-xl p-4"
                    style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,249,244,0.72) 100%)', border: '1px solid #E8D8CF', boxShadow: '0 4px 12px rgba(38,24,16,0.06)' }}
                  >
                    <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                      <p className="text-sm font-semibold" style={{ color: '#1F1F1F' }}>{act.action}</p>
                      <span className="text-xs" style={{ color: '#7D6F66' }}>
                        {new Date(act.timestamp).toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <p className="mt-1 text-sm" style={{ color: '#635648' }}>{act.target || 'Tương tác với hệ thống'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
