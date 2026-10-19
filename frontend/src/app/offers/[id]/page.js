'use client';
import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { formatEUR, formatDate } from '@/lib/utils';
import {
  ShieldIcon,
  ClockIcon,
  GamepadIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  LockIcon,
  UserIcon,
} from '@/components/Icons';

export default function OfferDetailPage({ params }) {
  const unwrappedParams = use(params);
  const offerId = unwrappedParams.id;
  const router = useRouter();
  const { user, wallet, refreshWallet } = useAuth();

  const [offer, setOffer] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadOffer() {
      try {
        const res = await apiRequest(`/api/offers/${offerId}`);
        setOffer(res.offer);
        setIsOwner(res.isOwner);
        if (res.offer.minPerOrder) {
          setQuantity(res.offer.minPerOrder);
        }
      } catch (err) {
        setError(err.message || 'Offer not found');
      } finally {
        setLoading(false);
      }
    }
    loadOffer();
  }, [offerId]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center text-gray-400">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm">Đang tải thông tin sản phẩm...</p>
      </div>
    );
  }

  if (error || !offer) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertCircleIcon className="w-12 h-12 text-red-400 mx-auto" />
        <h1 className="text-xl font-bold text-white">Không Tìm Thấy Sản Phẩm</h1>
        <p className="text-sm text-gray-400">{error || 'Bài đăng này có thể đã bị gỡ hoặc đã hết hạn.'}</p>
        <Link
          href="/offers"
          className="inline-block px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
        >
          Quay lại thị trường
        </Link>
      </div>
    );
  }

  const isSoldOut = offer.stock === 0 || offer.status === 'sold_out';
  const isExpired = offer.status === 'expired';
  const isAvailable = offer.status === 'active' && !isSoldOut && !isExpired;

  const typeLabels = {
    account: 'Tài khoản',
    item: 'Vật phẩm',
    boosting: 'Cày thuê rank',
  };

  const statusLabels = {
    active: 'Đang mở bán',
    paused: 'Tạm dừng',
    sold_out: 'Hết hàng',
    expired: 'Hết hạn',
    draft: 'Bản nháp',
  };

  const totalCents = offer.unitPrice * quantity;
  const hasEnoughBalance = wallet && wallet.available >= totalCents;

  const handleQuantityChange = (val) => {
    const q = parseInt(val, 10);
    if (isNaN(q)) return;
    const bounded = Math.max(offer.minPerOrder, Math.min(offer.stock, q));
    setQuantity(bounded);
  };

  const handlePurchase = async () => {
    if (!user) {
      router.push(`/login?redirect=/offers/${offer.id}`);
      return;
    }
    setPurchasing(true);
    setError('');

    try {
      // 1. Create order
      const orderRes = await apiRequest('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          offerId: offer.id,
          quantity,
        }),
      });

      const orderId = orderRes.order.id;

      // 2. Pay order from available wallet into escrow
      await apiRequest(`/api/orders/${orderId}/pay`, {
        method: 'POST',
      });

      await refreshWallet();
      router.push(`/orders/${orderId}`);
    } catch (err) {
      setError(err.message || 'Thanh toán thất bại');
      setPurchasing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Breadcrumb */}
      <nav className="text-xs text-gray-400 flex items-center gap-2">
        <Link href="/" className="hover:text-white">Trang Chủ</Link>
        <span>/</span>
        <Link href="/offers" className="hover:text-white">Sản Phẩm</Link>
        <span>/</span>
        <Link href={`/offers?game=${encodeURIComponent(offer.game?.slug || '')}`} className="hover:text-white">
          {offer.game?.name}
        </Link>
        <span>/</span>
        <span className="text-gray-200 truncate max-w-xs">{offer.title}</span>
      </nav>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Title, Specs, Description */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#111722] border border-gray-800 rounded-2xl p-6 sm:p-8 space-y-6">
            {/* Top Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-purple-950/80 border border-purple-500/40 text-purple-300 font-semibold text-xs uppercase tracking-wide">
                {typeLabels[offer.type] || offer.type}
              </span>
              <span className="px-2.5 py-1 rounded-md bg-blue-950/80 border border-blue-500/40 text-blue-300 font-medium text-xs">
                {offer.game?.name}
              </span>
              {offer.region && (
                <span className="px-2.5 py-1 rounded-md bg-gray-800 border border-gray-700 text-gray-300 font-mono text-xs">
                  Máy chủ: {offer.region}
                </span>
              )}
              <span
                className={`ml-auto px-2.5 py-1 rounded-md text-xs font-semibold uppercase font-mono ${
                  isAvailable
                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                    : 'bg-red-950/80 text-red-400 border border-red-500/30'
                }`}
              >
                {statusLabels[offer.status] || offer.status}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
              {offer.title}
            </h1>

            {/* Specs Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-y border-gray-800 text-xs">
              <div className="p-3 rounded-lg bg-gray-900/60">
                <span className="text-gray-400 block mb-0.5">Thời Gian Giao</span>
                <span className="font-semibold text-white flex items-center gap-1">
                  <ClockIcon className="w-3.5 h-3.5 text-purple-400" />
                  ~{offer.deliveryTimeHours} giờ
                </span>
              </div>
              <div className="p-3 rounded-lg bg-gray-900/60">
                <span className="text-gray-400 block mb-0.5">Kho Hàng Còn</span>
                <span className={`font-semibold ${isSoldOut ? 'text-red-400' : 'text-white'}`}>
                  {offer.stock} {offer.unitLabel || 'đơn vị'}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-gray-900/60">
                <span className="text-gray-400 block mb-0.5">Mua Tối Thiểu</span>
                <span className="font-semibold text-white">
                  {offer.minPerOrder} {offer.unitLabel || 'đơn vị'}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-gray-900/60">
                <span className="text-gray-400 block mb-0.5">Hạn Niêm Yết</span>
                <span className="font-semibold text-white">
                  {formatDate(offer.expiresAt)}
                </span>
              </div>
            </div>

            {/* Description */}
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">
                Mô Tả Chi Tiết Gói Hàng
              </h2>
              <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-line bg-gray-900/40 p-4 rounded-xl border border-gray-800/80">
                {offer.description}
              </div>
            </div>

            {/* Escrow Guarantee Notice */}
            <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 flex items-start gap-3">
              <ShieldIcon className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
              <div className="text-xs text-gray-300 leading-relaxed">
                <strong className="text-white block mb-0.5">Được Bảo Chứng Bởi Ký Quỹ Độc Lập Hai Chiều:</strong>
                Khi bạn bấm mua, số tiền thanh toán sẽ được khóa an toàn trong két ký quỹ trung lập của sàn. Người bán chỉ nhận được tiền sau khi bạn kiểm tra và bấm xác nhận hoàn tất nhận hàng.
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Price, Quantity & Purchase Card */}
        <div className="space-y-6">
          <div className="bg-[#111722] border border-gray-800 rounded-2xl p-6 space-y-6 shadow-xl sticky top-20">
            {/* Price Box */}
            <div className="border-b border-gray-800 pb-5">
              <span className="text-xs text-gray-400 block mb-1">Đơn Giá Niêm Yết</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">
                  {formatEUR(offer.unitPrice)}
                </span>
                <span className="text-xs text-gray-400 font-mono">
                  / {offer.unitLabel || 'đơn vị'}
                </span>
              </div>
            </div>

            {/* Quantity Selector */}
            {isAvailable && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-gray-300">
                  <span className="font-medium">Số lượng mua:</span>
                  <span className="text-gray-400 font-mono">
                    (Tối thiểu: {offer.minPerOrder} — Còn: {offer.stock})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={quantity <= offer.minPerOrder}
                    onClick={() => handleQuantityChange(quantity - 1)}
                    className="w-10 h-10 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-white font-bold text-lg flex items-center justify-center transition-colors"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={offer.minPerOrder}
                    max={offer.stock}
                    value={quantity}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    className="flex-1 h-10 bg-[#161f2e] border border-gray-700 rounded-lg text-center font-bold text-white text-base focus:outline-none focus:border-purple-500"
                  />
                  <button
                    disabled={quantity >= offer.stock}
                    onClick={() => handleQuantityChange(quantity + 1)}
                    className="w-10 h-10 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-white font-bold text-lg flex items-center justify-center transition-colors"
                  >
                    +
                  </button>
                </div>

                {/* Subtotal */}
                <div className="pt-3 border-t border-gray-800 flex items-center justify-between text-sm">
                  <span className="text-gray-400">Tổng Tiền Ký Quỹ:</span>
                  <span className="text-xl font-extrabold text-white">
                    {formatEUR(totalCents)}
                  </span>
                </div>
              </div>
            )}

            {/* Purchase CTA */}
            <div>
              {isOwner ? (
                <div className="p-3 rounded-lg bg-gray-800/80 text-center text-xs text-gray-400">
                  Bạn là người tạo bài đăng này. Bạn không thể mua bài của chính mình.
                </div>
              ) : !isAvailable ? (
                <button
                  disabled
                  className="w-full py-3 rounded-xl bg-gray-800 text-gray-500 font-semibold text-sm cursor-not-allowed"
                >
                  {isSoldOut ? 'Đã Hết Hàng' : isExpired ? 'Đã Hết Hạn' : 'Không Khả Dụng'}
                </button>
              ) : (
                <button
                  onClick={() => setBuyModalOpen(true)}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-900/40 hover:shadow-purple-900/60 transition-all flex items-center justify-center gap-2"
                >
                  <LockIcon className="w-4 h-4 text-purple-200" />
                  <span>Mua Ngay Qua Két Ký Quỹ</span>
                </button>
              )}
            </div>

            {/* Seller Card */}
            <div className="pt-5 border-t border-gray-800">
              <span className="text-[11px] font-mono uppercase tracking-wider text-gray-400 block mb-3 font-semibold">
                Thông Tin Người Bán
              </span>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-950 border border-purple-500/40 flex items-center justify-center text-sm font-bold text-purple-300">
                  {offer.seller?.displayName?.charAt(0).toUpperCase() || 'S'}
                </div>
                <div>
                  <Link
                    href={`/users/${offer.seller?.id}`}
                    className="font-bold text-sm text-white hover:text-purple-300 transition-colors block"
                  >
                    {offer.seller?.displayName}
                  </Link>
                  <span className="text-xs text-gray-400">
                    Tham gia từ {new Date(offer.seller?.memberSince || offer.createdAt).getFullYear()}
                  </span>
                </div>
              </div>
              <Link
                href={`/users/${offer.seller?.id}`}
                className="mt-3 block text-center text-xs py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-purple-400 font-medium transition-colors"
              >
                Xem Hồ Sơ & Uy Tín Người Bán →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Buy Confirmation Modal */}
      {buyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111722] border border-gray-700 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="border-b border-gray-800 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldIcon className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-base text-white">Xác Nhận Mua Hàng & Khóa Ký Quỹ</h3>
              </div>
              <button
                onClick={() => setBuyModalOpen(false)}
                className="text-gray-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Order Summary */}
            <div className="bg-gray-900/60 p-4 rounded-xl border border-gray-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Gói hàng:</span>
                <span className="font-semibold text-white truncate max-w-xs">{offer.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Trò chơi:</span>
                <span className="text-gray-200">{offer.game?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Số lượng:</span>
                <span className="font-semibold text-white">{quantity} {offer.unitLabel}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-800 text-sm">
                <span className="text-gray-300 font-medium">Tổng tiền ký quỹ:</span>
                <span className="font-extrabold text-purple-300">{formatEUR(totalCents)}</span>
              </div>
            </div>

            {/* Wallet Balance Check */}
            <div className="p-3.5 rounded-xl bg-[#141b27] border border-gray-800 flex items-center justify-between text-xs">
              <div>
                <span className="text-gray-400 block">Số Dư Ví Khả Dụng Của Bạn:</span>
                <span className={`font-bold text-sm ${hasEnoughBalance ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatEUR(wallet?.available || 0)}
                </span>
              </div>
              {!hasEnoughBalance && (
                <Link
                  href="/wallet"
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors"
                >
                  + Nạp Thêm Tiền Thử Nghiệm
                </Link>
              )}
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-950/60 border border-red-500/30 text-xs text-red-300">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setBuyModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                disabled={!hasEnoughBalance || purchasing}
                onClick={handlePurchase}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                {purchasing ? 'Đang Khóa Tiền Ký Quỹ...' : 'Xác Nhận & Khóa Tiền Ký Quỹ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
