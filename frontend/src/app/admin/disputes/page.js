'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatEUR, formatDateTime } from '@/lib/utils';
import {
  AlertTriangleIcon,
  RefreshIcon,
  ShieldIcon,
  CheckCircleIcon,
  ChevronRightIcon,
} from '@/components/Icons';

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState([]);
  const [statusFilter, setStatusFilter] = useState('open');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDisputes();
  }, [statusFilter]);

  const loadDisputes = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/admin/disputes?status=${statusFilter}`);
      setDisputes(res.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load disputes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-800/80 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <AlertTriangleIcon className="w-7 h-7 text-rose-500" />
            Trọng Tài Phán Quyết Khiếu Nại Ký Quỹ
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Giải quyết các giao dịch tranh chấp khi bên mua hoặc bán từ chối xác nhận hoặc gặp sự cố bàn giao.
          </p>
        </div>

        <button
          onClick={loadDisputes}
          className="p-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition border border-gray-700 self-start sm:self-auto"
          title="Làm mới"
        >
          <RefreshIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 text-xs font-mono">
        {[
          { key: 'open', label: 'Đang Chờ Xử Lý' },
          { key: 'resolved', label: 'Đã Giải Quyết' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-4 py-2 rounded-lg uppercase tracking-wider font-bold transition ${
              statusFilter === tab.key
                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                : 'bg-gray-900 text-gray-400 hover:text-white'
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

      {loading ? (
        <div className="text-center py-16 text-gray-500">
          <div className="inline-block w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p>Đang tải danh sách khiếu nại...</p>
        </div>
      ) : disputes.length === 0 ? (
        <div className="text-center py-16 p-8 rounded-2xl bg-[#111722]/60 border border-gray-800/80 text-gray-500">
          Không có hồ sơ khiếu nại nào ở danh mục này.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {disputes.map((d) => (
            <div
              key={d.id}
              className="p-6 rounded-2xl bg-[#111722]/80 border border-gray-800/80 hover:border-gray-700/80 transition flex flex-col md:flex-row md:items-center md:justify-between gap-6"
            >
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-mono text-xs font-bold text-rose-400">
                    Đơn #{d.order?.orderNumber || 'ORD'}
                  </span>
                  <span
                    className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded font-bold ${
                      d.status === 'open'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800 animate-pulse'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}
                  >
                    {d.status === 'open' ? 'Đang mở' : 'Đã xử lý'}
                  </span>
                  <span className="text-xs text-gray-400">
                    Mở bởi <strong className="text-white capitalize">{d.openedByRole === 'buyer' ? 'Người mua' : d.openedByRole === 'seller' ? 'Người bán' : d.openedByRole}</strong>
                  </span>
                  <span className="text-xs text-gray-500 font-mono">
                    {formatDateTime(d.createdAt)}
                  </span>
                </div>

                <div className="text-white font-bold text-base truncate">
                  {d.order?.title || 'Khiếu nại giao dịch'}
                </div>

                <div className="text-xs text-gray-400 font-mono flex items-center gap-4">
                  <span>Người mua: <strong className="text-white">{d.buyer || 'Chưa rõ'}</strong></span>
                  <span>Người bán: <strong className="text-white">{d.seller || 'Chưa rõ'}</strong></span>
                  <span>Ký quỹ bị khóa: <strong className="text-rose-400 font-bold">{formatEUR(d.order?.total || 0)}</strong></span>
                </div>

                <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800 text-xs text-rose-200/90 font-mono">
                  Lý do: "{d.reason}"
                </div>

                {d.resolution && (
                  <div className="text-xs text-emerald-300 mt-2 font-mono">
                    Phán quyết: <span className="uppercase font-bold">{d.resolution.decision === 'refund_buyer' ? 'Hoàn tiền cho người mua' : d.resolution.decision === 'release_seller' ? 'Giải ngân cho người bán' : d.resolution.decision}</span> ({formatDateTime(d.resolution.resolvedAt)})
                  </div>
                )}
              </div>

              <div className="flex-shrink-0">
                <Link
                  href={`/admin/disputes/${d.id}`}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition shadow-lg shadow-rose-900/30 flex items-center gap-1.5"
                >
                  Xem xét & Phán quyết
                  <ChevronRightIcon className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
