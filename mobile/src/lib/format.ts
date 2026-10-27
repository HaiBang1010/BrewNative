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

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: 'Chờ thanh toán',
  paid: 'Đã thanh toán',
  accepted: 'Quán đã nhận',
  preparing: 'Đang pha chế',
  ready: 'Sẵn sàng, mời đến lấy',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};
