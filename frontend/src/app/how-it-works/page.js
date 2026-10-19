'use client';
import Link from 'next/link';
import {
  ShieldIcon,
  CheckCircleIcon,
  ClockIcon,
  AlertCircleIcon,
  LockIcon,
  ArrowRightIcon,
} from '@/components/Icons';

export default function HowItWorksPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Title */}
      <div className="text-center space-y-3">
        <span className="text-xs font-mono font-semibold uppercase tracking-widest text-purple-400">
          Giao Thức Ký Quỹ & Tin Cậy
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Cơ Chế Bảo Vệ Giao Dịch Tại Gamer 2 Gamer
        </h1>
        <p className="text-sm text-gray-400 max-w-xl mx-auto leading-relaxed">
          Giao dịch game ngang hàng (P2P) thường tiềm ẩn nguy cơ lừa đảo cao. Gamer 2 Gamer giải quyết triệt để vấn đề này bằng cơ chế ký quỹ độc lập và xác nhận hai chiều tự động.
        </p>
      </div>

      {/* Escrow Steps */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-white border-b border-gray-800 pb-3">
          1. Quy Trình Ký Quỹ Tiêu Chuẩn 4 Bước
        </h2>

        <div className="space-y-4">
          <div className="bg-[#111722] border border-gray-800 rounded-xl p-5 flex gap-4">
            <div className="w-8 h-8 rounded-lg bg-purple-900/40 border border-purple-500/30 flex items-center justify-center font-bold text-purple-300 text-sm shrink-0">
              1
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-white text-sm">Khách Hàng Nạp Tiền & Đặt Đơn Mua</h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                Khi bạn bấm "Mua Ngay", đúng số tiền EUR sẽ được chuyển từ số dư ví khả dụng sang két Ký Quỹ (Escrow) bị khóa. Cả người mua lẫn người bán đều không thể rút số tiền này trong khi đơn hàng đang diễn ra.
              </p>
            </div>
          </div>

          <div className="bg-[#111722] border border-gray-800 rounded-xl p-5 flex gap-4">
            <div className="w-8 h-8 rounded-lg bg-blue-900/40 border border-blue-500/30 flex items-center justify-center font-bold text-blue-300 text-sm shrink-0">
              2
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-white text-sm">Người Bán Bàn Giao Tài Khoản / Vật Phẩm / Cày Thuê</h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                Người bán gửi tài khoản, mật khẩu, tiến hành giao dịch trong game hoặc bắt đầu cày rank. Mọi thông tin bàn giao đều được lưu trữ bảo mật trong phòng giao dịch riêng tư của đơn hàng.
              </p>
            </div>
          </div>

          <div className="bg-[#111722] border border-gray-800 rounded-xl p-5 flex gap-4">
            <div className="w-8 h-8 rounded-lg bg-cyan-900/40 border border-cyan-500/30 flex items-center justify-center font-bold text-cyan-300 text-sm shrink-0">
              3
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-white text-sm">Người Bán Xác Nhận Đã Hoàn Tất Bàn Giao</h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                Người bán bấm xác nhận đã bàn giao hàng. <strong>Tiền vẫn được khóa chặt trong két ký quỹ.</strong> Sàn TUYỆT ĐỐI không tự động giải ngân tiền chỉ vì người bán bấm nút giao hàng!
              </p>
            </div>
          </div>

          <div className="bg-[#111722] border border-gray-800 rounded-xl p-5 flex gap-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-900/40 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-300 text-sm shrink-0">
              4
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-white text-sm">Người Mua Kiểm Tra, Xác Nhận Đủ & Giải Ngân Tiền</h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                Sau khi người mua kiểm tra tài khoản, đổi mật khẩu và bảo mật an toàn, người mua bấm "Xác Nhận Đã Nhận Đủ". Chỉ khi có đầy đủ xác nhận từ cả hai phía, hệ thống sổ cái kép mới giải ngân tiền cho người bán!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Disputes Policy */}
      <div id="disputes" className="space-y-6 pt-6 border-t border-gray-800">
        <h2 className="text-xl font-bold text-white border-b border-gray-800 pb-3">
          2. Khiếu Nại & Trọng Tài Phân Xử
        </h2>

        <div className="bg-[#111722] border border-gray-800 rounded-xl p-6 space-y-4 text-xs text-gray-300 leading-relaxed">
          <p>
            Nếu có bất kỳ sự cố nào xảy ra (sai thông tin đăng nhập, sai máy chủ, người bán không phản hồi...), cả hai bên đều có quyền bấm <strong>Khiếu Nại Lên Quản Trị</strong>.
          </p>
          <ul className="list-disc pl-5 space-y-2 text-gray-300">
            <li>
              <strong>Đóng băng tiền ngay lập tức:</strong> Việc mở khiếu nại dừng ngay lập tức mọi tiến trình giải ngân.
            </li>
            <li>
              <strong>Thu thập chứng cứ minh bạch:</strong> Cả hai bên có thể gửi ảnh chụp màn hình, lịch sử trò chuyện và lý do cụ thể.
            </li>
            <li>
              <strong>Phán quyết công bằng từ Quản Trị Viên:</strong> Admin sẽ kiểm tra nhật ký đơn hàng, tin nhắn trao đổi và đưa ra quyết định: hoặc <em>Hoàn Tiền 100% Cho Người Mua</em>, hoặc <em>Giải Ngân Toàn Bộ Cho Người Bán</em>.
            </li>
            <li>
              <strong>Bảo toàn hàng hóa:</strong> Tài khoản đã bàn giao thông tin sẽ không tự động hoàn kho, ngăn chặn nguy cơ lộ dữ liệu mật.
            </li>
          </ul>
        </div>
      </div>

      {/* CTA */}
      <div className="p-8 rounded-2xl bg-gradient-to-r from-purple-950/60 to-indigo-950/60 border border-purple-500/30 text-center space-y-4">
        <h3 className="text-lg font-bold text-white">Sẵn sàng giao dịch an toàn?</h3>
        <p className="text-xs text-gray-300 max-w-md mx-auto">
          Khám phá hàng trăm sản phẩm game uy tín hoặc đăng ký trở thành đối tác bán hàng ngay hôm nay.
        </p>
        <div className="flex justify-center gap-3">
          <Link
            href="/offers"
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs"
          >
            Duyệt Sản Phẩm Ngay
          </Link>
          <Link
            href="/become-seller"
            className="px-5 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-semibold text-xs"
          >
            Đăng Ký Làm Người Bán
          </Link>
        </div>
      </div>
    </div>
  );
}
