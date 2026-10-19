'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { formatEUR, formatDateTime, getStatusBadge } from '@/lib/utils';
import {
  ClockIcon,
  SearchIcon,
  ChevronRightIcon,
  RefreshIcon,
  ShieldIcon,
  AlertTriangleIcon,
} from '@/components/Icons';

export default function MerchantOrdersPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isMerchant = user && (user.roles?.includes('seller') || user.roles?.includes('booster'));

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login?redirect=/seller/orders');
      return;
    }
    if (!isMerchant) {
      router.push('/become-seller');
      return;
    }
    loadOrders();
  }, [user, authLoading, isMerchant, statusFilter, page]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError('');
      let url = `/orders?as=seller&page=${page}&limit=15`;
      if (statusFilter) url += `&status=${statusFilter}`;
      const res = await api.get(url);
      setOrders(res.items || []);
      setPagination(res.pagination || { total: res.items?.length || 0, pages: 1 });
    } catch (err) {
      setError(err.message || 'Failed to load sales orders');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-800/80 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <ClockIcon className="w-7 h-7 text-purple-400" />
            Danh Sách Đơn Bán Hàng
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Xử lý đơn hàng của người mua, bàn giao tài khoản và nhận giải ngân tiền ký quỹ.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadOrders}
            className="p-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition border border-gray-700"
            title="Làm mới"
          >
            <RefreshIcon className="w-4 h-4" />
          </button>
          <Link
            href="/seller/earnings"
            className="px-4 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 font-medium text-sm transition border border-gray-700 flex items-center gap-2"
          >
            <ShieldIcon className="w-4 h-4 text-purple-400" />
            Thống Kê Doanh Thu
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 text-xs font-medium">
        {[
          { id: '', label: 'Tất Cả Đơn' },
          { id: 'open', label: 'Đang Xử Lý' },
          { id: 'funded', label: 'Đã Giữ Tiền (Cần Bàn Giao)' },
          { id: 'in_progress', label: 'Đang Thực Hiện' },
          { id: 'awaiting_customer_confirmation', label: 'Chờ Khách Duyệt' },
          { id: 'completed', label: 'Hoàn Tất' },
          { id: 'disputed', label: 'Khiếu Nại' },
          { id: 'cancelled', label: 'Đã Hủy' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setStatusFilter(tab.id);
              setPage(1);
            }}
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

      {/* Orders Table */}
      {loading ? (
        <div className="text-center py-16 text-gray-500">
          <div className="inline-block w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p>Đang tải danh sách đơn bán...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 p-8 rounded-2xl bg-[#111722]/60 border border-gray-800/80">
          <ClockIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">Chưa tìm thấy đơn bán nào</h3>
          <p className="text-sm text-gray-400">
            {statusFilter
              ? `Không có đơn bán nào ở trạng thái "${statusFilter}".`
              : 'Bạn chưa nhận được đơn mua nào. Hãy đảm bảo bài đăng còn tồn kho và có mức giá hấp dẫn.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((ord) => {
            const badge = getStatusBadge(ord.status);
            return (
              <div
                key={ord.id}
                className="p-5 rounded-2xl bg-[#111722]/80 border border-gray-800/80 hover:border-gray-700/80 transition flex flex-col md:flex-row md:items-center md:justify-between gap-4"
              >
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-purple-950/50 border border-purple-800/40 text-purple-400 flex items-center justify-center flex-shrink-0 font-mono font-bold text-sm">
                    #{ord.orderNumber?.slice(-4) || 'ĐƠN'}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-purple-400 font-semibold">
                        {ord.orderNumber}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded font-semibold ${badge.bg} ${badge.color}`}>
                        {badge.label}
                      </span>
                      {ord.status === 'funded' && (
                        <span className="text-[11px] px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 animate-pulse font-mono">
                          CẦN XỬ LÝ: Bàn Giao Hàng
                        </span>
                      )}
                      {ord.status === 'awaiting_customer_confirmation' && (
                        <span className="text-[11px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono">
                          Đã gửi thông tin • Chờ khách xác nhận
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-white truncate max-w-xl">
                      {ord.offerSnapshot?.title || 'Đơn hàng trò chơi'}
                    </h3>

                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>Người mua: <strong className="text-gray-200">{ord.buyer?.displayName || 'Khách vãng lai'}</strong></span>
                      <span>SL: <strong className="text-gray-200">{ord.quantity}</strong></span>
                      <span>Thời gian: {formatDateTime(ord.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-6 flex-shrink-0">
                  <div className="text-left md:text-right">
                    <div className="text-xl font-extrabold text-white font-mono">
                      {formatEUR(ord.total)}
                    </div>
                    <div className="text-[11px] text-gray-400">
                      Phí sàn: {formatEUR(ord.fee || 0)}
                    </div>
                  </div>

                  <Link
                    href={`/orders/${ord.id}`}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition shadow-lg shadow-purple-900/30 flex items-center gap-1.5"
                  >
                    Mở Phòng Đơn
                    <ChevronRightIcon className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-center items-center gap-2 pt-4">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-xs disabled:opacity-40"
              >
                Trang Trước
              </button>
              <span className="text-xs text-gray-400 font-mono">
                Trang {page} trên {pagination.pages}
              </span>
              <button
                disabled={page >= pagination.pages}
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-xs disabled:opacity-40"
              >
                Trang Kế
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
