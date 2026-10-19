'use client';
import { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { formatEUR, formatDate, STATUS_MAP } from '@/lib/utils';
import {
  ShieldIcon,
  CheckCircleIcon,
  ClockIcon,
  AlertCircleIcon,
  LockIcon,
  UserIcon,
} from '@/components/Icons';

export default function OrderDetailPage({ params }) {
  const unwrappedParams = use(params);
  const orderId = unwrappedParams.id;
  const router = useRouter();
  const { user, refreshWallet } = useAuth();

  const [order, setOrder] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  // Modals state
  const [deliverModal, setDeliverModal] = useState(false);
  const [deliveryNote, setDeliveryNote] = useState('');
  const [disputeModal, setDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [reviewModal, setReviewModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  const chatBottomRef = useRef(null);

  const loadOrderAndMessages = async () => {
    try {
      const [ordRes, msgRes] = await Promise.all([
        apiRequest(`/api/orders/${orderId}`),
        apiRequest(`/api/orders/${orderId}/messages`),
      ]);
      setOrder(ordRes.order);
      setMessages(msgRes.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      router.push(`/login?redirect=/orders/${orderId}`);
      return;
    }
    loadOrderAndMessages();

    // In-order chat polling every 4s
    const interval = setInterval(async () => {
      try {
        const msgRes = await apiRequest(`/api/orders/${orderId}/messages`);
        setMessages(msgRes.items || []);
      } catch {
        // silent polling catch
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [user, orderId, router]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleAction = async (endpoint, payload = {}) => {
    setActionLoading(true);
    setError('');
    try {
      const res = await apiRequest(`/api/orders/${orderId}/${endpoint}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setOrder(res.order);
      await refreshWallet();
      await loadOrderAndMessages();
    } catch (err) {
      setError(err.message || 'Action failed');
    } finally {
      setActionLoading(false);
      setDeliverModal(false);
      setDisputeModal(false);
      setCancelModal(false);
      setReviewModal(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    try {
      const res = await apiRequest(`/api/orders/${orderId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: newMessage.trim() }),
      });
      setMessages((prev) => [...prev, res.message]);
      setNewMessage('');
    } catch (err) {
      setError(err.message || 'Failed to send message');
    }
  };

  if (!user || loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center text-gray-400">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm">Đang tải phòng giao dịch đơn hàng...</p>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center text-gray-400 space-y-4">
        <h1 className="text-xl font-bold text-white">Không Thể Truy Cập Đơn Hàng</h1>
        <p className="text-sm">{error || 'Bạn không có quyền truy cập vào đơn hàng này.'}</p>
        <Link href="/orders" className="inline-block px-4 py-2 rounded-lg bg-purple-600 text-white text-xs font-semibold">
          Quay lại danh sách đơn hàng
        </Link>
      </div>
    );
  }

  const role = order.viewerRole; // 'buyer' | 'seller' | 'admin'
  const roleNameMap = {
    buyer: 'Người mua',
    seller: 'Người bán',
    admin: 'Quản trị viên',
  };
  const roleDisplay = roleNameMap[role] || role;
  const st = STATUS_MAP[order.status] || { label: order.status, bg: 'bg-gray-800', text: 'text-gray-300' };

  // Stepper logic
  const steps = [
    { id: 'funded', label: 'Tiền Đã Ký Quỹ' },
    { id: 'in_progress', label: 'Đang Thực Hiện' },
    { id: 'awaiting_customer_confirmation', label: 'Đã Bàn Giao' },
    { id: 'completed', label: 'Giải Ngân & Xong' },
  ];

  const currentStepIdx =
    order.status === 'funded'
      ? 0
      : order.status === 'in_progress'
      ? 1
      : order.status === 'awaiting_customer_confirmation'
      ? 2
      : order.status === 'completed'
      ? 3
      : -1;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Đơn hàng {order.orderNumber}
            </h1>
            <span
              className={`text-xs font-mono uppercase font-semibold px-2.5 py-0.5 rounded border ${st.bg} ${st.text} ${st.border}`}
            >
              {st.label}
            </span>
          </div>
          <p className="text-xs text-gray-400 font-mono">
            Khởi tạo lúc {formatDate(order.createdAt)} • Vai trò của bạn: <strong className="text-purple-300 uppercase">{roleDisplay}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {order.disputeId && (
            <Link
              href={role === 'admin' ? `/admin/disputes/${order.disputeId}` : `/orders/${order.id}#dispute`}
              className="px-3 py-1.5 rounded-lg bg-red-950 border border-red-800/60 text-red-300 text-xs font-semibold"
            >
              ⚠ Đang có khiếu nại xử lý
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-950/70 border border-red-500/30 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Escrow Progress Stepper (for normal happy flow) */}
      {!['cancelled', 'refunded', 'disputed'].includes(order.status) && (
        <div className="bg-[#111722] border border-gray-800 rounded-2xl p-6">
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            {steps.map((step, idx) => {
              const done = currentStepIdx >= idx;
              const current = currentStepIdx === idx;
              return (
                <div key={step.id} className="space-y-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      done ? 'bg-purple-600' : 'bg-gray-800'
                    }`}
                  />
                  <span
                    className={`block font-semibold ${
                      current ? 'text-purple-300' : done ? 'text-gray-200' : 'text-gray-600'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Grid: Details + Chat Room */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Order Summary, Handover Box & Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Snapshot & Price Card */}
          <div className="bg-[#111722] border border-gray-800 rounded-2xl p-6 space-y-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
              Chi Tiết Sản Phẩm Đã Mua
            </h2>

            <div className="flex flex-col sm:flex-row items-start justify-between gap-4 p-4 rounded-xl bg-gray-900/50 border border-gray-800">
              <div className="space-y-1">
                <span className="text-xs text-purple-400 font-semibold uppercase">
                  {order.offerSnapshot?.gameName} • {order.offerSnapshot?.type}
                </span>
                <h3 className="font-bold text-base text-white">
                  {order.offerSnapshot?.title}
                </h3>
                <div className="text-xs text-gray-400 pt-1">
                  Người mua: <strong className="text-white">{order.buyer?.displayName}</strong> | Người bán: <strong className="text-white">{order.seller?.displayName}</strong>
                </div>
              </div>

              <div className="text-right sm:border-l sm:border-gray-800 sm:pl-6 shrink-0 w-full sm:w-auto">
                <span className="text-xs text-gray-400 block">Két Ký Quỹ Đảm Bảo</span>
                <span className="text-2xl font-black text-white block">
                  {formatEUR(order.total)}
                </span>
                <span className="text-[11px] text-gray-400 font-mono">
                  {order.quantity} × {formatEUR(order.offerSnapshot?.unitPrice)}
                </span>
              </div>
            </div>

            {/* Handover Credentials Area (Private to Buyer, Seller & Dispute Admin) */}
            <div className="p-5 rounded-xl bg-gray-950 border border-purple-900/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LockIcon className="w-4 h-4 text-purple-400" />
                  <h4 className="font-bold text-xs uppercase tracking-wider text-white">
                    Hòm Bàn Giao Bảo Mật & Thông Tin Đăng Nhập
                  </h4>
                </div>
                {order.delivery?.deliveredAt && (
                  <span className="text-[10px] text-gray-400 font-mono">
                    Đã bàn giao: {formatDate(order.delivery.deliveredAt)}
                  </span>
                )}
              </div>

              {order.delivery?.note ? (
                <div className="p-3.5 rounded-lg bg-gray-900 border border-gray-800 font-mono text-xs text-emerald-300 whitespace-pre-wrap selection:bg-purple-600">
                  {order.delivery.note}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">
                  {role === 'seller'
                    ? 'Nhấp nút "Bàn Giao & Gửi Thông Tin" bên dưới để nhập tài khoản, mật khẩu hoặc ghi chú dịch vụ cho người mua.'
                    : 'Người bán chưa gửi thông tin bàn giao. Khi người bán gửi, thông tin tài khoản sẽ hiển thị an toàn tại đây.'}
                </p>
              )}
            </div>

            {/* Action Buttons Box */}
            <div className="pt-4 border-t border-gray-800 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Thao Tác Khả Dụng Cho Đơn Hàng
              </h4>

              <div className="flex flex-wrap gap-3">
                {/* 1. Buyer: Confirm receipt & release funds */}
                {role === 'buyer' && order.status === 'awaiting_customer_confirmation' && (
                  <button
                    disabled={actionLoading}
                    onClick={() => handleAction('confirm')}
                    className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/50 flex items-center gap-2"
                  >
                    <CheckCircleIcon className="w-4 h-4" />
                    <span>Xác Nhận Đã Nhận Đủ & Giải Ngân Cho Người Bán</span>
                  </button>
                )}

                {/* 2. Seller: Mark as delivered */}
                {role === 'seller' && ['funded', 'in_progress'].includes(order.status) && (
                  <button
                    disabled={actionLoading}
                    onClick={() => setDeliverModal(true)}
                    className="px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-950/50 flex items-center gap-2"
                  >
                    <CheckCircleIcon className="w-4 h-4" />
                    <span>Bàn Giao & Gửi Thông Tin Cho Người Mua</span>
                  </button>
                )}

                {/* 3. Seller: Start work */}
                {role === 'seller' && order.status === 'funded' && (
                  <button
                    disabled={actionLoading}
                    onClick={() => handleAction('start')}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs"
                  >
                    Bắt Đầu Thực Hiện Đơn
                  </button>
                )}

                {/* 4. Buyer: Pay unpaid order */}
                {role === 'buyer' && order.status === 'pending_payment' && (
                  <button
                    disabled={actionLoading}
                    onClick={() => handleAction('pay')}
                    className="px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
                  >
                    Thanh Toán Từ Ví Ký Quỹ
                  </button>
                )}

                {/* 5. Cancel order */}
                {order.allowedActions?.some((a) => a.startsWith('cancel')) && (
                  <button
                    disabled={actionLoading}
                    onClick={() => setCancelModal(true)}
                    className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-red-950 hover:text-red-300 text-gray-300 text-xs font-semibold transition-colors"
                  >
                    Hủy Đơn Hàng
                  </button>
                )}

                {/* 6. Open Dispute */}
                {['funded', 'in_progress', 'awaiting_customer_confirmation'].includes(order.status) && (
                  <button
                    disabled={actionLoading}
                    onClick={() => setDisputeModal(true)}
                    className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-amber-950 hover:text-amber-300 text-gray-300 text-xs font-semibold transition-colors"
                  >
                    Khiếu Nại Lên Quản Trị
                  </button>
                )}

                {/* 7. Leave Review */}
                {role === 'buyer' && order.status === 'completed' && !order.reviewed && (
                  <button
                    onClick={() => setReviewModal(true)}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs"
                  >
                    ★ Đánh Giá Người Bán
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Timeline Audit History */}
          <div className="bg-[#111722] border border-gray-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Nhật Ký Trạng Thái (Audit Log)
            </h3>
            <div className="space-y-2 text-xs">
              {order.history?.map((h, idx) => (
                <div key={idx} className="flex items-start gap-3 py-1.5 border-b border-gray-900 last:border-0">
                  <span className="w-2 h-2 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <span className="font-semibold text-white font-mono uppercase text-[11px] mr-2">
                      {STATUS_MAP[h.to]?.label || h.to}
                    </span>
                    <span className="text-gray-400 text-[11px]">{h.note}</span>
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {formatDate(h.at)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: In-Order Live Chat Room */}
        <div className="bg-[#111722] border border-gray-800 rounded-2xl p-5 flex flex-col h-[650px] shadow-xl">
          <div className="border-b border-gray-800 pb-3 flex items-center justify-between">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Kênh Chat Trực Tiếp Đơn Hàng
            </h3>
            <span className="text-[10px] text-gray-400 font-mono">Mã Hóa & Kiểm Toán</span>
          </div>

          {/* Chat Messages Log */}
          <div className="flex-1 overflow-y-auto py-4 space-y-3">
            {messages.length > 0 ? (
              messages.map((m) => {
                const isMe = String(m.sender?.id) === String(user._id);
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mb-1">
                      <span className="font-semibold text-gray-300">{m.sender?.displayName}</span>
                      <span className="uppercase font-mono text-[9px] px-1 rounded bg-gray-800">
                        {roleNameMap[m.senderRole] || m.senderRole}
                      </span>
                      <span>•</span>
                      <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div
                      className={`max-w-[85%] rounded-xl px-3.5 py-2 text-xs leading-relaxed ${
                        isMe
                          ? 'bg-purple-600 text-white rounded-br-none'
                          : 'bg-[#182133] text-gray-200 rounded-bl-none border border-gray-700/60'
                      }`}
                    >
                      {m.body}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-20 text-gray-500 text-xs">
                Chưa có tin nhắn nào. Hãy gửi lời chào để trao đổi thông tin giao dịch.
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendMessage} className="pt-3 border-t border-gray-800 flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Nhập tin nhắn trao đổi trong đơn..."
              className="flex-1 bg-[#141b27] border border-gray-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs"
            >
              Gửi
            </button>
          </form>
        </div>
      </div>

      {/* Deliver Modal */}
      {deliverModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111722] border border-gray-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-white">Xác Nhận Bàn Giao Đơn Hàng</h3>
            <p className="text-xs text-gray-400">
              Cung cấp tài khoản, mật khẩu hoặc thông tin hoàn tất dịch vụ cho khách. Tiền vẫn được giữ an toàn trong két ký quỹ cho đến khi khách kiểm tra và bấm xác nhận hoàn tất.
            </p>
            <textarea
              rows={4}
              value={deliveryNote}
              onChange={(e) => setDeliveryNote(e.target.value)}
              placeholder="Ví dụ: Tài khoản: player1 / Mật khẩu: matKhau123 / Email đã đổi sang..."
              className="w-full bg-[#161f2e] border border-gray-700 rounded-xl p-3 text-xs text-white font-mono placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setDeliverModal(false)}
                className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 text-xs font-semibold"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => handleAction('deliver', { deliveryNote })}
                className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold"
              >
                Xác Nhận Bàn Giao
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispute Modal */}
      {disputeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111722] border border-gray-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-amber-300">Yêu Cầu Khiếu Nại Đơn Hàng</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Việc mở khiếu nại sẽ lập tức phong tỏa toàn bộ tiến trình giải ngân và chuyển vụ việc sang Ban Quản Trị để điều tra và phân xử công bằng.
            </p>
            <textarea
              rows={4}
              required
              minLength={10}
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="Mô tả chi tiết lý do và sự cố gặp phải (tối thiểu 10 ký tự)..."
              className="w-full bg-[#161f2e] border border-gray-700 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setDisputeModal(false)}
                className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 text-xs font-semibold"
              >
                Đóng lại
              </button>
              <button
                onClick={() => handleAction('dispute', { reason: disputeReason })}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
              >
                Gửi Khiếu Nại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111722] border border-gray-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-white">Hủy Đơn Hàng</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              {order.status === 'funded'
                ? 'Số tiền đang tạm giữ trong ký quỹ sẽ được hoàn trả ngay lập tức vào số dư ví của người mua.'
                : 'Đơn hàng chưa thanh toán này sẽ được đánh dấu hủy.'}
            </p>
            <input
              type="text"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Lý do hủy đơn (không bắt buộc)..."
              className="w-full bg-[#161f2e] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500"
            />
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setCancelModal(false)}
                className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 text-xs font-semibold"
              >
                Quay lại
              </button>
              <button
                onClick={() => handleAction('cancel', { reason: cancelReason })}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold"
              >
                Xác Nhận Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111722] border border-gray-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-white">Đánh Giá Trải Nghiệm Giao Dịch</h3>
            <div>
              <span className="block text-xs font-medium text-gray-300 mb-1">Số sao đánh giá</span>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`text-2xl ${rating >= star ? 'text-amber-400' : 'text-gray-600'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Nhận xét (không bắt buộc)</label>
              <textarea
                rows={3}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Tốc độ bàn giao và thái độ phục vụ của người bán thế nào?"
                className="w-full bg-[#161f2e] border border-gray-700 rounded-xl p-3 text-xs text-white placeholder-gray-500"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setReviewModal(false)}
                className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={() => handleAction('review', { rating, comment: reviewComment })}
                className="px-4 py-2 rounded-xl bg-amber-500 text-black text-xs font-bold"
              >
                Gửi Đánh Giá
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
