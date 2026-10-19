'use client';
import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LockIcon, UserIcon, ShieldIcon } from '@/components/Icons';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
      router.push(redirect);
    } catch (err) {
      setError(err.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('Password@123');
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Đăng Nhập</h1>
        <p className="text-xs sm:text-sm text-gray-400">
          Truy cập ví ký quỹ và quản lý đơn hàng Gamer 2 Gamer
        </p>
      </div>

      <div className="bg-[#111722] border border-gray-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
        {error && (
          <div className="p-3 rounded-lg bg-red-950/70 border border-red-500/40 text-xs text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">Địa chỉ Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tenban@example.com"
              className="w-full bg-[#161f2e] border border-gray-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">Mật khẩu</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#161f2e] border border-gray-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-purple-950/50 transition-all mt-2"
          >
            {loading ? 'Đang xác thực...' : 'Đăng Nhập'}
          </button>
        </form>

        <div className="text-center text-xs text-gray-400">
          Chưa có tài khoản?{' '}
          <Link href="/register" className="text-purple-400 hover:text-purple-300 font-semibold">
            Đăng ký tài khoản mới
          </Link>
        </div>

        {/* Quick Demo Login Preset Buttons */}
        <div className="pt-4 border-t border-gray-800 space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block font-semibold text-center">
            Tài Khoản Mẫu Thử Nghiệm (Điền Nhanh)
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => fillDemo('customer@gamer2gamer.com')}
              className="p-2 rounded-lg bg-gray-900 hover:bg-gray-800 border border-gray-800 text-left transition-colors"
            >
              <span className="font-semibold text-white block">Người Mua</span>
              <span className="text-[10px] text-gray-400">Tài khoản khách</span>
            </button>
            <button
              type="button"
              onClick={() => fillDemo('seller@gamer2gamer.com')}
              className="p-2 rounded-lg bg-gray-900 hover:bg-gray-800 border border-gray-800 text-left transition-colors"
            >
              <span className="font-semibold text-white block">Người Bán</span>
              <span className="text-[10px] text-gray-400">Gian hàng Acc & Item</span>
            </button>
            <button
              type="button"
              onClick={() => fillDemo('booster@gamer2gamer.com')}
              className="p-2 rounded-lg bg-gray-900 hover:bg-gray-800 border border-gray-800 text-left transition-colors"
            >
              <span className="font-semibold text-white block">Cày Thuê</span>
              <span className="text-[10px] text-gray-400">Thợ cày rank kéo ELO</span>
            </button>
            <button
              type="button"
              onClick={() => fillDemo('admin@gamer2gamer.com')}
              className="p-2 rounded-lg bg-red-950/30 hover:bg-red-950/50 border border-red-900/50 text-left transition-colors"
            >
              <span className="font-semibold text-red-300 block">Quản Trị</span>
              <span className="text-[10px] text-gray-400">Xử lý khiếu nại & hệ thống</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-16 text-center text-gray-400">Đang tải trang đăng nhập...</div>}>
      <LoginForm />
    </Suspense>
  );
}
