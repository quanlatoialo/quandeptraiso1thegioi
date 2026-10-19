'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatEUR, formatDateTime, getStatusBadge } from '@/lib/utils';
import {
  ClockIcon,
  SearchIcon,
  RefreshIcon,
  AlertTriangleIcon,
  ChevronRightIcon,
} from '@/components/Icons';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Cancel Modal
  const [cancelModal, setCancelModal] = useState({ open: false, order: null, reason: '' });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [page, statusFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError('');
      let url = `/admin/orders?page=${page}&limit=20`;
      if (search.trim()) url += `&q=${encodeURIComponent(search.trim())}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      const res = await api.get(url);
      setOrders(res.items || []);
      setPagination(res.pagination || { total: res.items?.length || 0, pages: 1 });
    } catch (err) {
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadOrders();
  };

  const handleCancelOrder = async (e) => {
    e.preventDefault();
    if (!cancelModal.order) return;
    try {
      setActionLoading(true);
      await api.post(`/admin/orders/${cancelModal.order.id}/cancel`, {
        reason: cancelModal.reason.trim(),
      });
      setCancelModal({ open: false, order: null, reason: '' });
      await loadOrders();
    } catch (err) {
      alert(err.message || 'Cancellation failed');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-800/80 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <ClockIcon className="w-7 h-7 text-red-400" />
            Giám Sát Toàn Bộ Đơn Hàng Ký Quỹ
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Theo dõi toàn bộ vòng đời giao dịch trên nền tảng và can thiệp kịp thời các đơn hàng tắc nghẽn.
          </p>
        </div>

        <button
          onClick={loadOrders}
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
              placeholder="Tìm theo mã đơn ORD-..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#111722] border border-gray-800 rounded-xl pl-4 pr-10 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-red-500"
            />
            <button type="submit" className="absolute right-3 top-2.5 text-gray-400 hover:text-white">
              <SearchIcon className="w-5 h-5" />
            </button>
          </div>
        </form>

        <div className="flex flex-wrap gap-2 text-xs font-mono">
          {[
            { id: '', label: `Tất cả (${pagination.total})` },
            { id: 'funded', label: 'Đã cọc' },
            { id: 'in_progress', label: 'Đang thực hiện' },
            { id: 'awaiting_customer_confirmation', label: 'Chờ xác nhận' },
            { id: 'completed', label: 'Hoàn tất' },
            { id: 'disputed', label: 'Khiếu nại' },
            { id: 'cancelled', label: 'Đã hủy' },
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

      {/* Orders Table */}
      {loading ? (
        <div className="text-center py-16 text-gray-500">
          <div className="inline-block w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p>Đang truy vấn đơn hàng...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 p-8 rounded-2xl bg-[#111722]/60 border border-gray-800/80 text-gray-500">
          Không tìm thấy đơn hàng nào.
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-[#111722]/80 border border-gray-800/80 overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="text-xs uppercase bg-gray-900/70 text-gray-400 font-mono border-b border-gray-800">
              <tr>
                <th className="py-3 px-4">Mã Đơn</th>
                <th className="py-3 px-4">Sản Phẩm / Tin Đăng</th>
                <th className="py-3 px-4">Hai Bên Giao Dịch</th>
                <th className="py-3 px-4">Tổng Tiền</th>
                <th className="py-3 px-4">Trạng Thái</th>
                <th className="py-3 px-4">Ngày Tạo</th>
                <th className="py-3 px-4 text-right">Hành Động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {orders.map((ord) => {
                const badge = getStatusBadge(ord.status);
                const canEmergencyCancel = ['funded', 'in_progress', 'awaiting_customer_confirmation'].includes(ord.status);
                return (
                  <tr key={ord.id} className="hover:bg-gray-800/30 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-red-400">
                      {ord.orderNumber}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-medium text-white truncate">{ord.offerSnapshot?.title}</div>
                      <div className="text-xs text-gray-400 font-mono">SL: {ord.quantity}</div>
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <div>Mua: <span className="text-white">{ord.buyer?.displayName || 'Khách hàng'}</span></div>
                      <div>Bán: <span className="text-white">{ord.seller?.displayName || 'Thương gia'}</span></div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-white whitespace-nowrap">
                      {formatEUR(ord.total)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`text-xs px-2 py-0.5 rounded font-semibold ${badge.bg} ${badge.color}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-400 whitespace-nowrap">
                      {formatDateTime(ord.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                      <Link
                        href={`/orders/${ord.id}`}
                        className="px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium inline-block"
                      >
                        Phòng chat
                      </Link>
                      {canEmergencyCancel && (
                        <button
                          onClick={() => setCancelModal({ open: true, order: ord, reason: '' })}
                          className="px-2.5 py-1 rounded bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 text-xs font-medium"
                        >
                          Hủy đơn
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

      {/* Cancel Modal */}
      {cancelModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#111722] border border-red-900/60 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-red-400">Hủy Đơn Hàng Khẩn Cấp</h3>
            <p className="text-xs text-gray-300">
              Hủy đơn hàng <strong className="text-white font-mono">{cancelModal.order?.orderNumber}</strong> sẽ hoàn trả ngay lập tức toàn bộ tiền ký quỹ về ví người mua.
            </p>
            <form onSubmit={handleCancelOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-gray-400 mb-1">
                  Lý do hủy đơn khẩn cấp *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ví dụ: Người bán không phản hồi sau thời gian quy định..."
                  value={cancelModal.reason}
                  onChange={(e) => setCancelModal({ ...cancelModal, reason: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-red-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelModal({ open: false, order: null, reason: '' })}
                  className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 text-xs font-medium"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
                >
                  {actionLoading ? 'Đang xử lý...' : 'Xác Nhận Hủy & Hoàn Tiền'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
