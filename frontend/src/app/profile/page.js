'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import {
  UserIcon,
  ShieldIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
} from '@/components/Icons';

export default function ProfilePage() {
  const router = useRouter();
  const { user, refreshUser, loading: authLoading } = useAuth();

  const [profileData, setProfileData] = useState({
    displayName: '',
    bio: '',
    country: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  const [changingPass, setChangingPass] = useState(false);
  const [passSuccess, setPassSuccess] = useState('');
  const [passError, setPassError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login?redirect=/profile');
      return;
    }
    setProfileData({
      displayName: user.displayName || '',
      bio: user.bio || '',
      country: user.country || '',
    });
  }, [user, authLoading]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      setProfileError('');
      setProfileSuccess('');
      const payload = {
        displayName: profileData.displayName.trim(),
        bio: profileData.bio.trim(),
        country: profileData.country.toUpperCase().trim(),
      };
      await api.patch('/auth/me', payload);
      await refreshUser();
      setProfileSuccess('Profile updated successfully!');
    } catch (err) {
      setProfileError(err.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword.length < 8) {
      setPassError('New password must be at least 8 characters long');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPassError('New passwords do not match');
      return;
    }

    try {
      setChangingPass(true);
      setPassError('');
      setPassSuccess('');
      await api.post('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      setPassSuccess('Password changed successfully! All other sessions were invalidated.');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPassError(err.message || 'Failed to change password');
    } finally {
      setChangingPass(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-500">
        <div className="inline-block w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p>Đang tải thông tin hồ sơ...</p>
      </div>
    );
  }

  const roleNameMap = {
    admin: 'Quản trị viên',
    seller: 'Người bán',
    booster: 'Cày thuê rank',
    customer: 'Người mua',
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-gray-800/80 pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <UserIcon className="w-7 h-7 text-purple-400" />
            Cài Đặt Tài Khoản & Bảo Mật
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Quản lý danh tính công khai, mật khẩu bảo mật và thông tin cá nhân.
          </p>
        </div>

        <div className="flex gap-2">
          {user.roles?.map((r) => (
            <span
              key={r}
              className={`text-xs uppercase font-mono px-2.5 py-1 rounded font-bold ${
                r === 'admin'
                  ? 'bg-red-950 text-red-300 border border-red-800/60'
                  : r === 'seller' || r === 'booster'
                  ? 'bg-purple-950 text-purple-300 border border-purple-800/60'
                  : 'bg-gray-800 text-gray-300'
              }`}
            >
              {roleNameMap[r] || r}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: Profile Information */}
        <div className="p-6 rounded-2xl bg-[#111722]/80 border border-gray-800/80 space-y-5">
          <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-gray-800/60 pb-3">
            <UserIcon className="w-5 h-5 text-purple-400" />
            Thông Tin Cá Nhân Công Khai
          </h2>

          {profileSuccess && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs">
              {profileSuccess}
            </div>
          )}

          {profileError && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs">
              {profileError}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase text-gray-400 mb-1">
                Địa Chỉ Email Đăng Nhập
              </label>
              <input
                type="email"
                disabled
                value={user.email || ''}
                className="w-full bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-2.5 text-gray-400 text-sm font-mono cursor-not-allowed"
              />
              <span className="text-[11px] text-gray-500">Email không thể thay đổi trực tiếp</span>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-gray-400 mb-1">
                Tên Hiển Thị (Biệt Danh) *
              </label>
              <input
                type="text"
                required
                minLength={3}
                maxLength={40}
                value={profileData.displayName}
                onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-gray-400 mb-1">
                Mã Quốc Gia (ISO 2 ký tự, ví dụ: VN, US, JP)
              </label>
              <input
                type="text"
                maxLength={2}
                placeholder="VN"
                value={profileData.country}
                onChange={(e) => setProfileData({ ...profileData, country: e.target.value.toUpperCase() })}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm uppercase font-mono focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-gray-400 mb-1">
                Tiểu Sử / Giới Thiệu Bản Thân
              </label>
              <textarea
                rows={3}
                maxLength={500}
                placeholder="Vài dòng giới thiệu về bạn, thời gian trực tuyến hoặc tựa game sở trường..."
                value={profileData.bio}
                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-purple-500 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition shadow-lg shadow-purple-900/30"
            >
              {savingProfile ? 'Đang lưu...' : 'Lưu Thay Đổi Hồ Sơ'}
            </button>
          </form>
        </div>

        {/* Right: Security & Password */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#111722]/80 border border-gray-800/80 space-y-5">
            <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-gray-800/60 pb-3">
              <ShieldIcon className="w-5 h-5 text-purple-400" />
              Đổi Mật Khẩu
            </h2>

            {passSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs">
                {passSuccess}
              </div>
            )}

            {passError && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs">
                {passError}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-gray-400 mb-1">
                  Mật Khẩu Hiện Tại *
                </label>
                <input
                  type="password"
                  required
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-gray-400 mb-1">
                  Mật Khẩu Mới * (tối thiểu 8 ký tự)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-gray-400 mb-1">
                  Xác Nhận Mật Khẩu Mới *
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <button
                type="submit"
                disabled={changingPass}
                className="px-6 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold transition border border-gray-700"
              >
                {changingPass ? 'Đang cập nhật...' : 'Cập Nhật Mật Khẩu'}
              </button>
            </form>
          </div>

          {/* Account Meta */}
          <div className="p-6 rounded-2xl bg-[#111722]/80 border border-gray-800/80 space-y-2 text-xs text-gray-400 font-mono">
            <div>Mã Người Dùng: <span className="text-gray-200">{user.id}</span></div>
            <div>Ngày Gia Nhập: <span className="text-gray-200">{formatDateTime(user.createdAt)}</span></div>
            <div className="pt-2">
              <Link
                href={`/users/${user.id}`}
                className="text-purple-400 hover:text-purple-300 font-sans font-medium"
              >
                Xem trang hồ sơ uy tín công khai của bạn →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
