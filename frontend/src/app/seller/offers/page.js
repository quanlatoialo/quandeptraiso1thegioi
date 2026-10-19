'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { formatEUR, formatDateTime, getStatusBadge } from '@/lib/utils';
import {
  TagIcon,
  PlusIcon,
  RefreshIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  SearchIcon,
} from '@/components/Icons';

export default function MerchantOffersPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [offers, setOffers] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  // Quick Stock Modal State
  const [stockModal, setStockModal] = useState({ open: false, offer: null, newStock: '' });
  // Renew Modal State
  const [renewModal, setRenewModal] = useState({ open: false, offer: null, days: 30 });

  const isMerchant = user && (user.roles?.includes('seller') || user.roles?.includes('booster'));

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login?redirect=/seller/offers');
      return;
    }
    if (!isMerchant) {
      router.push('/become-seller');
      return;
    }
    loadOffers();
  }, [user, authLoading, isMerchant, statusFilter]);

  const loadOffers = async () => {
    try {
      setLoading(true);
      setError('');
      const query = statusFilter ? `?status=${statusFilter}` : '';
      const res = await api.get(`/me/offers${query}`);
      setOffers(res.items || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch offers');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusAction = async (offerId, action, extra = {}) => {
    try {
      setActionLoading(offerId);
      await api.post(`/offers/${offerId}/status`, { action, ...extra });
      await loadOffers();
    } catch (err) {
      alert(err.message || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateStock = async (e) => {
    e.preventDefault();
    const { offer, newStock } = stockModal;
    if (!offer) return;
    const stockVal = parseInt(newStock, 10);
    if (isNaN(stockVal) || stockVal < 0) {
      alert('Stock must be 0 or greater');
      return;
    }
    try {
      setActionLoading(offer.id);
      await api.patch(`/offers/${offer.id}/stock`, {
        stock: stockVal,
        expectedStock: offer.stock,
      });
      setStockModal({ open: false, offer: null, newStock: '' });
      await loadOffers();
    } catch (err) {
      alert(err.message || 'Failed to update stock');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRenew = async (e) => {
    e.preventDefault();
    const { offer, days } = renewModal;
    if (!offer) return;
    try {
      setActionLoading(offer.id);
      await api.post(`/offers/${offer.id}/status`, {
        action: 'renew',
        durationDays: Number(days),
      });
      setRenewModal({ open: false, offer: null, days: 30 });
      await loadOffers();
    } catch (err) {
      alert(err.message || 'Failed to renew listing');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-800/80 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <TagIcon className="w-7 h-7 text-purple-400" />
            Danh Sách Bài Đăng Của Tôi
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Quản lý tài khoản game, vật phẩm và dịch vụ cày thuê đang bán.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadOffers}
            className="p-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition border border-gray-700"
            title="Làm mới danh sách"
          >
            <RefreshIcon className="w-4 h-4" />
          </button>
          <Link
            href="/seller/offers/new"
            className="px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm transition shadow-lg shadow-purple-900/30 flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4" />
            Tạo Bài Đăng
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 text-xs font-medium">
        {[
          { id: '', label: 'Tất Cả Bài Đăng' },
          { id: 'active', label: 'Đang Bán' },
          { id: 'paused', label: 'Tạm Dừng' },
          { id: 'sold_out', label: 'Hết Hàng' },
          { id: 'expired', label: 'Hết Hạn' },
          { id: 'draft', label: 'Bản Nháp' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3 py-1.5 rounded-lg transition ${
              statusFilter === tab.id
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-gray-800/70 text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Offer Cards / Table */}
      {loading ? (
        <div className="text-center py-16 text-gray-500">
          <div className="inline-block w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p>Đang tải danh sách bài đăng...</p>
        </div>
      ) : offers.length === 0 ? (
        <div className="text-center py-16 p-8 rounded-2xl bg-[#111722]/60 border border-gray-800/80">
          <TagIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">Chưa có bài đăng nào</h3>
          <p className="text-sm text-gray-400 mb-6">
            {statusFilter
              ? `Bạn không có bài đăng nào ở trạng thái "${statusFilter}".`
              : 'Bắt đầu bán hàng bằng cách đăng bán tài khoản, vật phẩm hoặc dịch vụ cày thuê đầu tiên.'}
          </p>
          <Link
            href="/seller/offers/new"
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm transition"
          >
            Tạo Bài Đăng Ngay
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {offers.map((offer) => {
            const badge = getStatusBadge(offer.status);
            const isRemoved = offer.moderation?.removed;
            const isBusy = actionLoading === offer.id;

            return (
              <div
                key={offer.id}
                className="p-5 rounded-2xl bg-[#111722]/80 border border-gray-800/80 hover:border-gray-700/80 transition flex flex-col md:flex-row md:items-center md:justify-between gap-4"
              >
                {/* Left: Thumbnail & Details */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-gray-900 flex-shrink-0 overflow-hidden border border-gray-800 flex items-center justify-center">
                    {offer.images && offer.images[0] ? (
                      <img
                        src={offer.images[0]}
                        alt={offer.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <TagIcon className="w-7 h-7 text-gray-600" />
                    )}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-800 text-gray-300">
                        {offer.game?.name || 'Trò chơi'}
                      </span>
                      <span className="text-xs uppercase font-mono px-2 py-0.5 rounded bg-purple-950/70 border border-purple-800/40 text-purple-300">
                        {offer.type === 'account' ? 'Tài khoản' : offer.type === 'item' ? 'Vật phẩm' : 'Cày thuê'}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded font-semibold ${badge.bg} ${badge.color}`}>
                        {badge.label}
                      </span>
                      {isRemoved && (
                        <span className="text-xs px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800">
                          Bị gỡ bởi kiểm duyệt: {offer.moderation?.reason || 'Vi phạm chính sách'}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-white truncate max-w-xl">
                      {offer.title}
                    </h3>

                    <div className="flex items-center gap-4 text-xs text-gray-400 font-mono">
                      <span>Tồn kho: <strong className="text-white">{offer.stock}</strong></span>
                      <span>Tối thiểu: <strong className="text-white">{offer.minPerOrder || 1}</strong></span>
                      <span>Giao hàng: <strong className="text-white">~{offer.deliveryTimeHours}h</strong></span>
                      {offer.expiresAt && (
                        <span className="hidden sm:inline">Hết hạn: {formatDateTime(offer.expiresAt)}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Middle: Price */}
                <div className="md:text-right flex-shrink-0">
                  <div className="text-xl sm:text-2xl font-black text-white font-mono">
                    {formatEUR(offer.unitPrice)}
                  </div>
                  <div className="text-xs text-gray-400">
                    / {offer.unitLabel || 'đơn vị'}
                  </div>
                </div>

                {/* Right: Quick Actions */}
                <div className="flex items-center gap-2 flex-wrap md:flex-nowrap flex-shrink-0">
                  <Link
                    href={`/offers/${offer.id}`}
                    className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium transition"
                  >
                    Xem
                  </Link>

                  <Link
                    href={`/seller/offers/${offer.id}/edit`}
                    className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium transition"
                  >
                    Sửa
                  </Link>

                  <button
                    disabled={isBusy}
                    onClick={() =>
                      setStockModal({
                        open: true,
                        offer,
                        newStock: String(offer.stock),
                      })
                    }
                    className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium transition"
                  >
                    Kho
                  </button>

                  {offer.status === 'active' && (
                    <button
                      disabled={isBusy}
                      onClick={() => handleStatusAction(offer.id, 'pause')}
                      className="px-3 py-1.5 rounded-lg bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/60 text-amber-300 text-xs font-medium transition"
                    >
                      Tạm Dừng
                    </button>
                  )}

                  {offer.status === 'paused' && (
                    <button
                      disabled={isBusy}
                      onClick={() => handleStatusAction(offer.id, 'resume')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/60 text-emerald-300 text-xs font-medium transition"
                    >
                      Tiếp Tục
                    </button>
                  )}

                  {offer.status === 'draft' && (
                    <button
                      disabled={isBusy}
                      onClick={() => handleStatusAction(offer.id, 'publish')}
                      className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition"
                    >
                      Đăng Bán
                    </button>
                  )}

                  {(offer.status === 'expired' || offer.status === 'sold_out') && (
                    <button
                      disabled={isBusy}
                      onClick={() =>
                        setRenewModal({
                          open: true,
                          offer,
                          days: offer.durationDays || 30,
                        })
                      }
                      className="px-3 py-1.5 rounded-lg bg-blue-900/50 hover:bg-blue-800/60 border border-blue-700/60 text-blue-300 text-xs font-medium transition"
                    >
                      Gia Hạn
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Stock Modal */}
      {stockModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#111722] border border-gray-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Cập Nhật Số Lượng Kho</h3>
            <p className="text-xs text-gray-400">
              Điều chỉnh số lượng sẵn có cho <strong className="text-white">{stockModal.offer?.title}</strong>. (Hiện tại: {stockModal.offer?.stock})
            </p>
            <form onSubmit={handleUpdateStock} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-gray-400 mb-1">
                  Số lượng mới khả dụng
                </label>
                <input
                  type="number"
                  min="0"
                  max="1000000"
                  value={stockModal.newStock}
                  onChange={(e) => setStockModal({ ...stockModal, newStock: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStockModal({ open: false, offer: null, newStock: '' })}
                  className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={actionLoading !== null}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
                >
                  Lưu Tồn Kho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Renew Listing Modal */}
      {renewModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#111722] border border-gray-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Gia Hạn Thời Gian Đăng Bán</h3>
            <p className="text-xs text-gray-400">
              Đặt lại thời hạn hoạt động cho <strong className="text-white">{renewModal.offer?.title}</strong>. Tối đa 30 ngày theo quy chế sàn.
            </p>
            <form onSubmit={handleRenew} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-gray-400 mb-1">
                  Thời Gian Gia Hạn (Số ngày, tối đa 30)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={renewModal.days}
                  onChange={(e) => setRenewModal({ ...renewModal, days: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRenewModal({ open: false, offer: null, days: 30 })}
                  className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={actionLoading !== null}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
                >
                  Xác Nhận Gia Hạn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
