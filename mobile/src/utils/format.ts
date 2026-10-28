import type { OrderStatus } from '@/types/api';

export function formatVnd(amount: number): string {
  return `${amount.toLocaleString('vi-VN')}₫`;
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
