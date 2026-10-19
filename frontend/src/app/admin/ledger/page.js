'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatEUR, formatDateTime } from '@/lib/utils';
import {
  WalletIcon,
  ShieldIcon,
  RefreshIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
} from '@/components/Icons';

export default function AdminLedgerPage() {
  const [activeTab, setActiveTab] = useState('ledger'); // 'ledger' | 'audit'

  // Ledger state
  const [txs, setTxs] = useState([]);
  const [txPagination, setTxPagination] = useState({ total: 0, pages: 1 });
  const [txPage, setTxPage] = useState(1);
  const [txTypeFilter, setTxTypeFilter] = useState('');

  // Reconcile state
  const [reconcile, setReconcile] = useState(null);
  const [reconciling, setReconciling] = useState(false);

  // Audit state
  const [audits, setAudits] = useState([]);
  const [auditPagination, setAuditPagination] = useState({ total: 0, pages: 1 });
  const [auditPage, setAuditPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (activeTab === 'ledger') {
      loadLedger();
      runReconciliation();
    } else {
      loadAudits();
    }
  }, [activeTab, txPage, txTypeFilter, auditPage]);

  const loadLedger = async () => {
    try {
      setLoading(true);
      setError('');
      let url = `/admin/ledger?page=${txPage}&limit=25`;
      if (txTypeFilter) url += `&type=${txTypeFilter}`;
      const res = await api.get(url);
      setTxs(res.items || []);
      setTxPagination(res.pagination || { total: res.items?.length || 0, pages: 1 });
    } catch (err) {
      setError(err.message || 'Failed to load ledger records');
    } finally {
      setLoading(false);
    }
  };

  const runReconciliation = async () => {
    try {
      setReconciling(true);
      const res = await api.get('/admin/ledger/reconcile');
      setReconcile(res);
    } catch (err) {
      console.error(err);
    } finally {
      setReconciling(false);
    }
  };

  const loadAudits = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/admin/audit-logs?page=${auditPage}&limit=30`);
      setAudits(res.items || []);
      setAuditPagination(res.pagination || { total: res.items?.length || 0, pages: 1 });
    } catch (err) {
      setError(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-800/80 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <WalletIcon className="w-7 h-7 text-red-400" />
            Sổ Cái Tài Chính & Nhật Ký Kiểm Toán Bảo Mật
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Kiểm chứng kế toán kép zero-sum và lịch sử hành động quản trị chống làm giả.
          </p>
        </div>

        <button
          onClick={() => (activeTab === 'ledger' ? loadLedger() : loadAudits())}
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

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-800 pb-3">
        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition ${
            activeTab === 'ledger'
              ? 'bg-red-950 text-red-200 border border-red-800'
              : 'bg-gray-900 text-gray-400 hover:text-white'
          }`}
        >
          Sổ Cái Kép
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition ${
            activeTab === 'audit'
              ? 'bg-red-950 text-red-200 border border-red-800'
              : 'bg-gray-900 text-gray-400 hover:text-white'
          }`}
        >
          Nhật Ký Kiểm Toán
        </button>
      </div>

      {activeTab === 'ledger' ? (
        <div className="space-y-6">
          {/* Automated Ledger Reconciliation Card */}
          {reconcile && (
            <div className="p-6 rounded-2xl bg-[#111722]/90 border border-emerald-900/50 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircleIcon className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Kiểm toán tính toàn vẹn sổ cái: {reconcile.mismatches?.length === 0 ? 'Cân Bằng Hợp Lệ' : 'PHÁT HIỆN LỆCH BÚT TOÁN'}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5 font-mono">
                      {reconcile.walletsChecked} ví người dùng đã được đối soát với các tài khoản giao dịch kép.
                    </p>
                  </div>
                </div>

                <button
                  onClick={runReconciliation}
                  disabled={reconciling}
                  className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-mono border border-gray-700"
                >
                  {reconciling ? 'Đang đối soát...' : 'Đối soát lại các ví'}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono border-t border-gray-800/60 pt-4">
                <div>
                  <span className="text-gray-500 block">Tổng Ký Quỹ Ghi Nhận</span>
                  <span className="text-white font-bold">{formatEUR(reconcile.escrowHeld)}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Tổng Tiền Ví Đang Giữ</span>
                  <span className="text-white font-bold">{formatEUR(reconcile.walletsHeld)}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Ký Quỹ vs Ví Tiền</span>
                  <span className={`font-bold ${reconcile.escrowMatchesWallets ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {reconcile.escrowMatchesWallets ? 'KHỚP CHÍNH XÁC 100%' : 'BỊ LỆCH'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">Số Tài Khoản Lệch</span>
                  <span className={`font-bold ${reconcile.mismatches?.length === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {reconcile.mismatches?.length || 0} lỗi
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Filter Type */}
          <div className="flex flex-wrap gap-2 text-xs font-mono">
            {[
              { id: '', label: `TẤT CẢ (${txPagination.total})` },
              { id: 'deposit', label: 'NẠP TIỀN' },
              { id: 'escrow_hold', label: 'GIỮ KÝ QUỸ' },
              { id: 'escrow_release', label: 'GIẢI NGÂN' },
              { id: 'escrow_refund', label: 'HOÀN TIỀN' },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => { setTxTypeFilter(id); setTxPage(1); }}
                className={`px-3 py-1.5 rounded-lg transition ${
                  txTypeFilter === id
                    ? 'bg-purple-900/60 text-purple-200 border border-purple-700 font-bold'
                    : 'bg-gray-900 text-gray-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Ledger Table */}
          {loading ? (
            <div className="text-center py-16 text-gray-500">
              <div className="inline-block w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p>Đang tải dữ liệu sổ cái...</p>
            </div>
          ) : txs.length === 0 ? (
            <div className="text-center py-16 p-8 rounded-2xl bg-[#111722]/60 border border-gray-800/80 text-gray-500">
              Không có giao dịch nào được ghi nhận.
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-[#111722]/80 border border-gray-800/80 overflow-x-auto space-y-4">
              <table className="w-full text-left text-xs font-mono text-gray-300">
                <thead className="bg-gray-900/70 text-gray-400 uppercase border-b border-gray-800">
                  <tr>
                    <th className="py-3 px-3">Mã Bút Toán / Loại</th>
                    <th className="py-3 px-3">Đơn Hàng / Ghi Chú</th>
                    <th className="py-3 px-3">Các Bên</th>
                    <th className="py-3 px-3">Số Tiền</th>
                    <th className="py-3 px-3">Chi Tiết Bút Toán Kép</th>
                    <th className="py-3 px-3 text-right">Thời Gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {txs.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-800/30">
                      <td className="py-3 px-3">
                        <div className="font-bold uppercase text-purple-300">{t.type}</div>
                        <div className="text-[10px] text-gray-500">{t.id.slice(-8)}</div>
                      </td>
                      <td className="py-3 px-3 max-w-xs">
                        {t.order ? (
                          <Link href={`/orders/${t.order.id}`} className="text-purple-400 hover:underline font-bold">
                            {t.order.orderNumber}
                          </Link>
                        ) : null}
                        <div className="text-gray-400 text-[11px] truncate">{t.memo}</div>
                      </td>
                      <td className="py-3 px-3 text-gray-300">
                        {t.users?.join(', ') || 'Hệ thống'}
                      </td>
                      <td className="py-3 px-3 font-bold text-white whitespace-nowrap">
                        {formatEUR(t.amount)}
                      </td>
                      <td className="py-3 px-3">
                        <div className="space-y-0.5 text-[10px]">
                          {t.entries?.map((e, idx) => (
                            <div key={idx} className="flex justify-between gap-3 text-gray-400">
                              <span className="truncate max-w-[180px]">{e.account}</span>
                              <span className={e.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                {e.amount >= 0 ? `+${(e.amount / 100).toFixed(2)}` : (e.amount / 100).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right text-gray-500 whitespace-nowrap">
                        {formatDateTime(t.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {txPagination.pages > 1 && (
                <div className="flex justify-center items-center gap-2 pt-4">
                  <button
                    disabled={txPage <= 1}
                    onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-xs disabled:opacity-40"
                  >
                    Trang trước
                  </button>
                  <span className="text-xs text-gray-400 font-mono">
                    Trang {txPage} / {txPagination.pages}
                  </span>
                  <button
                    disabled={txPage >= txPagination.pages}
                    onClick={() => setTxPage((p) => Math.min(txPagination.pages, p + 1))}
                    className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-xs disabled:opacity-40"
                  >
                    Trang sau
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Audit Logs Tab */
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-16 text-gray-500">
              <div className="inline-block w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p>Đang tải nhật ký kiểm toán...</p>
            </div>
          ) : audits.length === 0 ? (
            <div className="text-center py-16 p-8 rounded-2xl bg-[#111722]/60 border border-gray-800/80 text-gray-500">
              Không có nhật ký kiểm toán nào.
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-[#111722]/80 border border-gray-800/80 overflow-x-auto space-y-4">
              <table className="w-full text-left text-xs font-mono text-gray-300">
                <thead className="bg-gray-900/70 text-gray-400 uppercase border-b border-gray-800">
                  <tr>
                    <th className="py-3 px-3">Hành Động</th>
                    <th className="py-3 px-3">Tác Nhân</th>
                    <th className="py-3 px-3">Đối Tượng</th>
                    <th className="py-3 px-3">Chi Tiết / Meta</th>
                    <th className="py-3 px-3">Địa Chỉ IP</th>
                    <th className="py-3 px-3 text-right">Thời Gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {audits.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-800/30">
                      <td className="py-3 px-3 font-bold text-red-300">{a.action}</td>
                      <td className="py-3 px-3 text-white">
                        {a.actor} <span className="text-gray-500 uppercase">({a.actorRole})</span>
                      </td>
                      <td className="py-3 px-3 text-gray-400">
                        {a.targetType}: {a.targetId ? String(a.targetId).slice(-6) : '—'}
                      </td>
                      <td className="py-3 px-3 text-gray-400 max-w-xs truncate">
                        {a.meta ? JSON.stringify(a.meta) : '—'}
                      </td>
                      <td className="py-3 px-3 text-gray-500">{a.ip || '127.0.0.1'}</td>
                      <td className="py-3 px-3 text-right text-gray-500 whitespace-nowrap">
                        {formatDateTime(a.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {auditPagination.pages > 1 && (
                <div className="flex justify-center items-center gap-2 pt-4">
                  <button
                    disabled={auditPage <= 1}
                    onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-xs disabled:opacity-40"
                  >
                    Trang trước
                  </button>
                  <span className="text-xs text-gray-400 font-mono">
                    Trang {auditPage} / {auditPagination.pages}
                  </span>
                  <button
                    disabled={auditPage >= auditPagination.pages}
                    onClick={() => setAuditPage((p) => Math.min(auditPagination.pages, p + 1))}
                    className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-xs disabled:opacity-40"
                  >
                    Trang sau
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
