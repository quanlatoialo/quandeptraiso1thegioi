'use client';
import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import OfferCard from '@/components/OfferCard';
import { StarIcon, ShieldIcon, CheckCircleIcon, formatDate } from '@/lib/utils';
import { UserIcon } from '@/components/Icons';

export default function SellerProfilePage({ params }) {
  const unwrappedParams = use(params);
  const userId = unwrappedParams.id;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await apiRequest(`/api/users/${userId}`);
        setProfile(res);
      } catch (err) {
        setError(err.message || 'User not found');
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [userId]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center text-gray-400">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm">Đang tải hồ sơ người bán...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center text-gray-400 space-y-4">
        <h1 className="text-xl font-bold text-white">Không Thể Truy Cập Hồ Sơ</h1>
        <p className="text-sm">{error || 'Người dùng này không tồn tại hoặc tài khoản đang tạm khóa.'}</p>
        <Link href="/offers" className="inline-block px-4 py-2 rounded-lg bg-purple-600 text-white text-xs font-semibold">
          Quay lại thị trường
        </Link>
      </div>
    );
  }

  const { user, stats, offers, reviews } = profile;

  const roleNameMap = {
    seller: 'Người bán',
    booster: 'Cày thuê rank',
    admin: 'Quản trị viên',
    customer: 'Người mua',
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Profile Header */}
      <div className="bg-[#111722] border border-gray-800 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-800 to-indigo-800 flex items-center justify-center text-3xl font-extrabold text-white shadow-lg shadow-purple-900/40">
            {user.displayName?.charAt(0).toUpperCase()}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-white">{user.displayName}</h1>
              {user.country && (
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-300">
                  {user.country}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 max-w-md">
              {user.bio || 'Đối tác bán hàng đã được xác minh trên sàn.'}
            </p>
            <div className="flex items-center gap-2 pt-1">
              {user.roles?.map((r) => (
                <span
                  key={r}
                  className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-purple-950/80 border border-purple-800/50 text-purple-300 font-semibold"
                >
                  {roleNameMap[r] || r}
                </span>
              ))}
              <span className="text-xs text-gray-400 ml-2">
                Tham gia từ {new Date(user.memberSince).getFullYear()}
              </span>
            </div>
          </div>
        </div>

        {/* Real Data Stats Box */}
        <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-gray-900/60 border border-gray-800 text-center w-full md:w-auto">
          <div>
            <span className="text-lg font-black text-white block">
              {stats.completedOrders}
            </span>
            <span className="text-[10px] text-gray-400 uppercase font-mono">Đơn Thành Công</span>
          </div>
          <div>
            <span className="text-lg font-black text-purple-300 flex items-center justify-center gap-1">
              ★ {stats.averageRating ? stats.averageRating.toFixed(1) : 'Chưa có'}
            </span>
            <span className="text-[10px] text-gray-400 uppercase font-mono">Đánh Giá TB</span>
          </div>
          <div>
            <span className="text-lg font-black text-white block">
              {stats.reviewCount}
            </span>
            <span className="text-[10px] text-gray-400 uppercase font-mono">Lượt Nhận Xét</span>
          </div>
        </div>
      </div>

      {/* Merchant's Active Offers */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-white tracking-tight">
          Bài Đăng Đang Bán Của {user.displayName} ({offers.length})
        </h2>

        {offers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {offers.map((offer) => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </div>
        ) : (
          <div className="bg-[#111722] border border-gray-800 rounded-xl p-8 text-center text-gray-400 text-sm">
            Người bán hiện chưa có bài đăng nào đang hoạt động.
          </div>
        )}
      </section>

      {/* Customer Reviews Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-white tracking-tight">
          Đánh Giá Của Khách Hàng ({reviews.length})
        </h2>

        {reviews.length > 0 ? (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div
                key={r.id}
                className="bg-[#111722] border border-gray-800/80 rounded-xl p-4 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{r.buyer}</span>
                    <span className="text-amber-400 font-bold">
                      {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                    </span>
                  </div>
                  <span className="text-gray-400 font-mono text-[10px]">
                    {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                {r.comment && (
                  <p className="text-gray-300 leading-relaxed italic bg-gray-900/40 p-2.5 rounded-lg border border-gray-800/40">
                    "{r.comment}"
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#111722] border border-gray-800 rounded-xl p-8 text-center text-gray-400 text-sm">
            Chưa có đánh giá nào cho người bán này.
          </div>
        )}
      </section>
    </div>
  );
}
