'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { formatEUR, formatDate } from '@/lib/utils';
import {
  WalletIcon,
  ShieldIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ClockIcon,
  ArrowRightIcon,
} from '@/components/Icons';

export default function WalletPage() {
  const router = useRouter();
  const { user, wallet, refreshWallet } = useAuth();

  const [walletInfo, setWalletInfo] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [pendingIncome, setPendingIncome] = useState([]);
  const [loading, setLoading] = useState(true);

  // Deposit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [customAmount, setCustomAmount] = useState('25');
  const [depositing, setDepositing] = useState(false);
  const [depositMsg, setDepositMsg] = useState('');
  const [depositError, setDepositError] = useState('');

  const loadData = async () => {
    try {
      const [wRes, txRes, pendRes] = await Promise.all([
        apiRequest('/api/wallet'),
        apiRequest('/api/wallet/transactions?limit=25'),
        apiRequest('/api/wallet/pending'),
      ]);
      setWalletInfo(wRes);
      setTransactions(txRes.items || []);
      setPendingIncome(pendRes.items || []);
    } catch (err) {
      console.error('Failed to load wallet data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      router.push('/login?redirect=/wallet');
      return;
    }
    loadData();
  }, [user, router]);

  const handleDeposit = async (amountEuros) => {
    setDepositing(true);
    setDepositError('');
    setDepositMsg('');

    const cents = Math.round(parseFloat(amountEuros) * 100);
    if (isNaN(cents) || cents < 100) {
      setDepositError('Số tiền nạp tối thiểu là 1,00 €');
      setDepositing(false);
      return;
    }

    try {
      const idempotencyKey = `dep_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const res = await apiRequest('/api/wallet/deposits', {
        method: 'POST',
        body: JSON.stringify({
          amount: cents,
          idempotencyKey,
        }),
      });

      setDepositMsg(`Đã nạp thành công ${formatEUR(cents)} vào ví thử nghiệm!`);
      await refreshWallet();
      await loadData();
      setTimeout(() => {
        setModalOpen(false);
        setDepositMsg('');
      }, 1200);
    } catch (err) {
      setDepositError(err.message || 'Nạp tiền thất bại');
    } finally {
      setDepositing(false);
    }
  };

  if (!user || loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center text-gray-400">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm">Đang tải sổ cái ví tiền...</p>
      </div>
    );
  }

  const w = walletInfo?.wallet || wallet || { available: 0, held: 0, pendingIncome: 0 };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Ví Ký Quỹ & Số Dư</h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Số dư kế toán kép, tiền giữ ký quỹ và giao dịch nạp thử nghiệm
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <WalletIcon className="w-4 h-4" />
          <span>+ Nạp Tiền Thử Nghiệm</span>
        </button>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* 1. Available */}
        <div className="bg-[#111722] border border-gray-800 rounded-2xl p-6 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span className="font-mono uppercase font-semibold">Số Dư Khả Dụng</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          </div>
          <div className="text-3xl font-black text-white">
            {formatEUR(w.available)}
          </div>
          <p className="text-[11px] text-gray-400 pt-1">
            Sẵn sàng để mua ngay các tin rao hoặc thanh toán đơn hàng.
          </p>
        </div>

        {/* 2. Held in Escrow */}
        <div className="bg-[#111722] border border-gray-800 rounded-2xl p-6 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span className="font-mono uppercase font-semibold">Đang Khóa Ký Quỹ</span>
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
          </div>
          <div className="text-3xl font-black text-purple-300">
            {formatEUR(w.held)}
          </div>
          <p className="text-[11px] text-gray-400 pt-1">
            Đang giữ cho các đơn mua chờ người bán giao hàng và xác nhận.
          </p>
        </div>

        {/* 3. Pending Income */}
        <div className="bg-[#111722] border border-gray-800 rounded-2xl p-6 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span className="font-mono uppercase font-semibold">Doanh Thu Chờ Giải Ngân</span>
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
          </div>
          <div className="text-3xl font-black text-blue-300">
            {formatEUR(w.pendingIncome)}
          </div>
          <p className="text-[11px] text-gray-400 pt-1">
            Tiền người mua ký quỹ cho đơn bán của bạn. Sẽ cộng vào ví khi người mua xác nhận.
          </p>
        </div>
      </div>

      {/* Real Payouts Disclaimer Note */}
      <div className="p-4 rounded-xl bg-[#131926] border border-gray-800 text-xs text-gray-400 flex items-start gap-3">
        <ShieldIcon className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-gray-200">Chính Sách Thanh Toán Thử Nghiệm:</strong> Dự án áp dụng kế toán số nguyên (cents), ghi sổ nhật ký kế toán kép và nạp tiền giả lập an toàn. Tính năng rút tiền về ngân hàng thực tế không áp dụng trong bản thử nghiệm này.
        </div>
      </div>

      {/* Double-Entry Transaction Ledger Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white tracking-tight">Sổ Cái Giao Dịch Kế Toán Kép</h2>
          <span className="text-xs text-gray-400 font-mono">
            Hiển thị {transactions.length} bản ghi gần nhất
          </span>
        </div>

        <div className="bg-[#111722] border border-gray-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-900/60 border-b border-gray-800 text-gray-400 uppercase font-mono text-[10px]">
                <tr>
                  <th className="py-3 px-4">Loại Giao Dịch</th>
                  <th className="py-3 px-4">Đơn Hàng / Tham Chiếu</th>
                  <th className="py-3 px-4">Diễn Giải</th>
                  <th className="py-3 px-4 text-right">Khả Dụng</th>
                  <th className="py-3 px-4 text-right">Ký Quỹ</th>
                  <th className="py-3 px-4 text-right">Ngày Giao Dịch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-gray-300">
                {transactions.length > 0 ? (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-[#161f2e] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase ${
                            tx.type === 'deposit'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                              : tx.type === 'escrow_hold'
                              ? 'bg-purple-950 text-purple-400 border border-purple-800/40'
                              : tx.type === 'escrow_release'
                              ? 'bg-blue-950 text-blue-400 border border-blue-800/40'
                              : 'bg-amber-950 text-amber-400 border border-amber-800/40'
                          }`}
                        >
                          {tx.type === 'deposit' ? 'Nạp tiền' : tx.type === 'escrow_hold' ? 'Giữ ký quỹ' : tx.type === 'escrow_release' ? 'Giải ngân' : 'Hoàn tiền'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-gray-400">
                        {tx.order ? (
                          <Link href={`/orders/${tx.order.id}`} className="text-purple-400 hover:underline">
                            {tx.order.orderNumber}
                          </Link>
                        ) : (
                          tx.provider ? `Bộ mô phỏng: ${tx.provider}` : '—'
                        )}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate text-gray-300">
                        {tx.memo || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold">
                        {tx.availableDelta !== 0 ? (
                          <span className={tx.availableDelta > 0 ? 'text-emerald-400' : 'text-red-400'}>
                            {tx.availableDelta > 0 ? '+' : ''}{formatEUR(tx.availableDelta)}
                          </span>
                        ) : (
                          <span className="text-gray-500">0,00 €</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold">
                        {tx.heldDelta !== 0 ? (
                          <span className={tx.heldDelta > 0 ? 'text-purple-400' : 'text-gray-400'}>
                            {tx.heldDelta > 0 ? '+' : ''}{formatEUR(tx.heldDelta)}
                          </span>
                        ) : (
                          <span className="text-gray-500">0,00 €</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right text-gray-400 font-mono text-[11px]">
                        {formatDate(tx.createdAt)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500 text-xs">
                      Chưa có giao dịch tài chính nào được ghi nhận trên tài khoản này.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Demo Deposit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111722] border border-gray-700 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="border-b border-gray-800 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <WalletIcon className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base text-white">Nạp Tiền Vào Ví Thử Nghiệm</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Mandatory Demo Label */}
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-xs text-amber-200">
              <strong className="text-amber-300 block mb-0.5">Thanh toán thử nghiệm — không dùng tiền thật:</strong>
              Bộ mô phỏng này sẽ cộng tiền EUR thử nghiệm vào ví để bạn trải nghiệm trọn vẹn chu trình mua bán, ký quỹ và giải ngân.
            </div>

            {depositMsg && (
              <div className="p-3 rounded-lg bg-emerald-950 border border-emerald-500/40 text-xs text-emerald-300">
                {depositMsg}
              </div>
            )}

            {depositError && (
              <div className="p-3 rounded-lg bg-red-950 border border-red-500/40 text-xs text-red-300">
                {depositError}
              </div>
            )}

            {/* Preset Amount Buttons */}
            <div>
              <span className="block text-xs font-medium text-gray-300 mb-2">Chọn nhanh mức tiền</span>
              <div className="grid grid-cols-4 gap-2">
                {['10', '25', '50', '100'].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleDeposit(amt)}
                    disabled={depositing}
                    className="py-2.5 rounded-xl bg-gray-800 hover:bg-purple-600 hover:text-white border border-gray-700 font-bold text-xs text-gray-200 transition-colors"
                  >
                    + {amt} €
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Amount Input */}
            <div className="pt-2">
              <label className="block text-xs font-medium text-gray-300 mb-1.5">Hoặc nhập số tiền tùy ý (€ EUR)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  max="1000"
                  step="1"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="25"
                  className="flex-1 bg-[#161f2e] border border-gray-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-purple-500 font-mono"
                />
                <button
                  type="button"
                  disabled={depositing}
                  onClick={() => handleDeposit(customAmount)}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs transition-colors"
                >
                  {depositing ? 'Đang nạp...' : 'Nạp Tiền'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
