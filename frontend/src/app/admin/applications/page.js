'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import {
  ShieldIcon,
  CheckCircleIcon,
  RefreshIcon,
  ClockIcon,
  AlertTriangleIcon,
} from '@/components/Icons';

export default function AdminApplicationsPage() {
  const [apps, setApps] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Review Modal
  const [reviewModal, setReviewModal] = useState({ open: false, app: null, decision: 'approve', note: '' });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadApps();
  }, [statusFilter]);

  const loadApps = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/admin/applications?status=${statusFilter}`);
      setApps(res.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (e) => {
    e.preventDefault();
    if (!reviewModal.app) return;
    try {
      setActionLoading(true);
      await api.post(`/admin/applications/${reviewModal.app.id}/review`, {
        decision: reviewModal.decision,
        note: reviewModal.note.trim(),
      });
      setReviewModal({ open: false, app: null, decision: 'approve', note: '' });
      await loadApps();
    } catch (err) {
      alert(err.message || 'Review submission failed');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-800/80 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <ShieldIcon className="w-7 h-7 text-amber-400" />
            Thẩm Định & Xét Duyệt Đăng Ký Đối Tác
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Đánh giá yêu cầu nâng cấp quyền Người bán và Cày thuê trước khi cấp quyền kinh doanh trên sàn ký quỹ.
          </p>
        </div>

        <button
          onClick={loadApps}
          className="p-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition border border-gray-700 self-start sm:self-auto"
          title="Làm mới"
        >
          <RefreshIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 text-xs font-mono">
        {[
          { key: 'pending', label: 'Chờ Duyệt' },
          { key: 'approved', label: 'Đã Duyệt' },
          { key: 'rejected', label: 'Đã Từ Chối' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-4 py-2 rounded-lg uppercase tracking-wider font-bold transition ${
              statusFilter === tab.key
                ? 'bg-amber-950 text-amber-300 border border-amber-800'
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
          <div className="inline-block w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p>Đang tải danh sách đơn đăng ký...</p>
        </div>
      ) : apps.length === 0 ? (
        <div className="text-center py-16 p-8 rounded-2xl bg-[#111722]/60 border border-gray-800/80 text-gray-500">
          Không có đơn đăng ký nào ở danh mục này.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {apps.map((app) => (
            <div
              key={app.id}
              className="p-6 rounded-2xl bg-[#111722]/80 border border-gray-800/80 hover:border-gray-700/80 transition flex flex-col md:flex-row md:items-start md:justify-between gap-6"
            >
              <div className="space-y-3 flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-bold text-white text-base">
                    {app.user?.displayName || 'Người dùng chưa rõ'}
                  </span>
                  <span className="text-xs text-gray-400 font-mono">
                    ({app.user?.email})
                  </span>
                  <span className="text-xs uppercase font-mono px-2.5 py-0.5 rounded bg-purple-950 text-purple-300 font-bold border border-purple-800/60">
                    Ứng tuyển vai trò: {app.requestedRole === 'seller' ? 'Người bán' : app.requestedRole === 'booster' ? 'Cày thuê' : app.requestedRole}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDateTime(app.createdAt)}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 text-sm text-gray-300 whitespace-pre-line">
                  {app.message}
                </div>

                {app.reviewNote && (
                  <div className="text-xs text-amber-300 bg-amber-950/30 border border-amber-800/40 p-2.5 rounded-lg">
                    <strong>Ghi chú thẩm định:</strong> {app.reviewNote}
                  </div>
                )}
              </div>

              {app.status === 'pending' && (
                <div className="flex sm:flex-col gap-2 flex-shrink-0">
                  <button
                    onClick={() => setReviewModal({ open: true, app, decision: 'approve', note: '' })}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-900/30 transition"
                  >
                    Phê duyệt
                  </button>
                  <button
                    onClick={() => setReviewModal({ open: true, app, decision: 'reject', note: '' })}
                    className="px-4 py-2 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 text-xs font-semibold transition"
                  >
                    Từ chối
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {reviewModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#111722] border border-gray-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">
              {reviewModal.decision === 'approve' ? 'Phê Duyệt Đơn Đăng Ký' : 'Từ Chối Đơn Đăng Ký'}
            </h3>
            <p className="text-xs text-gray-400">
              Người dùng: <strong className="text-white">{reviewModal.app?.user?.displayName}</strong> ({reviewModal.app?.requestedRole === 'seller' ? 'Người bán' : reviewModal.app?.requestedRole === 'booster' ? 'Cày thuê' : reviewModal.app?.requestedRole})
            </p>
            <form onSubmit={handleReview} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-gray-400 mb-1">
                  Ghi chú thẩm định / Phản hồi (Tùy chọn)
                </label>
                <textarea
                  rows={3}
                  placeholder="Ví dụ: Đã xác thực uy tín. Chào mừng bạn gia nhập đội ngũ đối tác!..."
                  value={reviewModal.note}
                  onChange={(e) => setReviewModal({ ...reviewModal, note: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewModal({ open: false, app: null, decision: 'approve', note: '' })}
                  className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 text-xs font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className={`px-4 py-2 rounded-xl text-white text-xs font-semibold ${
                    reviewModal.decision === 'approve'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-red-600 hover:bg-red-500'
                  }`}
                >
                  {actionLoading ? 'Đang xử lý...' : `Xác nhận ${reviewModal.decision === 'approve' ? 'phê duyệt' : 'từ chối'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
