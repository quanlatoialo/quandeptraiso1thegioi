'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { formatEUR, formatDateTime, getStatusBadge } from '@/lib/utils';
import {
  AlertTriangleIcon,
  ShieldIcon,
  CheckCircleIcon,
  ClockIcon,
  ChevronRightIcon,
  RefreshIcon,
  UserIcon,
} from '@/components/Icons';

export default function DisputeArbitrationPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Ruling state
  const [decision, setDecision] = useState('refund_buyer');
  const [note, setNote] = useState('');
  const [restock, setRestock] = useState(false);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    loadCase();
  }, [params.id]);

  const loadCase = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/admin/disputes/${params.id}`);
      setData(res);
      if (res.canRestock) {
        setRestock(true);
      }
    } catch (err) {
      setError(err.message || 'Failed to load arbitration case');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (e) => {
    e.preventDefault();
    if (note.trim().length < 5) {
      alert('Vui lòng cung cấp căn cứ phán quyết có độ dài tối thiểu 5 ký tự.');
      return;
    }
    const confirmMsg =
      decision === 'refund_buyer'
        ? 'Bạn có chắc chắn muốn PHÁN QUYẾT CÓ LỢI CHO NGƯỜI MUA?\n\nHệ thống sẽ thực hiện hoàn trả 100% tiền ký quỹ qua bút toán sổ cái kép về ví người mua.'
        : 'Bạn có chắc chắn muốn PHÁN QUYẾT CÓ LỢI CHO NGƯỜI BÁN?\n\nHệ thống sẽ giải ngân tiền ký quỹ cho người bán và trích khấu trừ phí sàn theo sổ cái kép.';

    if (!confirm(confirmMsg)) return;

    try {
      setResolving(true);
      await api.post(`/admin/disputes/${params.id}/resolve`, {
        decision,
        note: note.trim(),
        restock,
      });
      alert('Khiếu nại đã được phán quyết và quyết toán sổ cái thành công!');
      await loadCase();
    } catch (err) {
      alert(err.message || 'Không thể thi hành phán quyết');
    } finally {
      setResolving(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-gray-500">
        <div className="inline-block w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p>Đang truy xuất hồ sơ tranh chấp & bằng chứng...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-sm">
          {error || 'Không tìm thấy hồ sơ khiếu nại'}
        </div>
        <Link href="/admin/disputes" className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 text-xs inline-block">
          Quay lại danh sách khiếu nại
        </Link>
      </div>
    );
  }

  const { dispute, order, canRestock, messages = [], ledger = [] } = data;
  const isResolved = dispute.status === 'resolved';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-gray-400 mb-1">
            <Link href="/admin/disputes" className="hover:text-rose-400">Khiếu nại</Link>
            <ChevronRightIcon className="w-3.5 h-3.5" />
            <span className="text-white">Hồ sơ #{dispute.id.slice(-6)}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <AlertTriangleIcon className="w-7 h-7 text-rose-500" />
            Bảng Điều Khiển Trọng Tài Phán Quyết
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Tranh chấp đơn hàng ký quỹ <span className="font-mono text-white font-bold">{order?.orderNumber}</span> ({formatEUR(order?.total || 0)})
          </p>
        </div>

        <button
          onClick={loadCase}
          className="p-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition border border-gray-700 self-start sm:self-auto"
          title="Làm mới"
        >
          <RefreshIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Main Grid: Evidence & Ruling */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 cols): Details, Messages, Ledger */}
        <div className="lg:col-span-2 space-y-6">
          {/* Case Dossier */}
          <div className="p-6 rounded-2xl bg-[#111722]/80 border border-gray-800/80 space-y-4">
            <h2 className="text-base font-bold text-white border-b border-gray-800/60 pb-3 flex items-center justify-between">
              <span>Hồ Sơ Trọng Tài Vụ Việc</span>
              <span
                className={`text-xs uppercase font-mono px-2 py-0.5 rounded font-bold ${
                  isResolved
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-rose-950 text-rose-300 border border-rose-800'
                }`}
              >
                {isResolved ? 'Đã giải quyết' : 'Đang thụ lý'}
              </span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div>
                <span className="text-gray-500 block">Người mua</span>
                <span className="text-white font-bold">{order?.buyer?.displayName || 'Người mua'}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Người bán</span>
                <span className="text-white font-bold">{order?.seller?.displayName || 'Người bán'}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Mở bởi</span>
                <span className="text-rose-400 font-bold uppercase">{dispute.openedByRole === 'buyer' ? 'Người mua' : dispute.openedByRole === 'seller' ? 'Người bán' : dispute.openedByRole}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Thời gian nộp</span>
                <span className="text-gray-300">{formatDateTime(dispute.createdAt)}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gray-900/80 border border-gray-800 space-y-1">
              <span className="text-xs font-mono uppercase text-gray-400">Nội dung khiếu nại chính thức:</span>
              <p className="text-sm text-rose-200 font-medium">"{dispute.reason}"</p>
            </div>
          </div>

          {/* Evidence Repository */}
          <div className="p-6 rounded-2xl bg-[#111722]/80 border border-gray-800/80 space-y-4">
            <h2 className="text-base font-bold text-white border-b border-gray-800/60 pb-3">
              Tài Liệu Bằng Chứng Đã Nộp ({dispute.evidence?.length || 0})
            </h2>

            {(!dispute.evidence || dispute.evidence.length === 0) ? (
              <div className="text-xs text-gray-500 italic py-2">
                Chưa có tài liệu bằng chứng đính kèm bổ sung.
              </div>
            ) : (
              <div className="space-y-3">
                {dispute.evidence.map((ev) => (
                  <div key={ev.id} className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold uppercase text-purple-300">
                        {ev.author} ({ev.role === 'buyer' ? 'Người mua' : ev.role === 'seller' ? 'Người bán' : ev.role})
                      </span>
                      <span className="text-gray-500">{formatDateTime(ev.at)}</span>
                    </div>
                    <p className="text-gray-200">{ev.text}</p>
                    {ev.attachments?.length > 0 && (
                      <div className="flex gap-2 pt-2">
                        {ev.attachments.map((att, i) => (
                          <a
                            key={i}
                            href={att}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-purple-300 font-mono text-[11px] underline"
                          >
                            Xem tệp bằng chứng #{i + 1}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chat Transcript */}
          <div className="p-6 rounded-2xl bg-[#111722]/80 border border-gray-800/80 space-y-4">
            <h2 className="text-base font-bold text-white border-b border-gray-800/60 pb-3">
              Biên Bản Đoạn Chat Phòng Đơn Hàng ({messages.length})
            </h2>

            {messages.length === 0 ? (
              <div className="text-xs text-gray-500 italic py-2">
                Không ghi nhận tin nhắn trò chuyện nào giữa hai bên.
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`p-3 rounded-xl border text-xs space-y-1 ${
                      m.senderRole === 'system'
                        ? 'bg-purple-950/20 border-purple-800/40 text-purple-300 font-mono'
                        : 'bg-gray-900/60 border-gray-800 text-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-white">
                        {m.sender} <span className="text-gray-500 font-mono uppercase">({m.senderRole === 'system' ? 'Hệ thống' : m.senderRole === 'buyer' ? 'Người mua' : m.senderRole === 'seller' ? 'Người bán' : m.senderRole})</span>
                      </span>
                      <span className="text-gray-500">{formatDateTime(m.createdAt)}</span>
                    </div>
                    <p className="whitespace-pre-line">{m.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ledger History */}
          <div className="p-6 rounded-2xl bg-[#111722]/80 border border-gray-800/80 space-y-4">
            <h2 className="text-base font-bold text-white border-b border-gray-800/60 pb-3">
              Nhật Ký Kiểm Toán Tài Chính Sổ Cái Kép
            </h2>

            {ledger.length === 0 ? (
              <div className="text-xs text-gray-500 italic py-2">
                Chưa có bút toán sổ cái nào được ghi nhận.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono text-gray-300">
                  <thead className="bg-gray-900/70 text-gray-500 uppercase border-b border-gray-800">
                    <tr>
                      <th className="py-2.5 px-3">Loại Giao Dịch</th>
                      <th className="py-2.5 px-3">Số Tiền</th>
                      <th className="py-2.5 px-3">Ghi Chú</th>
                      <th className="py-2.5 px-3 text-right">Thời Gian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {ledger.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-800/30">
                        <td className="py-2.5 px-3 font-bold text-purple-300">{tx.type}</td>
                        <td className="py-2.5 px-3 font-bold text-white">{formatEUR(tx.amount)}</td>
                        <td className="py-2.5 px-3 text-gray-400">{tx.memo}</td>
                        <td className="py-2.5 px-3 text-right text-gray-500">{formatDateTime(tx.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 col): Arbitration Console or Official Resolution */}
        <div className="space-y-6">
          {/* Order Summary Card */}
          <div className="p-6 rounded-2xl bg-[#111722]/80 border border-gray-800/80 space-y-3">
            <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
              Chi Tiết Đơn Hàng
            </h3>
            <div className="text-white font-semibold text-sm">
              {order?.offerSnapshot?.title}
            </div>
            <div className="space-y-1 text-xs font-mono text-gray-400 border-t border-gray-800/60 pt-3">
              <div className="flex justify-between">
                <span>Số lượng:</span>
                <span className="text-white">{order?.quantity}</span>
              </div>
              <div className="flex justify-between">
                <span>Tổng ký quỹ:</span>
                <span className="text-white font-bold">{formatEUR(order?.total || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Phí sàn:</span>
                <span className="text-gray-400">{formatEUR(order?.fee || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Thực nhận người bán:</span>
                <span className="text-emerald-400 font-bold">{formatEUR((order?.total || 0) - (order?.fee || 0))}</span>
              </div>
            </div>
            <div className="pt-2">
              <Link
                href={`/orders/${order?.id}`}
                target="_blank"
                className="w-full text-center block px-3 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium"
              >
                Xem phòng giao dịch ↗
              </Link>
            </div>
          </div>

          {/* Ruling Decision Section */}
          {isResolved ? (
            <div className="p-6 rounded-2xl bg-emerald-950/30 border border-emerald-800/50 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircleIcon className="w-5 h-5" />
                Đã Phán Quyết & Quyết Toán Hợp Lệ
              </div>
              <div className="text-xs font-mono space-y-1 text-gray-300">
                <div>Phán quyết: <strong className="uppercase text-emerald-300 font-bold">{dispute.resolution?.decision === 'refund_buyer' ? 'Hoàn tiền người mua' : dispute.resolution?.decision === 'release_seller' ? 'Giải ngân người bán' : dispute.resolution?.decision}</strong></div>
                <div>Thời gian giải quyết: {formatDateTime(dispute.resolution?.resolvedAt)}</div>
              </div>
              {dispute.resolution?.note && (
                <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800 text-xs text-gray-300 italic">
                  "{dispute.resolution.note}"
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-[#111722]/80 border border-rose-900/50 space-y-5">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldIcon className="w-5 h-5 text-rose-500" />
                Phán Quyết Trọng Tài
              </h3>

              <form onSubmit={handleResolve} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-gray-400 mb-2">
                    Quyết định xử lý *
                  </label>
                  <div className="space-y-2">
                    <label
                      className={`p-3 rounded-xl border flex flex-col gap-1 cursor-pointer transition ${
                        decision === 'refund_buyer'
                          ? 'bg-rose-950/40 border-rose-600 text-white'
                          : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white">Phán quyết cho Người Mua thắng</span>
                        <input
                          type="radio"
                          name="decision"
                          value="refund_buyer"
                          checked={decision === 'refund_buyer'}
                          onChange={() => setDecision('refund_buyer')}
                          className="text-rose-600"
                        />
                      </div>
                      <span className="text-[11px] text-gray-400">
                        Hoàn 100% {formatEUR(order?.total || 0)} tiền ký quỹ về ví người mua.
                      </span>
                    </label>

                    <label
                      className={`p-3 rounded-xl border flex flex-col gap-1 cursor-pointer transition ${
                        decision === 'release_seller'
                          ? 'bg-emerald-950/40 border-emerald-600 text-white'
                          : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white">Phán quyết cho Người Bán thắng</span>
                        <input
                          type="radio"
                          name="decision"
                          value="release_seller"
                          checked={decision === 'release_seller'}
                          onChange={() => setDecision('release_seller')}
                          className="text-emerald-600"
                        />
                      </div>
                      <span className="text-[11px] text-gray-400">
                        Giải ngân {formatEUR((order?.total || 0) - (order?.fee || 0))} về số dư khả dụng của người bán.
                      </span>
                    </label>
                  </div>
                </div>

                {/* Restock Toggle */}
                {canRestock && decision === 'refund_buyer' && (
                  <label className="flex items-start gap-2 p-3 rounded-xl bg-gray-900 border border-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={restock}
                      onChange={(e) => setRestock(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-rose-600 focus:ring-rose-500 bg-gray-800 border-gray-700"
                    />
                    <span className="text-xs text-gray-300">
                      Hoàn lại kho sản phẩm (+{order?.quantity} đơn vị trở lại kho của người bán)
                    </span>
                  </label>
                )}

                <div>
                  <label className="block text-xs font-mono uppercase text-gray-400 mb-1">
                    Căn cứ phán quyết chính thức * (tối thiểu 5 ký tự)
                  </label>
                  <textarea
                    rows={4}
                    required
                    minLength={5}
                    placeholder="Ghi nhận căn cứ từ trao đổi chat, tính xác thực việc bàn giao tài khoản và chính sách ký quỹ của sàn..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-rose-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={resolving}
                  className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase tracking-wider transition shadow-lg shadow-rose-900/40"
                >
                  {resolving ? 'Đang thực thi bút toán sổ cái...' : 'Thi Hành Phán Quyết Ký Quỹ'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
