'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import OfferForm from '@/components/OfferForm';
import { ChevronRightIcon, TagIcon } from '@/components/Icons';

export default function EditOfferPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push(`/login?redirect=/seller/offers/${params.id}/edit`);
      return;
    }
    const isMerchant = user.roles?.includes('seller') || user.roles?.includes('booster');
    if (!isMerchant) {
      router.push('/become-seller');
      return;
    }

    async function loadOffer() {
      try {
        setLoading(true);
        setError('');
        const res = await api.get(`/offers/${params.id}`);
        if (!res.isOwner) {
          setError('You do not have permission to edit this listing');
          return;
        }
        setOffer(res.offer);
      } catch (err) {
        setError(err.message || 'Failed to load offer');
      } finally {
        setLoading(false);
      }
    }
    loadOffer();
  }, [params.id, user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-500">
        <div className="inline-block w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p>Đang tải thông tin bài đăng...</p>
      </div>
    );
  }

  if (error || !offer) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-sm">
          {error || 'Không tìm thấy bài đăng'}
        </div>
        <Link
          href="/seller/offers"
          className="inline-block px-4 py-2 rounded-xl bg-gray-800 text-gray-300 text-xs"
        >
          Quay lại danh sách bài đăng
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
        <Link href="/seller" className="hover:text-purple-400">Người Bán</Link>
        <ChevronRightIcon className="w-3.5 h-3.5" />
        <Link href="/seller/offers" className="hover:text-purple-400">Bài Đăng</Link>
        <ChevronRightIcon className="w-3.5 h-3.5" />
        <span className="text-white">Chỉnh sửa: {offer.title}</span>
      </div>

      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
          <TagIcon className="w-7 h-7 text-purple-400" />
          Chỉnh Sửa Bài Đăng
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Cập nhật thông số chi tiết, cam kết thời gian giao hàng, giá bán hoặc hình ảnh mô tả.
        </p>
      </div>

      <OfferForm initialData={offer} isEdit={true} />
    </div>
  );
}
