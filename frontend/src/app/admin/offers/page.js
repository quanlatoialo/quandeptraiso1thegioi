'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatEUR, formatDateTime, getStatusBadge } from '@/lib/utils';
import {
  TagIcon,
  SearchIcon,
  ShieldIcon,
  RefreshIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
} from '@/components/Icons';

export default function AdminOffersPage() {
  const [offers, setOffers] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Moderation Modal
  const [modModal, setModModal] = useState({
    open: false,
    offer: null,
    removed: true,
    reason: '',
  });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadOffers();
  }, [page, statusFilter]);

  const loadOffers = async () => {
    try {
      setLoading(true);
      setError('');
      let url = `/admin/offers?page=${page}&limit=20`;
      if (search.trim()) url += `&q=${encodeURIComponent(search.trim())}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      const res = await api.get(url);
      setOffers(res.items || []);
      setPagination(res.pagination || { total: res.items?.length || 0, pages: 1 });
    } catch (err) {
      setError(err.message || 'Failed to load offers');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadOffers();
  };

  const handleModerate = async (e) => {
    e.preventDefault();
    if (!modModal.offer) return;
    try {
      setActionLoading(true);
      await api.post(`/admin/offers/${modModal.offer.id}/moderate`, {
        removed: modModal.removed,
        reason: modModal.reason.trim(),
      });
      setModModal({ open: false, offer: null, removed: true, reason: '' });
      await loadOffers();
    } catch (err) {
      alert(err.message || 'Moderation action failed');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-800/80 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <TagIcon className="w-7 h-7 text-red-400" />
            Kiểm Duyệt Sản Phẩm & An Toàn Nội Dung
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Rà soát các bài đăng chào bán, thực thi quy tắc giao dịch và gỡ bỏ tin đăng vi phạm.
          </p>
        </div>

        <button
          onClick={loadOffers}
          className="p-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition border border-gray-700 self-start sm:self-auto"
          title="Làm mới"
        >
          <RefreshIcon className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Tìm kiếm theo tiêu đề tin đăng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#111722] border border-gray-800 rounded-xl pl-4 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
            />
            <button type="submit" className="absolute right-3 top-2.5 text-gray-400 hover:text-white">
              <SearchIcon className="w-5 h-5" />
            </button>
          </div>
        </form>

        <div className="flex flex-wrap gap-2 text-xs font-mono">
          {[
            { id: '', label: `Tất cả (${pagination.total})` },
            { id: 'active', label: 'Đang mở bán' },
            { id: 'paused', label: 'Tạm dừng' },
            { id: 'expired', label: 'Hết hạn' },
            { id: 'removed', label: 'Đã gỡ bỏ' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setStatusFilter(tab.id); setPage(1); }}
              className={`px-3 py-2 rounded-lg transition ${
                statusFilter === tab.id
                  ? 'bg-red-950 text-red-200 border border-red-800 font-bold'
                  : 'bg-gray-900 text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Offers Table */}
      {loading ? (
        <div className="text-center py-16 text-gray-500">
          <div className="inline-block w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p>Đang quét danh sách tin đăng trên sàn...</p>
        </div>
      ) : offers.length === 0 ? (
        <div className="text-center py-16 p-8 rounded-2xl bg-[#111722]/60 border border-gray-800/80 text-gray-500">
          Không tìm thấy tin đăng nào phù hợp với bộ lọc.
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-[#111722]/80 border border-gray-800/80 overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="text-xs uppercase bg-gray-900/70 text-gray-400 font-mono border-b border-gray-800">
              <tr>
                <th className="py-3 px-4">Tin Đăng</th>
                <th className="py-3 px-4">Game / Danh Mục</th>
                <th className="py-3 px-4">Người Bán</th>
                <th className="py-3 px-4">Đơn Giá</th>
                <th className="py-3 px-4">Kho Hàng</th>
                <th className="py-3 px-4">Trạng Thái</th>
                <th className="py-3 px-4 text-right">Kiểm Duyệt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {offers.map((o) => {
                const badge = getStatusBadge(o.status);
                const isRemoved = o.moderation?.removed;
                return (
                  <tr key={o.id} className="hover:bg-gray-800/30 transition">
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-semibold text-white truncate">{o.title}</div>
                      <div className="text-xs text-gray-500 font-mono truncate">{o.id}</div>
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <div className="text-white">{o.game?.name}</div>
                      <div className="text-gray-400 font-mono uppercase">{o.category?.name} ({o.type === 'account' ? 'Tài khoản' : o.type === 'item' ? 'Vật phẩm' : 'Cày thuê'})</div>
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <div className="text-white font-medium">{o.seller?.displayName || 'Chưa rõ'}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-white whitespace-nowrap">
                      {formatEUR(o.unitPrice)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-gray-300">
                      {o.stock}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {isRemoved ? (
                        <div>
                          <span className="text-xs px-2 py-0.5 rounded font-semibold bg-red-950 text-red-300 border border-red-800">
                            BỊ GỠ BỎ
                          </span>
                          {o.moderation?.reason && (
                            <div className="text-[10px] text-red-400 mt-0.5 max-w-[140px] truncate">
                              {o.moderation.reason}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className={`text-xs px-2 py-0.5 rounded font-semibold ${badge.bg} ${badge.color}`}>
                          {badge.label}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                      <Link
                        href={`/offers/${o.id}`}
                        target="_blank"
                        className="px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium inline-block"
                      >
                        Xem chi tiết
                      </Link>
                      {isRemoved ? (
                        <button
                          onClick={() => setModModal({ open: true, offer: o, removed: false, reason: '' })}
                          className="px-2.5 py-1 rounded bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-xs font-medium"
                        >
                          Khôi phục
                        </button>
                      ) : (
                        <button
                          onClick={() => setModModal({ open: true, offer: o, removed: true, reason: '' })}
                          className="px-2.5 py-1 rounded bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 text-xs font-medium"
                        >
                          Gỡ tin
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {pagination.pages > 1 && (
            <div className="flex justify-center items-center gap-2 pt-6">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-xs disabled:opacity-40"
              >
                Trang trước
              </button>
              <span className="text-xs text-gray-400 font-mono">
                Trang {page} / {pagination.pages}
              </span>
              <button
                disabled={page >= pagination.pages}
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-xs disabled:opacity-40"
              >
                Trang sau
              </button>
            </div>
          )}
        </div>
      )}

      {/* Moderation Modal */}
      {modModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#111722] border border-gray-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">
              {modModal.removed ? 'Gỡ Bỏ Tin Đăng Khỏi Sàn' : 'Khôi Phục Tin Đăng'}
            </h3>
            <p className="text-xs text-gray-400">
              Tin đăng: <strong className="text-white">{modModal.offer?.title}</strong>
            </p>
            <form onSubmit={handleModerate} className="space-y-4">
              {modModal.removed && (
                <div>
                  <label className="block text-xs font-mono uppercase text-gray-400 mb-1">
                    Lý do gỡ bỏ *
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Ví dụ: Phương thức giao dịch vi phạm quy định sàn, nội dung sai sự thật..."
                    value={modModal.reason}
                    onChange={(e) => setModModal({ ...modModal, reason: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-red-500"
                  />
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModModal({ open: false, offer: null, removed: true, reason: '' })}
                  className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 text-xs font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className={`px-4 py-2 rounded-xl text-white text-xs font-semibold ${
                    modModal.removed ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                >
                  {modModal.removed ? 'Xác Nhận Gỡ Bỏ' : 'Xác Nhận Khôi Phục'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
