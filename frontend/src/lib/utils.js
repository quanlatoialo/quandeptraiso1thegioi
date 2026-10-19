'use strict';

export function formatEUR(cents) {
  if (cents === null || cents === undefined) return '0,00 €';
  return (cents / 100).toLocaleString('vi-VN', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  });
}

export function formatDate(dateString) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateTime(dateString) {
  return formatDate(dateString);
}

export function timeAgo(dateString) {
  if (!dateString) return '';
  const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
  if (seconds < 60) return 'vừa xong';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

export const STATUS_MAP = {
  pending_payment: { label: 'Chờ thanh toán', bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
  funded: { label: 'Đã giữ tiền (Ký quỹ)', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  in_progress: { label: 'Đang thực hiện', bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  awaiting_customer_confirmation: { label: 'Đã bàn giao (Chờ người mua xác nhận)', bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  completed: { label: 'Hoàn tất & Đã giải ngân', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  disputed: { label: 'Đang khiếu nại', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  cancelled: { label: 'Đã hủy', bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/20' },
  refunded: { label: 'Đã hoàn tiền', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  active: { label: 'Đang hoạt động', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  paused: { label: 'Tạm dừng', bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
  expired: { label: 'Hết hạn', bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/20' },
  sold_out: { label: 'Hết hàng', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  draft: { label: 'Bản nháp', bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/20' },
};

export function getStatusBadge(status) {
  const s = STATUS_MAP[status];
  if (s) {
    return {
      label: s.label,
      bg: s.bg,
      color: s.text,
      border: s.border,
    };
  }
  return {
    label: (status || 'không rõ').replace(/_/g, ' '),
    bg: 'bg-gray-500/10',
    color: 'text-gray-400',
    border: 'border-gray-500/20',
  };
}
