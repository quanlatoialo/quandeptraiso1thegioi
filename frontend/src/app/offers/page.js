'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import OfferCard from '@/components/OfferCard';
import { SearchIcon, XIcon } from '@/components/Icons';

function OffersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [offers, setOffers] = useState([]);
  const [games, setGames] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters from URL
  const q = searchParams.get('q') || '';
  const game = searchParams.get('game') || '';
  const type = searchParams.get('type') || '';
  const region = searchParams.get('region') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const sort = searchParams.get('sort') || 'newest';
  const page = parseInt(searchParams.get('page') || '1', 10);

  // Local form state for filter inputs
  const [localQ, setLocalQ] = useState(q);
  const [localMin, setLocalMin] = useState(minPrice ? Number(minPrice) / 100 : '');
  const [localMax, setLocalMax] = useState(maxPrice ? Number(maxPrice) / 100 : '');

  // Load games for filter dropdown
  useEffect(() => {
    async function loadGames() {
      try {
        const res = await apiRequest('/api/games');
        setGames(res.items || []);
      } catch (err) {
        console.error('Failed to load games:', err);
      }
    }
    loadGames();
  }, []);

  const updateParam = useCallback(
    (key, val) => {
      const params = new URLSearchParams(searchParams.toString());
      if (val) {
        params.set(key, val);
      } else {
        params.delete(key);
      }
      if (key !== 'page') params.set('page', '1');
      router.push(`/offers?${params.toString()}`);
    },
    [router, searchParams]
  );

  const clearAllFilters = () => {
    setLocalQ('');
    setLocalMin('');
    setLocalMax('');
    router.push('/offers');
  };

  useEffect(() => {
    async function fetchOffers() {
      setLoading(true);
      try {
        const params = new URLSearchParams(searchParams.toString());
        if (!params.get('limit')) params.set('limit', '12');
        const res = await apiRequest(`/api/offers?${params.toString()}`);
        setOffers(res.items || []);
        setTotal(res.total || 0);
        setTotalPages(res.totalPages || 1);
      } catch (err) {
        console.error('Failed to fetch offers:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchOffers();
  }, [searchParams]);

  const handlePriceApply = (e) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (localMin !== '') params.set('minPrice', String(Math.round(Number(localMin) * 100)));
    else params.delete('minPrice');
    if (localMax !== '') params.set('maxPrice', String(Math.round(Number(localMax) * 100)));
    else params.delete('maxPrice');
    params.set('page', '1');
    router.push(`/offers?${params.toString()}`);
  };

  const selectedGameObj = games.find((g) => g.slug === game);
  const availableRegions = selectedGameObj ? selectedGameObj.regions : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Thị Trường Mua Bán Game</h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Khám phá {total} bài đăng tài khoản, vật phẩm, dịch vụ cày thuê có bảo chứng ký quỹ an toàn
          </p>
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-3">
          <label htmlFor="sort-select" className="text-xs text-gray-400 font-medium">Sắp xếp:</label>
          <select
            id="sort-select"
            value={sort}
            onChange={(e) => updateParam('sort', e.target.value)}
            className="bg-[#141b27] border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
          >
            <option value="newest">Mới nhất</option>
            <option value="price_asc">Giá: Thấp đến Cao</option>
            <option value="price_desc">Giá: Cao đến Thấp</option>
          </select>
        </div>
      </div>

      {/* Main Grid: Sidebar Filters + Offer Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Sidebar Filters */}
        <div className="space-y-6">
          <div className="bg-[#111722] border border-gray-800/90 rounded-xl p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <span className="font-semibold text-xs uppercase tracking-wider text-white">Bộ Lọc Tìm Kiếm</span>
              {(q || game || type || region || minPrice || maxPrice) && (
                <button
                  onClick={clearAllFilters}
                  className="text-[11px] text-purple-400 hover:text-purple-300 font-medium"
                >
                  Xóa tất cả
                </button>
              )}
            </div>

            {/* Keyword Search */}
            <div>
              <label htmlFor="keyword-search" className="block text-xs font-medium text-gray-300 mb-1.5">Từ khóa tìm kiếm</label>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  updateParam('q', localQ);
                }}
                className="relative"
              >
                <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                <input
                  id="keyword-search"
                  type="text"
                  value={localQ}
                  onChange={(e) => setLocalQ(e.target.value)}
                  placeholder="Tiêu đề hoặc người bán..."
                  className="w-full bg-[#161f2e] border border-gray-700/80 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </form>
            </div>

            {/* Offer Type */}
            <div>
              <span className="block text-xs font-medium text-gray-300 mb-1.5">Danh mục giao dịch</span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: '', label: 'Tất cả' },
                  { id: 'account', label: 'Tài khoản' },
                  { id: 'item', label: 'Vật phẩm' },
                  { id: 'boosting', label: 'Cày thuê' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => updateParam('type', t.id)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      type === t.id
                        ? 'bg-purple-600 text-white font-semibold'
                        : 'bg-[#161f2e] text-gray-400 hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Game Selector */}
            <div>
              <label htmlFor="game-filter" className="block text-xs font-medium text-gray-300 mb-1.5">Trò chơi</label>
              <select
                id="game-filter"
                value={game}
                onChange={(e) => {
                  updateParam('game', e.target.value);
                  updateParam('region', '');
                }}
                className="w-full bg-[#161f2e] border border-gray-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
              >
                <option value="">Tất cả trò chơi</option>
                {games.map((g) => (
                  <option key={g.id} value={g.slug}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Region / Server (conditional on selected game) */}
            {availableRegions.length > 0 && (
              <div>
                <label htmlFor="region-filter" className="block text-xs font-medium text-gray-300 mb-1.5">Máy chủ / Khu vực</label>
                <select
                  id="region-filter"
                  value={region}
                  onChange={(e) => updateParam('region', e.target.value)}
                  className="w-full bg-[#161f2e] border border-gray-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">Tất cả máy chủ</option>
                  {availableRegions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Price Range */}
            <div>
              <span className="block text-xs font-medium text-gray-300 mb-1.5">Khoảng giá (EUR)</span>
              <form onSubmit={handlePriceApply} className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="Tối thiểu €"
                    value={localMin}
                    onChange={(e) => setLocalMin(e.target.value)}
                    className="w-full bg-[#161f2e] border border-gray-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="Tối đa €"
                    value={localMax}
                    onChange={(e) => setLocalMax(e.target.value)}
                    className="w-full bg-[#161f2e] border border-gray-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium transition-colors"
                >
                  Áp Dụng Khoảng Giá
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Right Content / Offer Grid */}
        <div className="lg:col-span-3 space-y-6">
          {/* Active Filter Badges */}
          {(q || game || type || region || minPrice || maxPrice) && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-gray-400">Bộ lọc đang bật:</span>
              {q && (
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-purple-950/70 border border-purple-500/40 text-purple-300">
                  Từ khóa: "{q}"
                  <button onClick={() => updateParam('q', '')}><XIcon className="w-3 h-3" /></button>
                </span>
              )}
              {game && (
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-blue-950/70 border border-blue-500/40 text-blue-300">
                  Game: {selectedGameObj?.name || game}
                  <button onClick={() => updateParam('game', '')}><XIcon className="w-3 h-3" /></button>
                </span>
              )}
              {type && (
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 capitalize">
                  Loại: {type === 'account' ? 'Tài khoản' : type === 'item' ? 'Vật phẩm' : 'Cày thuê'}
                  <button onClick={() => updateParam('type', '')}><XIcon className="w-3 h-3" /></button>
                </span>
              )}
              {region && (
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-gray-800 border border-gray-700 text-gray-300">
                  Máy chủ: {region}
                  <button onClick={() => updateParam('region', '')}><XIcon className="w-3 h-3" /></button>
                </span>
              )}
            </div>
          )}

          {/* Offer Cards */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="bg-[#111722] border border-gray-800 rounded-xl h-72 animate-pulse" />
              ))}
            </div>
          ) : offers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {offers.map((offer) => (
                <OfferCard key={offer.id} offer={offer} />
              ))}
            </div>
          ) : (
            <div className="bg-[#111722] border border-gray-800 rounded-xl p-16 text-center text-gray-400 space-y-3">
              <p className="text-base font-semibold text-gray-300">Không tìm thấy sản phẩm nào phù hợp với bộ lọc hiện tại.</p>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Hãy thử mở rộng khoảng giá, bỏ bớt bộ lọc máy chủ hoặc tìm kiếm một trò chơi khác.
              </p>
              <button
                onClick={clearAllFilters}
                className="mt-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
              >
                Xóa tất cả bộ lọc
              </button>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pt-6 border-t border-gray-800 flex items-center justify-between text-xs text-gray-400">
              <span>
                Trang <strong className="text-white">{page}</strong> trên <strong className="text-white">{totalPages}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => updateParam('page', String(page - 1))}
                  className="px-3 py-1.5 rounded-lg bg-[#141b27] border border-gray-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-800 text-white"
                >
                  Trang Trước
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => updateParam('page', String(page + 1))}
                  className="px-3 py-1.5 rounded-lg bg-[#141b27] border border-gray-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-800 text-white"
                >
                  Trang Kế
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OffersPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto p-12 text-center text-gray-400">Đang tải thị trường...</div>}>
      <OffersContent />
    </Suspense>
  );
}
