'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api, uploadImage } from '@/lib/api';
import { formatEUR } from '@/lib/utils';
import {
  TagIcon,
  UploadIcon,
  ShieldIcon,
  ClockIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
} from './Icons';

export default function OfferForm({ initialData = null, isEdit = false }) {
  const router = useRouter();
  const { user } = useAuth();

  const [catalog, setCatalog] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  const [formData, setFormData] = useState({
    gameId: initialData?.game?.id || initialData?.game || '',
    categoryId: initialData?.category?.id || initialData?.category || '',
    region: initialData?.region || 'Global',
    title: initialData?.title || '',
    description: initialData?.description || '',
    priceEur: initialData?.unitPrice ? (initialData.unitPrice / 100).toFixed(2) : '10.00',
    stock: initialData?.stock !== undefined ? initialData.stock : 1,
    minPerOrder: initialData?.minPerOrder !== undefined ? initialData.minPerOrder : 1,
    deliveryTimeHours: initialData?.deliveryTimeHours || 1,
    durationDays: initialData?.durationDays || 30,
    images: initialData?.images || [],
    publish: true,
  });

  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch catalog of games & categories
  useEffect(() => {
    async function loadCatalog() {
      try {
        const res = await api.get('/catalog');
        setCatalog(res.games || []);
        if (!formData.gameId && res.games?.length > 0) {
          const firstGame = res.games[0];
          setFormData((prev) => ({
            ...prev,
            gameId: firstGame.id,
            region: firstGame.regions?.[0] || 'Global',
            categoryId: firstGame.categories?.[0]?.id || '',
          }));
        }
      } catch (err) {
        setError('Failed to load games catalog');
      } finally {
        setLoadingCatalog(false);
      }
    }
    loadCatalog();
  }, []);

  const selectedGame = catalog.find((g) => g.id === formData.gameId);
  const availableCategories = selectedGame?.categories || [];
  const selectedCategory = availableCategories.find((c) => c.id === formData.categoryId);

  const handleGameChange = (gameId) => {
    const game = catalog.find((g) => g.id === gameId);
    setFormData((prev) => ({
      ...prev,
      gameId,
      region: game?.regions?.[0] || 'Global',
      categoryId: game?.categories?.[0]?.id || '',
    }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (formData.images.length >= 5) {
      alert('Maximum 5 images allowed per offer');
      return;
    }

    try {
      setUploadingImage(true);
      setError('');
      const res = await uploadImage(file);
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, res.url],
      }));
    } catch (err) {
      setError(err.message || 'Image upload failed');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = (index) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Pre-validate
    const unitPriceCents = Math.round(parseFloat(formData.priceEur) * 100);
    if (isNaN(unitPriceCents) || unitPriceCents <= 0) {
      setError('Price must be greater than 0');
      return;
    }
    if (formData.durationDays > 30) {
      setError('Duration cannot exceed 30 days');
      return;
    }
    if (formData.description.trim().length < 20) {
      setError('Description must be at least 20 characters');
      return;
    }

    try {
      setSubmitting(true);
      if (isEdit) {
        await api.patch(`/offers/${initialData.id}`, {
          gameId: formData.gameId,
          categoryId: formData.categoryId,
          region: formData.region,
          title: formData.title.trim(),
          description: formData.description.trim(),
          unitPrice: unitPriceCents,
          minPerOrder: Number(formData.minPerOrder),
          deliveryTimeHours: Number(formData.deliveryTimeHours),
          durationDays: Number(formData.durationDays),
          images: formData.images,
        });
        router.push('/seller/offers');
      } else {
        await api.post('/offers', {
          gameId: formData.gameId,
          categoryId: formData.categoryId,
          region: formData.region,
          title: formData.title.trim(),
          description: formData.description.trim(),
          unitPrice: unitPriceCents,
          stock: Number(formData.stock),
          minPerOrder: Number(formData.minPerOrder),
          deliveryTimeHours: Number(formData.deliveryTimeHours),
          durationDays: Number(formData.durationDays),
          images: formData.images,
          publish: formData.publish,
        });
        router.push('/seller/offers');
      }
    } catch (err) {
      setError(err.message || 'Failed to save offer');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingCatalog) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="inline-block w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p>Đang tải danh mục trò chơi...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Section 1: Classification */}
      <div className="p-6 rounded-2xl bg-[#111722]/80 border border-gray-800/80 space-y-6">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-gray-800/60 pb-3">
          <TagIcon className="w-5 h-5 text-purple-400" />
          Phân Loại Trò Chơi & Danh Mục
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Game Selection */}
          <div>
            <label className="block text-xs font-mono uppercase text-gray-400 mb-2">
              Chọn Trò Chơi *
            </label>
            <select
              value={formData.gameId}
              onChange={(e) => handleGameChange(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
              required
            >
              {catalog.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Selection */}
          <div>
            <label className="block text-xs font-mono uppercase text-gray-400 mb-2">
              Danh Mục & Loại Giao Dịch *
            </label>
            <select
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
              required
            >
              {availableCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type === 'account' ? 'Tài khoản' : c.type === 'item' ? 'Vật phẩm' : 'Cày thuê'})
                </option>
              ))}
            </select>
            {selectedCategory && (
              <p className="text-[11px] text-gray-500 mt-1.5">
                Đơn vị tính: <span className="text-purple-400">{selectedCategory.unitLabel}</span> | Loại: <span className="uppercase text-purple-400">{selectedCategory.type}</span>
              </p>
            )}
          </div>

          {/* Region */}
          <div>
            <label className="block text-xs font-mono uppercase text-gray-400 mb-2">
              Máy Chủ / Khu Vực
            </label>
            <select
              value={formData.region}
              onChange={(e) => setFormData({ ...formData, region: e.target.value })}
              className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
            >
              {(selectedGame?.regions || ['Global']).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Section 2: Details */}
      <div className="p-6 rounded-2xl bg-[#111722]/80 border border-gray-800/80 space-y-6">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-gray-800/60 pb-3">
          Tiêu Đề & Mô Tả Chi Tiết Gói Hàng
        </h2>

        <div>
          <label className="block text-xs font-mono uppercase text-gray-400 mb-2">
            Tiêu Đề Bài Đăng * (5–120 ký tự)
          </label>
          <input
            type="text"
            minLength={5}
            maxLength={120}
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Ví dụ: Tài khoản Kim Cương IV 120 Trang Phục, Đầy Đủ Email Gốc"
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-mono uppercase text-gray-400 mb-2">
            Mô Tả Chi Tiết & Hướng Dẫn Bàn Giao * (tối thiểu 20 ký tự)
          </label>
          <textarea
            rows={5}
            minLength={20}
            maxLength={5000}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Mô tả cụ thể thông số tài khoản, vật phẩm, thứ hạng, quy trình nhận hàng và cam kết bảo hành..."
            className="w-full bg-gray-900 border border-gray-800 rounded-xl p-4 text-white text-sm focus:outline-none focus:border-purple-500 resize-y"
            required
          />
        </div>

        {/* Media / Images */}
        <div>
          <label className="block text-xs font-mono uppercase text-gray-400 mb-2">
            Hình Ảnh Minh Họa / Bằng Chứng (Tối đa 5 ảnh)
          </label>
          <div className="flex flex-wrap gap-4 items-center">
            {formData.images.map((img, idx) => (
              <div key={idx} className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-700 group">
                <img src={img} alt="Thumbnail" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute inset-0 bg-red-950/80 text-red-200 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition"
                >
                  Xóa
                </button>
              </div>
            ))}

            {formData.images.length < 5 && (
              <label className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-700 hover:border-purple-500 flex flex-col items-center justify-center cursor-pointer transition text-gray-400 hover:text-purple-400">
                <UploadIcon className="w-6 h-6 mb-1" />
                <span className="text-[10px] font-mono">{uploadingImage ? 'Đang tải...' : 'Tải ảnh'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Section 3: Pricing & Fulfillment */}
      <div className="p-6 rounded-2xl bg-[#111722]/80 border border-gray-800/80 space-y-6">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-gray-800/60 pb-3">
          <ClockIcon className="w-5 h-5 text-purple-400" />
          Giá Bán, Kho Hàng & Cam Kết Giao Hàng
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Unit Price */}
          <div>
            <label className="block text-xs font-mono uppercase text-gray-400 mb-2">
              Đơn Giá (€ EUR) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-500 font-mono text-sm">€</span>
              <input
                type="number"
                step="0.01"
                min="0.10"
                max="10000.00"
                value={formData.priceEur}
                onChange={(e) => setFormData({ ...formData, priceEur: e.target.value })}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-8 pr-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-purple-500"
                required
              />
            </div>
            <p className="text-[11px] text-gray-500 mt-1 font-mono">
              = {Math.round(parseFloat(formData.priceEur || 0) * 100)} cents
            </p>
          </div>

          {/* Initial Stock (Only for new offer or edit) */}
          <div>
            <label className="block text-xs font-mono uppercase text-gray-400 mb-2">
              Số Lượng Trong Kho *
            </label>
            <input
              type="number"
              min="0"
              max="1000000"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
              className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-purple-500"
              required
              disabled={isEdit}
            />
            {isEdit && (
              <p className="text-[11px] text-gray-500 mt-1">
                (Điều chỉnh tồn kho qua nút Kho tại danh sách bài đăng)
              </p>
            )}
          </div>

          {/* Minimum per order */}
          <div>
            <label className="block text-xs font-mono uppercase text-gray-400 mb-2">
              Mua Tối Thiểu Mỗi Đơn *
            </label>
            <input
              type="number"
              min="1"
              max="1000000"
              value={formData.minPerOrder}
              onChange={(e) => setFormData({ ...formData, minPerOrder: e.target.value })}
              className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-purple-500"
              required
            />
          </div>

          {/* Delivery Guarantee Hours */}
          <div>
            <label className="block text-xs font-mono uppercase text-gray-400 mb-2">
              Cam Kết Bàn Giao Trong *
            </label>
            <select
              value={formData.deliveryTimeHours}
              onChange={(e) => setFormData({ ...formData, deliveryTimeHours: e.target.value })}
              className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
            >
              <option value="1">Trong vòng 1 giờ (Hỏa tốc)</option>
              <option value="2">Trong vòng 2 giờ</option>
              <option value="6">Trong vòng 6 giờ</option>
              <option value="12">Trong vòng 12 giờ</option>
              <option value="24">Trong vòng 24 giờ (Tiêu chuẩn)</option>
              <option value="48">Trong vòng 48 giờ</option>
            </select>
          </div>
        </div>

        {/* Duration Days */}
        <div className="pt-2">
          <label className="block text-xs font-mono uppercase text-gray-400 mb-2">
            Thời Hạn Duy Trì Bài Đăng (Tối đa 30 ngày) *
          </label>
          <input
            type="number"
            min="1"
            max="30"
            value={formData.durationDays}
            onChange={(e) => setFormData({ ...formData, durationDays: e.target.value })}
            className="w-48 bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-purple-500"
            required
          />
          <p className="text-[11px] text-gray-500 mt-1">
            Quy định sàn: Bài đăng tự động hết hạn sau tối đa 30 ngày để đảm bảo người bán còn hoạt động trực tuyến.
          </p>
        </div>

        {!isEdit && (
          <div className="pt-4 border-t border-gray-800/60 flex items-center gap-3">
            <input
              type="checkbox"
              id="publishCheckbox"
              checked={formData.publish}
              onChange={(e) => setFormData({ ...formData, publish: e.target.checked })}
              className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-gray-900 border-gray-800"
            />
            <label htmlFor="publishCheckbox" className="text-sm text-gray-300 cursor-pointer">
              Đăng bán công khai ngay sau khi lưu (bỏ chọn nếu muốn lưu thành Bản nháp riêng tư)
            </label>
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-end gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium transition"
        >
          Hủy Bỏ
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-8 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition shadow-lg shadow-purple-900/40 flex items-center gap-2"
        >
          {submitting ? 'Đang Lưu...' : isEdit ? 'Cập Nhật Bài Đăng' : formData.publish ? 'Đăng Bán Ngay' : 'Lưu Thành Bản Nháp'}
        </button>
      </div>
    </form>
  );
}
