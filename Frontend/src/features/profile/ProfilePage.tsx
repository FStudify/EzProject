import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, FolderKanban, ListTodo, Settings, TrendingUp, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, Avatar, Button } from '@/components/ui';
import ProjectCard from '@/features/projects/ProjectCard';
import { getProjects } from '@/api/project.api';
import type { Project } from '@/types';

const BADGES = [
  { id: 'b1', title: 'Đúng hạn liên tiếp 7 task', earned: true },
  { id: 'b2', title: 'Nhóm trưởng đầu tiên', earned: true },
  { id: 'b3', title: '100% review pass', earned: false },
];

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(user?.username ?? '');
  const [displayName, setDisplayName] = useState(user?.fullName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [description, setDescription] = useState(user?.bio ?? '');

  const [projects, setProjects] = useState<Project[]>([]);
  const [performance] = useState<MemberPerformance[]>([]);
  const [tasksCompleted, setTasksCompleted] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setUsername(user?.username ?? '');
    setDisplayName(user?.fullName ?? '');
    setEmail(user?.email ?? '');
    setPhone(user?.phone ?? '');
    setDescription(user?.bio ?? '');
  }, [user?.username, user?.fullName, user?.email, user?.phone, user?.bio]);

  useEffect(() => {
    if (!user?.id) return;
    setIsLoading(true);
    getProjects({ limit: 50 })
      .then((res) => {
        const myProjects = res.data
          .filter((p) => p.members.some((m) => m.member.id === user.id));
        setProjects(myProjects);
        const total = myProjects.reduce((acc, p) => acc + p.completedTasks, 0);
        setTasksCompleted(total);
      })
      .catch((err) => {
        console.error('Failed to load profile data:', err);
        setProjects([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [user?.id]);

  const canSaveProfile =
    Boolean(
      user &&
        username.trim() &&
        displayName.trim() &&
        email.trim() &&
        (username.trim() !== user.username || displayName.trim() !== user.fullName || email.trim() !== user.email || phone.trim() !== user.phone || description.trim() !== user.bio),
    );

  const saveProfile = () => {
    if (!user || !canSaveProfile) return;
    setUser({
      ...user,
      username: username.trim(),
      fullName: displayName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      bio: description.trim(),
    });
    setIsEditing(false);
  };

  const myPerformance = performance.find((p) => p.member.id === user?.id);
  const onTimeRate = myPerformance
    ? Math.round((myPerformance.tasksCompleted / Math.max(myPerformance.tasksCompleted + 2, 1)) * 88)
    : 85;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-ink-muted">Đang tải...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar name={user?.fullName ?? 'User'} size="lg" />
          <div className="min-w-0 flex-1">
            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <label htmlFor="profile-username" className="ez-label">Tên tài khoản</label>
                  <input id="profile-username" value={username} onChange={(e) => setUsername(e.target.value)} className="ez-input w-full" />
                </div>
                <div>
                  <label htmlFor="profile-display-name" className="ez-label">Tên hiển thị</label>
                  <input id="profile-display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="ez-input w-full" />
                </div>
                <div>
                  <label htmlFor="profile-email" className="ez-label">Email</label>
                  <input id="profile-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="ez-input w-full" />
                </div>
                <div>
                  <label htmlFor="profile-phone" className="ez-label">Số điện thoại</label>
                  <input id="profile-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="ez-input w-full" />
                </div>
                <div>
                  <label htmlFor="profile-description" className="ez-label">Mô tả</label>
                  <textarea id="profile-description" value={description} onChange={(e) => setDescription(e.target.value)} className="ez-input h-24 w-full resize-none" />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-2xl font-bold text-ink">{user?.fullName ?? 'Người dùng'}</p>
                  <span className="rounded-full bg-surface-muted px-2 py-1 text-xs font-medium text-ink-muted">@{user?.username ?? 'username'}</span>
                </div>
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <p className="text-ink-muted"><span className="font-semibold text-ink">Email:</span> {user?.email}</p>
                  <p className="text-ink-muted"><span className="font-semibold text-ink">SĐT:</span> {user?.phone || 'Chưa có'}</p>
                </div>
                <p className="mt-1 text-sm text-ink-secondary">{user?.bio || 'Chưa có mô tả'}</p>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {isEditing ? (
              <>
                <Button
                  variant="secondary" size="sm"
                  onClick={() => {
                    setUsername(user?.username ?? '');
                    setDisplayName(user?.fullName ?? '');
                    setEmail(user?.email ?? '');
                    setPhone(user?.phone ?? '');
                    setDescription(user?.bio ?? '');
                    setIsEditing(false);
                  }}
                >
                  Hủy
                </Button>
                <Button variant="primary" size="sm" onClick={saveProfile} disabled={!canSaveProfile}>Lưu</Button>
              </>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>Chỉnh sửa</Button>
            )}
            <Link to="/settings">
              <Button variant="secondary" size="sm">
                <Settings className="mr-2 h-4 w-4" />
                Cài đặt
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { icon: FolderKanban, label: 'Dự án tham gia', value: projects.length },
          { icon: ListTodo, label: 'Task hoàn thành', value: tasksCompleted },
          { icon: TrendingUp, label: 'Đúng hạn', value: `${onTimeRate}%` },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="ez-stat-card">
            <Icon className="mb-2 h-5 w-5 text-primary" />
            <p className="text-2xl font-bold text-ink">{value}</p>
            <p className="text-sm text-ink-muted">{label}</p>
          </div>
        ))}
      </div>

      <Card>
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-ink">
          <Award className="h-5 w-5 text-warning" />
          Huy hiệu
        </h2>
        <ul className="flex flex-wrap gap-2">
          {BADGES.map((b) => (
            <li
              key={b.id}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                b.earned
                  ? 'border-warning/40 bg-amber-50 text-amber-900'
                  : 'border-border bg-surface-muted text-ink-muted line-through'
              }`}
            >
              {b.title}
            </li>
          ))}
        </ul>
      </Card>

      <div>
        <h2 className="mb-4 text-base font-semibold text-ink">Dự án đang tham gia</h2>
        <div className="space-y-4">
          {projects.length === 0 ? (
            <p className="text-sm text-ink-muted">Chưa tham gia dự án nào.</p>
          ) : (
            projects.map((p) => <ProjectCard key={p.id} project={p} />)
          )}
        </div>
      </div>
    </div>
  );
}
