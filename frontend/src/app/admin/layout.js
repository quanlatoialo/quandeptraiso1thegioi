'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  ShieldIcon,
  UserIcon,
  TagIcon,
  ClockIcon,
  WalletIcon,
  GamepadIcon,
  AlertTriangleIcon,
} from '@/components/Icons';

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!user.roles?.includes('admin')) {
      router.push('/dashboard');
    }
  }, [user, loading, pathname]);

  if (loading || !user || !user.roles?.includes('admin')) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-gray-500">
        <div className="inline-block w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p>Đang xác thực quyền quản trị viên...</p>
      </div>
    );
  }

  const navItems = [
    { href: '/admin', label: 'Tổng Quan', exact: true },
    { href: '/admin/disputes', label: 'Khiếu Nại' },
    { href: '/admin/applications', label: 'Hồ Sơ Ứng Tuyển' },
    { href: '/admin/users', label: 'Người Dùng' },
    { href: '/admin/games', label: 'Game & Danh Mục' },
    { href: '/admin/offers', label: 'Kiểm Duyệt Bài Đăng' },
    { href: '/admin/orders', label: 'Đơn Hàng' },
    { href: '/admin/ledger', label: 'Sổ Cái & Kiểm Toán' },
  ];

  return (
    <div className="min-h-screen bg-[#07090e]">
      {/* Admin Subheader Bar */}
      <div className="border-b border-red-900/30 bg-red-950/20 backdrop-blur-md sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-mono uppercase tracking-wider font-extrabold text-red-400">
              Phân Hệ Quản Trị Hệ Thống Sàn
            </span>
          </div>

          <nav className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 text-xs font-medium">
            {navItems.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                    active
                      ? 'bg-red-950/80 text-red-200 border border-red-800/60 shadow-sm'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="py-6">{children}</div>
    </div>
  );
}
