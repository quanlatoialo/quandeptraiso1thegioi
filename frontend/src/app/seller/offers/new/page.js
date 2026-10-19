'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import OfferForm from '@/components/OfferForm';
import { ChevronRightIcon, TagIcon } from '@/components/Icons';

export default function NewOfferPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login?redirect=/seller/offers/new');
      return;
    }
    const isMerchant = user.roles?.includes('seller') || user.roles?.includes('booster');
    if (!isMerchant) {
      router.push('/become-seller');
    }
  }, [user, loading]);

  if (loading || !user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
        <Link href="/seller" className="hover:text-purple-400">Người Bán</Link>
        <ChevronRightIcon className="w-3.5 h-3.5" />
        <Link href="/seller/offers" className="hover:text-purple-400">Bài Đăng</Link>
        <ChevronRightIcon className="w-3.5 h-3.5" />
        <span className="text-white">Tạo Mới</span>
      </div>

      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
          <TagIcon className="w-7 h-7 text-purple-400" />
          Đăng Bán Sản Phẩm Mới
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Đăng bán tài khoản game, kho vật phẩm hoặc dịch vụ cày thuê lên thị trường ký quỹ P2P.
        </p>
      </div>

      <OfferForm isEdit={false} />
    </div>
  );
}
