'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  GamepadIcon,
  PlusIcon,
  TagIcon,
  RefreshIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
} from '@/components/Icons';

export default function AdminGamesPage() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Game Modal
  const [gameModal, setGameModal] = useState({
    open: false,
    isEdit: false,
    id: null,
    name: '',
    slug: '',
    description: '',
    imageUrl: '',
    regions: 'Global, EU, NA, Asia',
    featured: false,
    active: true,
  });

  // Category Modal
  const [categoryModal, setCategoryModal] = useState({
    open: false,
    isEdit: false,
    id: null,
    gameId: null,
    name: '',
    slug: '',
    type: 'account',
    unitLabel: 'account',
    active: true,
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/admin/games');
      setGames(res.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load games catalog');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGame = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const regionsArr = gameModal.regions.split(',').map((s) => s.trim()).filter(Boolean);
      const payload = {
        name: gameModal.name.trim(),
        slug: gameModal.slug.toLowerCase().trim(),
        description: gameModal.description.trim(),
        imageUrl: gameModal.imageUrl.trim() || '/images/games/default.jpg',
        regions: regionsArr.length > 0 ? regionsArr : ['Global'],
        featured: gameModal.featured,
        active: gameModal.active,
      };

      if (gameModal.isEdit) {
        await api.put(`/admin/games/${gameModal.id}`, payload);
      } else {
        await api.post('/admin/games', payload);
      }

      setGameModal({ ...gameModal, open: false });
      await loadGames();
    } catch (err) {
      alert(err.message || 'Failed to save game');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        game: categoryModal.gameId,
        name: categoryModal.name.trim(),
        slug: categoryModal.slug.toLowerCase().trim(),
        type: categoryModal.type,
        unitLabel: categoryModal.unitLabel.trim() || 'unit',
        active: categoryModal.active,
      };

      if (categoryModal.isEdit) {
        await api.put(`/admin/categories/${categoryModal.id}`, payload);
      } else {
        await api.post('/admin/categories', payload);
      }

      setCategoryModal({ ...categoryModal, open: false });
      await loadGames();
    } catch (err) {
      alert(err.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-800/80 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <GamepadIcon className="w-7 h-7 text-red-400" />
            Kiến Trúc Danh Mục Trò Chơi & Phân Loại
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Cấu hình tựa game, phân vùng máy chủ và các danh mục vật phẩm hỗ trợ giao dịch.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadGames}
            className="p-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition border border-gray-700"
            title="Làm mới"
          >
            <RefreshIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() =>
              setGameModal({
                open: true,
                isEdit: false,
                id: null,
                name: '',
                slug: '',
                description: '',
                imageUrl: '',
                regions: 'Global, EU, NA, Asia',
                featured: false,
                active: true,
              })
            }
            className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium text-xs transition shadow-lg shadow-red-900/30 flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4" />
            Thêm Tựa Game Mới
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-500">
          <div className="inline-block w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p>Đang tải danh mục trò chơi...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {games.map((g) => (
            <div
              key={g.id}
              className="p-6 rounded-2xl bg-[#111722]/80 border border-gray-800/80 space-y-4"
            >
              {/* Game Top Info */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-800/60 pb-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gray-900 overflow-hidden border border-gray-800 flex-shrink-0">
                    <img
                      src={g.imageUrl || '/images/games/default.jpg'}
                      alt={g.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold text-white">{g.name}</h3>
                      <span className="text-xs font-mono text-gray-400">/{g.slug}</span>
                      {g.featured && (
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-bold">
                          Nổi bật
                        </span>
                      )}
                      {!g.active && (
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-gray-800 text-gray-400">
                          Vô hiệu hóa
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1 max-w-2xl line-clamp-1">
                      {g.description || 'Chưa có mô tả'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setCategoryModal({
                        open: true,
                        isEdit: false,
                        id: null,
                        gameId: g.id,
                        name: '',
                        slug: '',
                        type: 'account',
                        unitLabel: 'tài khoản',
                        active: true,
                      })
                    }
                    className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium border border-gray-700"
                  >
                    + Thêm Danh Mục
                  </button>
                  <button
                    onClick={() =>
                      setGameModal({
                        open: true,
                        isEdit: true,
                        id: g.id,
                        name: g.name,
                        slug: g.slug,
                        description: g.description || '',
                        imageUrl: g.imageUrl || '',
                        regions: (g.regions || []).join(', '),
                        featured: !!g.featured,
                        active: g.active !== false,
                      })
                    }
                    className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium"
                  >
                    Sửa
                  </button>
                </div>
              </div>

              {/* Categories Under This Game */}
              <div className="space-y-2">
                <div className="text-xs font-mono uppercase text-gray-400">
                  Các Danh Mục Giao Dịch ({g.categories?.length || 0}):
                </div>
                {(!g.categories || g.categories.length === 0) ? (
                  <div className="text-xs text-gray-500 italic py-2">
                    Chưa có danh mục nào được liên kết với trò chơi này.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {g.categories.map((c) => (
                      <div
                        key={c.id}
                        className="p-3 rounded-xl bg-gray-900/60 border border-gray-800 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-semibold text-white">{c.name}</div>
                          <div className="text-[11px] text-gray-400 font-mono">
                            Loại: <span className="uppercase text-purple-300">{c.type === 'account' ? 'Tài khoản' : c.type === 'item' ? 'Vật phẩm' : 'Cày thuê'}</span> • Đơn vị: {c.unitLabel}
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            setCategoryModal({
                              open: true,
                              isEdit: true,
                              id: c.id,
                              gameId: g.id,
                              name: c.name,
                              slug: c.slug,
                              type: c.type,
                              unitLabel: c.unitLabel,
                              active: c.active !== false,
                            })
                          }
                          className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-[11px]"
                        >
                          Sửa
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Game Modal */}
      {gameModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#111722] border border-gray-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">
              {gameModal.isEdit ? 'Chỉnh Sửa Tựa Game' : 'Thêm Tựa Game Mới'}
            </h3>
            <form onSubmit={handleSaveGame} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-gray-400 mb-1">Tên trò chơi *</label>
                <input
                  type="text"
                  required
                  value={gameModal.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const slug = gameModal.isEdit ? gameModal.slug : name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                    setGameModal({ ...gameModal, name, slug });
                  }}
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-gray-400 mb-1">Đường dẫn tĩnh (Slug) *</label>
                <input
                  type="text"
                  required
                  value={gameModal.slug}
                  onChange={(e) => setGameModal({ ...gameModal, slug: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-white text-sm font-mono focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-gray-400 mb-1">Khu vực / Server (ngăn cách bởi dấu phẩy)</label>
                <input
                  type="text"
                  value={gameModal.regions}
                  onChange={(e) => setGameModal({ ...gameModal, regions: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-gray-400 mb-1">Đường dẫn ảnh (URL)</label>
                <input
                  type="text"
                  value={gameModal.imageUrl}
                  onChange={(e) => setGameModal({ ...gameModal, imageUrl: e.target.value })}
                  placeholder="/images/games/valorant.jpg"
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-white text-sm font-mono focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-gray-400 mb-1">Mô tả tóm tắt</label>
                <textarea
                  rows={2}
                  value={gameModal.description}
                  onChange={(e) => setGameModal({ ...gameModal, description: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gameModal.featured}
                    onChange={(e) => setGameModal({ ...gameModal, featured: e.target.checked })}
                    className="w-4 h-4 rounded text-red-600 focus:ring-red-500 bg-gray-800 border-gray-700"
                  />
                  Game nổi bật
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gameModal.active}
                    onChange={(e) => setGameModal({ ...gameModal, active: e.target.checked })}
                    className="w-4 h-4 rounded text-red-600 focus:ring-red-500 bg-gray-800 border-gray-700"
                  />
                  Kích hoạt
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setGameModal({ ...gameModal, open: false })}
                  className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 text-xs font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
                >
                  {saving ? 'Đang lưu...' : 'Lưu Trò Chơi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {categoryModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#111722] border border-gray-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">
              {categoryModal.isEdit ? 'Chỉnh Sửa Danh Mục' : 'Thêm Danh Mục Giao Dịch'}
            </h3>
            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-gray-400 mb-1">Tên danh mục *</label>
                <input
                  type="text"
                  required
                  value={categoryModal.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const slug = categoryModal.isEdit ? categoryModal.slug : name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                    setCategoryModal({ ...categoryModal, name, slug });
                  }}
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-gray-400 mb-1">Đường dẫn tĩnh (Slug) *</label>
                <input
                  type="text"
                  required
                  value={categoryModal.slug}
                  onChange={(e) => setCategoryModal({ ...categoryModal, slug: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-white text-sm font-mono focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-gray-400 mb-1">Phân loại *</label>
                <select
                  value={categoryModal.type}
                  onChange={(e) => setCategoryModal({ ...categoryModal, type: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-red-500"
                >
                  <option value="account">Tài khoản (Account)</option>
                  <option value="item">Vật phẩm / Tiền tệ game (Item / Currency)</option>
                  <option value="boosting">Cày thuê / Huấn luyện (Boosting / Coaching)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-gray-400 mb-1">Tên đơn vị tính (ví dụ: tài khoản, vàng, bậc rank)</label>
                <input
                  type="text"
                  required
                  value={categoryModal.unitLabel}
                  onChange={(e) => setCategoryModal({ ...categoryModal, unitLabel: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setCategoryModal({ ...categoryModal, open: false })}
                  className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 text-xs font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
                >
                  {saving ? 'Đang lưu...' : 'Lưu Danh Mục'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
