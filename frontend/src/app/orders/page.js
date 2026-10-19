'use client';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { formatEUR, formatDate, STATUS_MAP } from '@/lib/utils';
import { ClockIcon, ShieldIcon, ArrowRightIcon } from '@/components/Icons';

function OrdersListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const status = searchParams.get('status') || '';

  useEffect(() => {
    if (!user) {
      router.push('/login?redirect=/orders');
      return;
    }

    async function loadOrders() {
      setLoading(true);
      try {
        const query = status ? `?status=${status}` : '';
        const res = await apiRequest(`/api/orders${query}`);
        setOrders(res.items || []);
        setTotal(res.total || 0);
      } catch (err) {
        console.error('Failed to load orders:', err);
      } finally {
        setLoading(false);
      }
    }
    loadOrders();
  }, [user, status, router]);

  const setStatusFilter = (st) => {
    if (st) router.push(`/orders?status=${st}`);
    else router.push('/orders');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Đơn Mua Của Tôi</h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Theo dõi đơn hàng ký quỹ, nhận bàn giao tài khoản và xác nhận giải ngân an toàn
          </p>
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[
            { id: '', label: 'Tất cả' },
            { id: 'open', label: 'Đang xử lý / Mở' },
            { id: 'awaiting_customer_confirmation', label: 'Chờ xác nhận' },
            { id: 'completed', label: 'Đã hoàn tất' },
            { id: 'disputed', label: 'Khiếu nại' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                status === tab.id
                  ? 'bg-purple-600 text-white font-semibold'
                  : 'bg-[#141b27] text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-[#111722] border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-16 text-center text-gray-400">
            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs">Đang tải danh sách đơn mua...</p>
          </div>
        ) : orders.length > 0 ? (
          <div className="divide-y divide-gray-800">
            {orders.map((ord) => {
              const st = STATUS_MAP[ord.status] || { label: ord.status, bg: 'bg-gray-800', text: 'text-gray-300' };
              return (
                <div
                  key={ord.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#151c2a] transition-colors"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-purple-300">
                        {ord.orderNumber}
                      </span>
                      <span
                        className={`text-[10px] font-mono uppercase font-semibold px-2 py-0.5 rounded border ${st.bg} ${st.text} ${st.border}`}
                      >
                        {st.label}
                      </span>
                      {ord.status === 'awaiting_customer_confirmation' && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-semibold animate-pulse">
                          Cần Bạn Xác Nhận
                        </span>
                      )}
                    </div>

                    <h3 className="font-semibold text-sm text-white">
                      {ord.offerSnapshot?.title}
                    </h3>

                    <div className="text-[11px] text-gray-400 flex flex-wrap items-center gap-3">
                      <span>Người bán: <strong className="text-gray-300">{ord.seller?.displayName}</strong></span>
                      <span>•</span>
                      <span>Số lượng: <strong className="text-gray-300">{ord.quantity}</strong></span>
                      <span>•</span>
                      <span className="font-mono">{formatDate(ord.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 pt-3 sm:pt-0 border-t sm:border-0 border-gray-800">
                    <div className="font-extrabold text-base text-white font-mono">
                      {formatEUR(ord.total)}
                    </div>
                    <Link
                      href={`/orders/${ord.id}`}
                      className="px-4 py-2 rounded-lg bg-purple-600/90 hover:bg-purple-600 text-white font-semibold text-xs shadow-md shadow-purple-950/40 transition-all"
                    >
                      Vào Phòng Đơn Hàng →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-16 text-center text-gray-400 space-y-3">
            <p className="text-sm">Không tìm thấy đơn hàng nào phù hợp với bộ lọc.</p>
            <Link
              href="/offers"
              className="inline-block px-4 py-2 rounded-lg bg-purple-600 text-white text-xs font-semibold"
            >
              Khám Phá Thị Trường
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="p-16 text-center text-gray-400">Đang tải danh sách đơn hàng...</div>}>
      <OrdersListContent />
    </Suspense>
  );
}
