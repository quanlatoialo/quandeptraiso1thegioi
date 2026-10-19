'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import { GamepadIcon, SearchIcon, ArrowRightIcon } from '@/components/Icons';

export default function GamesPage() {
  const [games, setGames] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadGames() {
      try {
        const res = await apiRequest('/api/games');
        setGames(res.items || []);
      } catch (err) {
        console.error('Failed to load games:', err);
      } finally {
        setLoading(false);
      }
    }
    loadGames();
  }, []);

  const filtered = games.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Danh Mục Trò Chơi</h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Duyệt các tựa game hỗ trợ để tìm kiếm tài khoản, vật phẩm và dịch vụ cày thuê rank
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm trò chơi..."
            className="w-full bg-[#141b27] border border-gray-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-[#111722] border border-gray-800 rounded-xl h-44 animate-pulse" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filtered.map((game) => (
            <Link
              key={game.id}
              href={`/offers?game=${encodeURIComponent(game.slug)}`}
              className="group bg-[#111722] hover:bg-[#161f2e] border border-gray-800 hover:border-purple-500/50 rounded-xl p-5 transition-all flex flex-col justify-between shadow-md"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-purple-900/30 border border-purple-500/20 flex items-center justify-center text-purple-300 mb-4 group-hover:scale-105 transition-transform">
                  <GamepadIcon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base text-white group-hover:text-purple-300 transition-colors mb-1.5">
                  {game.name}
                </h3>
                <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                  {game.description || 'Có sẵn nhiều bài đăng uy tín được bảo chứng bằng két ký quỹ an toàn.'}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-gray-800/80 flex items-center justify-between text-xs">
                <span className="text-gray-400 font-mono text-[11px]">
                  {game.activeOffers} bài đăng
                </span>
                <span className="text-purple-400 flex items-center gap-1 font-semibold text-[11px] group-hover:translate-x-0.5 transition-transform">
                  Xem ngay <ArrowRightIcon className="w-3 h-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-[#111722] border border-gray-800 rounded-xl p-12 text-center text-gray-400">
          <p className="text-sm">Không tìm thấy trò chơi nào phù hợp với từ khóa "{search}".</p>
        </div>
      )}
    </div>
  );
}
