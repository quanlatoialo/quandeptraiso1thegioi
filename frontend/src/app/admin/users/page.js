'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import {
  UserIcon,
  SearchIcon,
  ShieldIcon,
  RefreshIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
} from '@/components/Icons';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Ban Modal
  const [banModal, setBanModal] = useState({ open: false, user: null, reason: '' });
  // Roles Modal
  const [roleModal, setRoleModal] = useState({ open: false, user: null, roles: [] });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [page, statusFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      let url = `/admin/users?page=${page}&limit=20`;
      if (search.trim()) url += `&q=${encodeURIComponent(search.trim())}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      const res = await api.get(url);
      setUsers(res.items || []);
      setPagination(res.pagination || { total: res.items?.length || 0, pages: 1 });
    } catch (err) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  const handleBan = async (e) => {
    e.preventDefault();
    if (!banModal.user) return;
    try {
      setActionLoading(true);
      await api.post(`/admin/users/${banModal.user.id}/ban`, {
        reason: banModal.reason.trim(),
      });
      setBanModal({ open: false, user: null, reason: '' });
      await loadUsers();
    } catch (err) {
      alert(err.message || 'Failed to ban user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnban = async (user) => {
    if (!confirm(`Bạn có chắc chắn muốn mở khóa tài khoản cho ${user.displayName}?`)) return;
    try {
      setActionLoading(true);
      await api.post(`/admin/users/${user.id}/unban`);
      await loadUsers();
    } catch (err) {
      alert(err.message || 'Mở khóa người dùng thất bại');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveRoles = async (e) => {
    e.preventDefault();
    if (!roleModal.user) return;
    try {
      setActionLoading(true);
      await api.put(`/admin/users/${roleModal.user.id}/roles`, {
        roles: roleModal.roles,
      });
      setRoleModal({ open: false, user: null, roles: [] });
      await loadUsers();
    } catch (err) {
      alert(err.message || 'Cập nhật vai trò thất bại');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleRole = (r) => {
    if (r === 'customer') return; // customer is immutable baseline
    setRoleModal((prev) => {
      const exists = prev.roles.includes(r);
      const next = exists ? prev.roles.filter((x) => x !== r) : [...prev.roles, r];
      return { ...prev, roles: next };
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-800/80 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <UserIcon className="w-7 h-7 text-red-400" />
            Quản Lý Người Dùng & Phân Quyền
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Tìm kiếm tài khoản, cấp quyền kinh doanh và thực thi đình chỉ bảo mật khi vi phạm chính sách.
          </p>
        </div>

        <button
          onClick={loadUsers}
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
              placeholder="Tìm kiếm theo email hoặc tên hiển thị..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#111722] border border-gray-800 rounded-xl pl-4 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
            />
            <button type="submit" className="absolute right-3 top-2.5 text-gray-400 hover:text-white">
              <SearchIcon className="w-5 h-5" />
            </button>
          </div>
        </form>

        <div className="flex gap-2 text-xs font-mono">
          <button
            onClick={() => { setStatusFilter(''); setPage(1); }}
            className={`px-3 py-2 rounded-lg transition ${
              statusFilter === '' ? 'bg-red-950 text-red-200 border border-red-800' : 'bg-gray-900 text-gray-400'
            }`}
          >
            Tất cả ({pagination.total})
          </button>
          <button
            onClick={() => { setStatusFilter('active'); setPage(1); }}
            className={`px-3 py-2 rounded-lg transition ${
              statusFilter === 'active' ? 'bg-red-950 text-red-200 border border-red-800' : 'bg-gray-900 text-gray-400'
            }`}
          >
            Hoạt động
          </button>
          <button
            onClick={() => { setStatusFilter('banned'); setPage(1); }}
            className={`px-3 py-2 rounded-lg transition ${
              statusFilter === 'banned' ? 'bg-red-950 text-red-200 border border-red-800' : 'bg-gray-900 text-gray-400'
            }`}
          >
            Bị khóa
          </button>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="text-center py-16 text-gray-500">
          <div className="inline-block w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p>Đang truy vấn danh sách người dùng...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 p-8 rounded-2xl bg-[#111722]/60 border border-gray-800/80 text-gray-500">
          Không tìm thấy người dùng nào phù hợp tiêu chí.
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-[#111722]/80 border border-gray-800/80 overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="text-xs uppercase bg-gray-900/70 text-gray-400 font-mono border-b border-gray-800">
              <tr>
                <th className="py-3 px-4">Người Dùng</th>
                <th className="py-3 px-4">Vai Trò</th>
                <th className="py-3 px-4">Trạng Thái</th>
                <th className="py-3 px-4">Ngày Tham Gia</th>
                <th className="py-3 px-4 text-right">Hành Động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-800/30 transition">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-white">{u.displayName}</div>
                    <div className="text-xs text-gray-400 font-mono">{u.email}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1">
                      {u.roles?.map((r) => (
                        <span
                          key={r}
                          className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded font-bold ${
                            r === 'admin'
                              ? 'bg-red-950 text-red-300 border border-red-800/60'
                              : r === 'seller' || r === 'booster'
                              ? 'bg-purple-950 text-purple-300 border border-purple-800/60'
                              : 'bg-gray-800 text-gray-300'
                          }`}
                        >
                          {r === 'admin' ? 'Quản trị' : r === 'seller' ? 'Người bán' : r === 'booster' ? 'Cày thuê' : 'Thành viên'}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    {u.status === 'banned' ? (
                      <div>
                        <span className="text-xs px-2 py-0.5 rounded font-semibold bg-red-950 text-red-300 border border-red-800">
                          BỊ KHÓA
                        </span>
                        {u.banReason && (
                          <div className="text-[11px] text-red-400 mt-1 max-w-xs truncate">
                            {u.banReason}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded font-semibold bg-emerald-950/70 text-emerald-300 border border-emerald-800/50">
                        Hoạt động
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-gray-400 whitespace-nowrap">
                    {formatDateTime(u.createdAt)}
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                    <button
                      onClick={() => setRoleModal({ open: true, user: u, roles: [...u.roles] })}
                      className="px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium"
                    >
                      Vai trò
                    </button>
                    {u.status === 'banned' ? (
                      <button
                        onClick={() => handleUnban(u)}
                        className="px-3 py-1 rounded bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-xs font-medium"
                      >
                        Mở khóa
                      </button>
                    ) : (
                      <button
                        onClick={() => setBanModal({ open: true, user: u, reason: '' })}
                        className="px-3 py-1 rounded bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 text-xs font-medium"
                      >
                        Khóa
                      </button>
                    )}
                  </td>
                </tr>
              ))}
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

      {/* Ban Modal */}
      {banModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#111722] border border-red-900/60 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-red-400">Đình Chỉ / Khóa Tài Khoản</h3>
            <p className="text-xs text-gray-300">
              Đình chỉ <strong className="text-white">{banModal.user?.displayName}</strong> ({banModal.user?.email}) sẽ vô hiệu hóa ngay lập tức toàn bộ phiên đăng nhập của người dùng.
            </p>
            <form onSubmit={handleBan} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-gray-400 mb-1">
                  Lý do đình chỉ *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ví dụ: Cố tình gian lận trong quá trình bàn giao giao dịch ký quỹ..."
                  value={banModal.reason}
                  onChange={(e) => setBanModal({ ...banModal, reason: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-red-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setBanModal({ open: false, user: null, reason: '' })}
                  className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 text-xs font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
                >
                  {actionLoading ? 'Đang xử lý...' : 'Xác Nhận Khóa Tài Khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Roles Modal */}
      {roleModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#111722] border border-gray-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Chỉnh Sửa Quyền Hạn & Vai Trò</h3>
            <p className="text-xs text-gray-400">
              Thiết lập các vai trò hệ thống cho <strong className="text-white">{roleModal.user?.displayName}</strong>:
            </p>
            <form onSubmit={handleSaveRoles} className="space-y-4">
              <div className="space-y-2">
                {[
                  { key: 'customer', label: 'Thành viên (Cơ bản)' },
                  { key: 'seller', label: 'Người bán (Seller)' },
                  { key: 'booster', label: 'Cày thuê (Booster)' },
                  { key: 'admin', label: 'Quản trị viên (Admin)' },
                ].map(({ key, label }) => {
                  const isChecked = roleModal.roles.includes(key);
                  return (
                    <label
                      key={key}
                      className="flex items-center justify-between p-3 rounded-xl bg-gray-900 border border-gray-800 cursor-pointer"
                    >
                      <span className="text-sm font-semibold text-white">
                        {label}
                      </span>
                      <input
                        type="checkbox"
                        disabled={key === 'customer'}
                        checked={isChecked}
                        onChange={() => toggleRole(key)}
                        className="w-4 h-4 rounded text-red-600 focus:ring-red-500 bg-gray-800 border-gray-700"
                      />
                    </label>
                  );
                })}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRoleModal({ open: false, user: null, roles: [] })}
                  className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 text-xs font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
                >
                  {actionLoading ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
