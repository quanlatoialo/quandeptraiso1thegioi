'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatEUR, formatDateTime } from '@/lib/utils';
import {
  ShieldIcon,
  UserIcon,
  TagIcon,
  ClockIcon,
  WalletIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  RefreshIcon,
} from '@/components/Icons';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/admin/stats');
      setStats(res);
    } catch (err) {
      setError(err.message || 'Failed to load administration metrics');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-gray-500">
        <div className="inline-block w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p>Đang tổng hợp số liệu thống kê hệ thống...</p>
      </div>
    );
  }

  const orders = stats?.orders || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-800/80 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <ShieldIcon className="w-7 h-7 text-red-400" />
            Tổng Quan Điều Hành Hệ Thống
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Giám sát giao dịch thời gian thực và kiểm soát tính toàn vẹn của sàn giao dịch.
          </p>
        </div>

        <button
          onClick={loadStats}
          className="p-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition border border-gray-700 self-start sm:self-auto"
          title="Làm mới số liệu"
        >
          <RefreshIcon className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Critical Alerts Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/admin/disputes"
          className={`p-5 rounded-2xl border transition flex items-center justify-between ${
            (stats?.openDisputes || 0) > 0
              ? 'bg-rose-950/40 border-rose-800/80 hover:bg-rose-950/60'
              : 'bg-gray-900/40 border-gray-800 hover:border-gray-700'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-900/40 text-rose-400 flex items-center justify-center font-bold text-xl">
              {stats?.openDisputes || 0}
            </div>
            <div>
              <div className="text-sm font-bold text-white">Khiếu Nại Cần Phán Quyết</div>
              <div className="text-xs text-gray-400">
                Người mua hoặc người bán yêu cầu can thiệp ký quỹ
              </div>
            </div>
          </div>
          <ChevronRightIcon className="w-5 h-5 text-gray-400" />
        </Link>

        <Link
          href="/admin/applications"
          className={`p-5 rounded-2xl border transition flex items-center justify-between ${
            (stats?.pendingApplications || 0) > 0
              ? 'bg-amber-950/40 border-amber-800/80 hover:bg-amber-950/60'
              : 'bg-gray-900/40 border-gray-800 hover:border-gray-700'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-900/40 text-amber-400 flex items-center justify-center font-bold text-xl">
              {stats?.pendingApplications || 0}
            </div>
            <div>
              <div className="text-sm font-bold text-white">Đơn Đăng Ký Đối Tác Chờ Duyệt</div>
              <div className="text-xs text-gray-400">
                Yêu cầu cấp quyền Người bán hoặc Cày thuê đang chờ thẩm định
              </div>
            </div>
          </div>
          <ChevronRightIcon className="w-5 h-5 text-gray-400" />
        </Link>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-6 rounded-2xl bg-[#111722]/80 border border-gray-800/80">
          <div className="text-xs font-mono uppercase text-gray-400 mb-1">Tổng Người Dùng</div>
          <div className="text-3xl font-black text-white font-mono">
            {stats?.users || 0}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {stats?.merchants || 0} đối tác đã xác thực
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-[#111722]/80 border border-gray-800/80">
          <div className="text-xs font-mono uppercase text-gray-400 mb-1">Tin Đang Mở Bán</div>
          <div className="text-3xl font-black text-purple-400 font-mono">
            {stats?.activeOffers || 0}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Đã duyệt, còn hàng & chưa hết hạn
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-[#111722]/80 border border-gray-800/80">
          <div className="text-xs font-mono uppercase text-gray-400 mb-1">Tiền Ký Quỹ Đang Khóa</div>
          <div className="text-3xl font-black text-amber-400 font-mono">
            {formatEUR(stats?.escrowHeld?.total || 0)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Trên {stats?.escrowHeld?.count || 0} hợp đồng đang giữ
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-[#111722]/80 border border-gray-800/80">
          <div className="text-xs font-mono uppercase text-gray-400 mb-1">Tổng Nạp Tiền Hệ Thống</div>
          <div className="text-3xl font-black text-emerald-400 font-mono">
            {formatEUR(stats?.demoDeposits?.total || 0)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {stats?.demoDeposits?.count || 0} lượt nạp ví
          </div>
        </div>
      </div>

      {/* Order Status Breakdown */}
      <div className="p-6 rounded-2xl bg-[#111722]/80 border border-gray-800/80 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <ClockIcon className="w-5 h-5 text-red-400" />
          Phân Bổ Trạng Thái Đơn Hàng
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 text-center">
            <div className="text-xs text-gray-400 font-mono">Chờ thanh toán</div>
            <div className="text-xl font-bold text-gray-300 mt-1">{orders.pending_payment || 0}</div>
          </div>
          <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 text-center">
            <div className="text-xs text-gray-400 font-mono">Đã cọc (Ký quỹ)</div>
            <div className="text-xl font-bold text-blue-400 mt-1">{orders.funded || 0}</div>
          </div>
          <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 text-center">
            <div className="text-xs text-gray-400 font-mono">Đang thực hiện</div>
            <div className="text-xl font-bold text-indigo-400 mt-1">{orders.in_progress || 0}</div>
          </div>
          <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 text-center">
            <div className="text-xs text-gray-400 font-mono">Chờ xác nhận</div>
            <div className="text-xl font-bold text-amber-400 mt-1">{orders.awaiting_customer_confirmation || 0}</div>
          </div>
          <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 text-center">
            <div className="text-xs text-gray-400 font-mono">Hoàn tất</div>
            <div className="text-xl font-bold text-emerald-400 mt-1">{orders.completed || 0}</div>
          </div>
          <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 text-center">
            <div className="text-xs text-gray-400 font-mono">Khiếu nại</div>
            <div className="text-xl font-bold text-rose-400 mt-1">{orders.disputed || 0}</div>
          </div>
        </div>
      </div>

      {/* Recent Audit Trails */}
      <div className="p-6 rounded-2xl bg-[#111722]/80 border border-gray-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldIcon className="w-5 h-5 text-purple-400" />
            Nhật Ký Bảo Mật & Hoạt Động Quản Trị Gần Đây
          </h2>
          <Link
            href="/admin/ledger"
            className="text-xs text-purple-400 hover:text-purple-300 font-medium"
          >
            Toàn bộ sổ cái & kiểm toán →
          </Link>
        </div>

        {(!stats?.recentAudit || stats.recentAudit.length === 0) ? (
          <div className="text-center py-6 text-gray-500 text-sm">
            Không tìm thấy bản ghi kiểm toán nào.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="text-xs uppercase bg-gray-900/70 text-gray-400 font-mono border-b border-gray-800">
                <tr>
                  <th className="py-3 px-4">Hành Động</th>
                  <th className="py-3 px-4">Quản Trị Viên / Tác Nhân</th>
                  <th className="py-3 px-4">Loại Đối Tượng</th>
                  <th className="py-3 px-4">Mã Đối Tượng</th>
                  <th className="py-3 px-4 text-right">Thời Gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {stats.recentAudit.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-800/30 font-mono text-xs">
                    <td className="py-3 px-4 font-bold text-purple-300">
                      {a.action}
                    </td>
                    <td className="py-3 px-4 text-white">
                      {a.actor}
                    </td>
                    <td className="py-3 px-4 text-gray-400">
                      {a.targetType}
                    </td>
                    <td className="py-3 px-4 text-gray-500 truncate max-w-xs">
                      {a.targetId}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-400">
                      {formatDateTime(a.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
