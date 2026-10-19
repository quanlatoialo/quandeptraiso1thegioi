'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await register(email, password, displayName);
      router.push('/dashboard');
    } catch (err) {
      setError(err.message || 'Đăng ký không thành công. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Tạo Tài Khoản</h1>
        <p className="text-xs sm:text-sm text-gray-400">
          Gia nhập nền tảng Gamer 2 Gamer với ví ký quỹ bảo mật tự động
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
            <label className="block text-xs font-medium text-gray-300 mb-1.5">Tên hiển thị (Biệt danh)</label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={40}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ví dụ: ProGamer99"
              className="w-full bg-[#161f2e] border border-gray-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>

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
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Mật khẩu (tối thiểu 8 ký tự)
            </label>
            <input
              type="password"
              required
              minLength={8}
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
            {loading ? 'Đang tạo tài khoản...' : 'Đăng Ký Tài Khoản'}
          </button>
        </form>

        <div className="text-center text-xs text-gray-400">
          Đã có tài khoản?{' '}
          <Link href="/login" className="text-purple-400 hover:text-purple-300 font-semibold">
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    </div>
  );
}
