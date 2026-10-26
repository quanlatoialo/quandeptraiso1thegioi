'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { formatEUR } from '@/lib/utils';
import {
  GamepadIcon,
  WalletIcon,
  BellIcon,
  SearchIcon,
  UserIcon,
  ShieldIcon,
  ChevronDownIcon,
  SunIcon,
  MoonIcon,
} from './Icons';

export default function Header() {
  const router = useRouter();
  const { user, wallet, unreadCount, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/offers?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const isMerchant = user && (user.roles?.includes('seller') || user.roles?.includes('booster'));
  const isAdmin = user && user.roles?.includes('admin');

  return (
    <header className="sticky top-0 z-40 bg-[#06090e]/85 backdrop-blur-2xl border-b border-white/[0.08] text-gray-200 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 opacity-70 blur-sm group-hover:opacity-100 transition duration-300"></div>
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[#1c1335] to-[#0e1628] border border-white/20 flex items-center justify-center text-white shadow-xl group-hover:scale-105 transition-transform">
                <GamepadIcon className="w-5 h-5 text-purple-400 group-hover:text-cyan-300 transition-colors" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold tracking-tight text-xl text-white font-heading flex items-center gap-1 group-hover:opacity-95">
                GAMER<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">2</span>GAMER
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 ml-1">
                  PRO
                </span>
              </span>
              <span className="text-[9px] text-gray-400 -mt-0.5 font-mono tracking-widest uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                Sàn Ký Quỹ Game P2P
              </span>
            </div>
          </Link>

          {/* Nav Categories */}
          <nav className="hidden lg:flex items-center gap-1.5 text-sm font-medium">
            <Link
              href="/games"
              className="px-3.5 py-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              Trò Chơi
            </Link>
            <Link
              href="/offers?type=account"
              className="px-3.5 py-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              Tài Khoản
            </Link>
            <Link
              href="/offers?type=item"
              className="px-3.5 py-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              Vật Phẩm & Vàng
            </Link>
            <Link
              href="/offers?type=boosting"
              className="px-3.5 py-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              Cày Thuê Rank
            </Link>
            <Link
              href="/how-it-works"
              className="px-3 py-1.5 rounded-full text-purple-300/90 hover:text-purple-200 bg-purple-950/40 hover:bg-purple-900/40 border border-purple-500/30 transition-all text-xs font-semibold ml-1"
            >
              Quy Trình Ký Quỹ
            </Link>
          </nav>
        </div>

        {/* Global Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md hidden md:block">
          <div className="relative group">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-purple-400 transition-colors" />
            <input
              type="text"
              placeholder="Tìm game, tài khoản VIP, trang phục, vàng, cày rank..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0d131f]/90 border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500/80 focus:ring-2 focus:ring-purple-500/20 transition-all shadow-inner"
            />
          </div>
        </form>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle (Sáng / Tối) */}
          <button
            onClick={toggleTheme}
            type="button"
            aria-label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
            title={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
            className="theme-toggle-btn relative flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-gray-300 hover:text-white transition-all cursor-pointer group"
          >
            {theme === 'dark' ? (
              <>
                <SunIcon className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform duration-300" />
                <span className="hidden xl:inline text-xs font-semibold text-amber-300">Sáng</span>
              </>
            ) : (
              <>
                <MoonIcon className="w-4 h-4 text-indigo-600 group-hover:-rotate-12 transition-transform duration-300" />
                <span className="hidden xl:inline text-xs font-semibold text-indigo-700">Tối</span>
              </>
            )}
          </button>

          {/* Become a Seller / Booster */}
          {(!user || (!user.roles?.includes('seller') && !user.roles?.includes('booster'))) && (
            <Link
              href="/become-seller"
              className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold px-3.5 py-2 rounded-full border border-amber-500/40 bg-amber-950/20 text-amber-300 hover:bg-amber-900/30 hover:border-amber-400 transition-all shadow-sm shadow-amber-950/30"
            >
              <span>⭐</span>
              <span>Đăng Ký Bán Hàng</span>
            </Link>
          )}

          {user ? (
            <>
              {/* Wallet indicator */}
              <Link
                href="/wallet"
                className="flex items-center gap-2.5 bg-gradient-to-r from-[#0f172a]/80 to-[#131f37]/80 hover:from-[#131f37] hover:to-[#1e293b] border border-emerald-500/30 hover:border-emerald-400/60 px-3.5 py-1.5 rounded-full text-sm transition-all shadow-lg shadow-emerald-950/20 group"
                title="Ví Ký Quỹ Của Bạn"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <WalletIcon className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                </div>
                <div className="flex flex-col text-left leading-none">
                  <span className="text-[9px] text-gray-400 uppercase font-mono tracking-wider">Khả Dụng</span>
                  <span className="font-bold text-emerald-300 text-xs font-mono">
                    {formatEUR(wallet?.available || 0)}
                  </span>
                </div>
              </Link>

              {/* Notification icon */}
              <Link
                href="/dashboard#notifications"
                className="relative p-2.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-gray-300 hover:text-white transition-all"
                title="Thông báo"
              >
                <BellIcon className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse shadow-md shadow-purple-900/50">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>

              {/* User Menu Dropdown */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 p-1.5 pr-2.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-sm transition-all"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-600 via-indigo-500 to-cyan-400 p-[1.5px] shadow-md">
                    <div className="w-full h-full rounded-full bg-[#0d131f] flex items-center justify-center text-xs font-bold text-purple-300">
                      {user.displayName?.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <span className="hidden xl:inline text-xs font-medium text-gray-200 max-w-[100px] truncate">
                    {user.displayName}
                  </span>
                  <ChevronDownIcon className="w-3.5 h-3.5 text-gray-400" />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-3 w-64 bg-[#0a0f1d]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl py-2 z-50 text-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/[0.06] bg-gradient-to-b from-white/[0.02] to-transparent">
                      <p className="font-bold text-white truncate text-sm">{user.displayName}</p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{user.email}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {user.roles?.map((r) => (
                          <span
                            key={r}
                            className={`text-[9px] uppercase px-2 py-0.5 rounded-md font-mono font-bold tracking-wider ${
                              r === 'admin'
                                ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                                : r === 'seller' || r === 'booster'
                                ? 'bg-purple-500/10 text-purple-300 border border-purple-500/30'
                                : 'bg-gray-800 text-gray-300'
                            }`}
                          >
                            {r === 'admin' ? 'Quản trị' : r === 'seller' ? 'Người bán VIP' : r === 'booster' ? 'Booster Pro' : 'Thành viên'}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="py-1">
                      <Link
                        href="/dashboard"
                        onClick={() => setMenuOpen(false)}
                        className="block px-4 py-2 text-gray-300 hover:bg-gray-800/70 hover:text-white"
                      >
                        Bảng Điều Khiển
                      </Link>
                      <Link
                        href="/orders"
                        onClick={() => setMenuOpen(false)}
                        className="block px-4 py-2 text-gray-300 hover:bg-gray-800/70 hover:text-white"
                      >
                        Đơn Mua Của Tôi
                      </Link>
                      <Link
                        href="/wallet"
                        onClick={() => setMenuOpen(false)}
                        className="block px-4 py-2 text-gray-300 hover:bg-gray-800/70 hover:text-white"
                      >
                        Ví Tiền & Nạp Thử Nghiệm
                      </Link>
                      <Link
                        href="/profile"
                        onClick={() => setMenuOpen(false)}
                        className="block px-4 py-2 text-gray-300 hover:bg-gray-800/70 hover:text-white"
                      >
                        Hồ Sơ & Bảo Mật
                      </Link>
                    </div>

                    {isMerchant && (
                      <div className="py-1 border-t border-gray-800">
                        <div className="px-4 py-1 text-[10px] uppercase font-mono tracking-wider text-purple-400 font-semibold">
                          Cổng Dành Cho Người Bán
                        </div>
                        <Link
                          href="/seller"
                          onClick={() => setMenuOpen(false)}
                          className="block px-4 py-1.5 text-gray-300 hover:bg-gray-800/70 hover:text-white"
                        >
                          Tổng Quan Bán Hàng
                        </Link>
                        <Link
                          href="/seller/offers"
                          onClick={() => setMenuOpen(false)}
                          className="block px-4 py-1.5 text-gray-300 hover:bg-gray-800/70 hover:text-white"
                        >
                          Quản Lý Tin Rao
                        </Link>
                        <Link
                          href="/seller/orders"
                          onClick={() => setMenuOpen(false)}
                          className="block px-4 py-1.5 text-gray-300 hover:bg-gray-800/70 hover:text-white"
                        >
                          Đơn Bán Cần Giao
                        </Link>
                        <Link
                          href="/seller/earnings"
                          onClick={() => setMenuOpen(false)}
                          className="block px-4 py-1.5 text-gray-300 hover:bg-gray-800/70 hover:text-white"
                        >
                          Thu Nhập & Ký Quỹ
                        </Link>
                      </div>
                    )}

                    {isAdmin && (
                      <div className="py-1 border-t border-gray-800">
                        <div className="px-4 py-1 text-[10px] uppercase font-mono tracking-wider text-red-400 font-semibold flex items-center gap-1">
                          <ShieldIcon className="w-3 h-3" /> Phân Hệ Quản Trị
                        </div>
                        <Link
                          href="/admin"
                          onClick={() => setMenuOpen(false)}
                          className="block px-4 py-1.5 text-gray-300 hover:bg-gray-800/70 hover:text-white"
                        >
                          Tổng Quan Hệ Thống
                        </Link>
                        <Link
                          href="/admin/disputes"
                          onClick={() => setMenuOpen(false)}
                          className="block px-4 py-1.5 text-gray-300 hover:bg-gray-800/70 hover:text-white"
                        >
                          Phân Xử Khiếu Nại
                        </Link>
                        <Link
                          href="/admin/ledger"
                          onClick={() => setMenuOpen(false)}
                          className="block px-4 py-1.5 text-gray-300 hover:bg-gray-800/70 hover:text-white"
                        >
                          Sổ Cái & Đối Soát
                        </Link>
                      </div>
                    )}

                    <div className="pt-1 border-t border-gray-800">
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          logout();
                          router.push('/');
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-950/30 transition-colors"
                      >
                        Đăng Xuất
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
              >
                Đăng Nhập
              </Link>
              <Link
                href="/register"
                className="text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500 shadow-md shadow-purple-900/40 transition-all"
              >
                Đăng Ký
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
