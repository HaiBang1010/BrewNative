import type { OrderStatus } from '@/types/api';

export function formatVnd(amount: number): string {
  return `${amount.toLocaleString('vi-VN')}₫`;
}

/** Short amounts for chart labels: 950.000₫ → "950k", 1.250.000₫ → "1,3tr". */
export function formatVndShort(amount: number): string {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}tr`;
  }
  if (amount >= 1_000) return `${Math.round(amount / 1_000)}k`;
  return String(amount);
}

/** "2026-10-28" (a shop day) → "28/10". */
export function formatShortDate(day: string): string {
  const [, month, date] = day.split('-');
  return `${date}/${month}`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
}

/** How many options of a group the customer picks, e.g. "Bắt buộc, chọn 1". */
export function optionGroupRule({ minSelect, maxSelect }: { minSelect: number; maxSelect: number }): string {
  if (minSelect === 0) return `Tùy chọn, tối đa ${maxSelect}`;
  if (minSelect === maxSelect) return `Bắt buộc, chọn ${minSelect}`;
  return `Chọn ${minSelect}–${maxSelect}`;
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: 'Chờ thanh toán',
  paid: 'Đã thanh toán',
  accepted: 'Quán đã nhận',
  preparing: 'Đang pha chế',
  ready: 'Sẵn sàng, mời đến lấy',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};
