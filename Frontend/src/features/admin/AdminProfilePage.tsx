import { useCallback, useEffect, useState } from 'react';
import { Loader2, Lock, LogOut, Mail, Shield, User as UserIcon, CalendarDays } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getAdminProfile,
  changeAdminPassword,
  type AdminUser,
} from '@/api/admin.api';
import { useToast, Avatar, Modal, Button } from '@/components/ui';
import AdminPageHeader from './components/AdminPageHeader';

export default function AdminProfilePage() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPwOpen, setIsPwOpen] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const p = await getAdminProfile();
      setProfile(p);
    } catch {
      // Fallback to context user
      if (user) {
        setProfile({
          id: user.id,
          fullName: user.fullName,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          phone: user.phone,
          department: user.department,
          position: user.position,
          bio: user.bio,
          role: user.role,
          isBlocked: false,
          blockedAt: null,
          blockedUntil: null,
          blockedReason: null,
          createdAt: user.createdAt,
          language: user.language,
          theme: user.theme,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const submitPassword = async () => {
    setPwError(null);
    if (!pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword) {
      setPwError('Vui lòng điền đầy đủ các trường');
      return;
    }
    if (pwForm.newPassword.length < 6) {
      setPwError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('Mật khẩu xác nhận không khớp');
      return;
    }
    setPwLoading(true);
    try {
      await changeAdminPassword(pwForm);
      toast('Đã đổi mật khẩu thành công', 'success');
      setIsPwOpen(false);
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Đổi mật khẩu thất bại';
      setPwError(msg);
    } finally {
      setPwLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#D97853' }} />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="space-y-6 p-6">
      <AdminPageHeader
        title="Hồ sơ quản trị viên"
        description="Thông tin tài khoản và các tuỳ chọn bảo mật."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border bg-white p-6" style={{ borderColor: '#E8D8CF' }}>
          <div className="flex flex-col items-center text-center">
            <Avatar src={profile.avatar ?? undefined} name={profile.fullName} size="lg" />
            <h2 className="mt-3 text-lg font-bold text-slate-800">{profile.fullName}</h2>
            <p className="text-sm text-slate-500">@{profile.username}</p>
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">
              <Shield className="h-3 w-3" /> Quản trị viên
            </span>
          </div>

          <div className="mt-5 space-y-2 border-t pt-5" style={{ borderColor: '#E8D8CF' }}>
            <Button variant="primary" className="w-full" onClick={() => setIsPwOpen(true)}>
              <Lock className="mr-2 h-4 w-4" /> Đổi mật khẩu
            </Button>
            <Button variant="secondary" className="w-full" onClick={() => void logout()}>
              <LogOut className="mr-2 h-4 w-4" /> Đăng xuất
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 lg:col-span-2" style={{ borderColor: '#E8D8CF' }}>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Thông tin cá nhân
          </h3>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoRow icon={UserIcon} label="Họ và tên" value={profile.fullName} />
            <InfoRow icon={Mail} label="Email" value={profile.email} />
            <InfoRow icon={UserIcon} label="Username" value={profile.username} />
            <InfoRow
              icon={CalendarDays}
              label="Ngày tạo tài khoản"
              value={new Date(profile.createdAt).toLocaleString('vi-VN')}
            />
            {profile.phone && <InfoRow icon={UserIcon} label="Số điện thoại" value={profile.phone} />}
            {profile.department && <InfoRow icon={UserIcon} label="Phòng ban" value={profile.department} />}
            {profile.position && <InfoRow icon={UserIcon} label="Chức vụ" value={profile.position} />}
          </div>
          {profile.bio && (
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Giới thiệu</p>
              <p className="mt-1 text-sm text-slate-700">{profile.bio}</p>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={isPwOpen} onClose={() => setIsPwOpen(false)} title="Đổi mật khẩu" size="md">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-700">Mật khẩu hiện tại</label>
            <input
              type="password"
              value={pwForm.currentPassword}
              onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
              className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none"
              style={{ borderColor: '#E8D8CF' }}
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700">Mật khẩu mới</label>
            <input
              type="password"
              value={pwForm.newPassword}
              onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
              className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none"
              style={{ borderColor: '#E8D8CF' }}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700">Xác nhận mật khẩu mới</label>
            <input
              type="password"
              value={pwForm.confirmPassword}
              onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
              className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none"
              style={{ borderColor: '#E8D8CF' }}
              autoComplete="new-password"
            />
          </div>
          {pwError && <p className="text-xs text-rose-600">{pwError}</p>}
          <div className="flex justify-end gap-2 border-t pt-4" style={{ borderColor: '#E8D8CF' }}>
            <Button variant="ghost" onClick={() => setIsPwOpen(false)}>
              Huỷ
            </Button>
            <Button variant="primary" onClick={submitPassword} disabled={pwLoading}>
              {pwLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cập nhật'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-slate-500">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className="mt-1 truncate text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}