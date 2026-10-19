'use client';
import Link from 'next/link';
import { formatEUR } from '@/lib/utils';
import { ShieldIcon, UserIcon, ClockIcon } from './Icons';

export default function OfferCard({ offer }) {
  const typeBadgeColors = {
    account: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    item: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    boosting: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
  };

  const typeLabels = {
    account: 'Tài khoản VIP',
    item: 'Vật phẩm hiếm',
    boosting: 'Cày Rank Pro',
  };

  const isSoldOut = offer.stock === 0 || offer.status === 'sold_out';

  return (
    <div className="group relative bg-gradient-to-b from-[#0e1424]/90 to-[#090d16]/95 hover:from-[#131b30] hover:to-[#0c1220] border border-white/[0.08] hover:border-purple-500/40 rounded-2xl overflow-hidden transition-all duration-300 flex flex-col justify-between shadow-xl shadow-black/40 hover:shadow-2xl hover:shadow-purple-950/30 hover:-translate-y-1.5">
      {/* Top Ambient Glow on hover */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/0 group-hover:bg-purple-600/10 rounded-full blur-2xl transition-all duration-500 pointer-events-none" />

      <div>
        {/* Game & Type Banner */}
        <div className="p-4 pb-3 border-b border-white/[0.06] bg-white/[0.02] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 truncate">
            <span className="font-bold text-xs text-gray-200 truncate tracking-wide font-heading">
              {offer.game?.name || 'Trò chơi'}
            </span>
            {offer.region && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.05] text-gray-300 border border-white/[0.08] shrink-0 font-medium">
                {offer.region}
              </span>
            )}
          </div>
          <span
            className={`text-[10px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border shrink-0 ${
              typeBadgeColors[offer.type] || 'bg-gray-800 text-gray-300'
            }`}
          >
            {typeLabels[offer.type] || offer.type}
          </span>
        </div>

        {/* Content */}
        <div className="p-4">
          <Link href={`/offers/${offer.id}`} className="block group-hover:text-purple-300 transition-colors">
            <h3 className="font-bold text-sm sm:text-base text-white line-clamp-2 leading-snug mb-2 font-heading">
              {offer.title}
            </h3>
          </Link>
          <p className="text-xs text-gray-400 line-clamp-2 mb-4 leading-relaxed font-light">
            {offer.description}
          </p>

          {/* Delivery & Min per order metadata */}
          <div className="flex items-center justify-between text-[11px] text-gray-300 py-2 px-3 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-2 font-mono">
            <div className="flex items-center gap-1.5">
              <ClockIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span>~{offer.deliveryTimeHours}h bàn giao</span>
            </div>
            <div>
              <span>Kho: <strong className={isSoldOut ? 'text-red-400' : 'text-emerald-400'}>{offer.stock}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer / Price & Seller */}
      <div className="p-4 pt-0">
        <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
          {/* Seller */}
          <Link
            href={`/users/${offer.seller?.id}`}
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-purple-300 transition-colors group/seller"
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 p-[1px]">
              <div className="w-full h-full rounded-full bg-[#0d131f] flex items-center justify-center text-[10px] text-purple-300 font-bold">
                {offer.seller?.displayName?.charAt(0).toUpperCase() || 'S'}
              </div>
            </div>
            <div className="flex flex-col">
              <span className="truncate max-w-[90px] text-gray-300 font-medium group-hover/seller:text-white">
                {offer.seller?.displayName}
              </span>
              <span className="text-[9px] text-emerald-400 font-mono -mt-0.5">● Uy tín</span>
            </div>
          </Link>

          {/* Price */}
          <div className="text-right">
            <div className="text-lg font-black text-white font-mono tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-100">
              {formatEUR(offer.unitPrice)}
            </div>
            <span className="text-[10px] text-gray-500 block -mt-1 font-mono">
              / {offer.unitLabel || 'sản phẩm'}
            </span>
          </div>
        </div>

        <div className="mt-3.5">
          <Link
            href={`/offers/${offer.id}`}
            className={`w-full block text-center text-xs font-bold py-2.5 rounded-xl tracking-wide uppercase transition-all ${
              isSoldOut
                ? 'bg-white/[0.04] text-gray-500 cursor-not-allowed border border-white/[0.05]'
                : 'glow-btn-purple text-white shadow-lg'
            }`}
          >
            {isSoldOut ? 'Đã Hết Hàng' : 'Xem Chi Tiết & Mua'}
          </Link>
        </div>
      </div>
    </div>
  );
}
