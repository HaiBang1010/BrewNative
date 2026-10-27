import type { OrderStatus } from '@/types/api';

/**
 * What staff can do with an order in each status. Mirrors the backend rules in
 * backend/src/orders/order-status.ts (the backend still checks every change).
 */
export type StaffAction = {
  to: OrderStatus;
  label: string;
  /** A destructive action asks for confirmation first. */
  destructive?: boolean;
};

const ACTIONS: Partial<Record<OrderStatus, StaffAction[]>> = {
  paid: [
    { to: 'accepted', label: 'Nhận đơn' },
    { to: 'cancelled', label: 'Từ chối và hoàn tiền', destructive: true },
  ],
  accepted: [{ to: 'preparing', label: 'Bắt đầu pha' }],
  preparing: [{ to: 'ready', label: 'Báo sẵn sàng' }],
  ready: [{ to: 'completed', label: 'Đã giao cho khách' }],
};

export function staffActions(status: OrderStatus): StaffAction[] {
  return ACTIONS[status] ?? [];
}

/** Tabs on the staff orders screen. Unpaid checkouts are never shown to staff. */
export const STAFF_ORDER_TABS = [
  { key: 'new', label: 'Đơn mới', statuses: ['paid'] },
  { key: 'doing', label: 'Đang làm', statuses: ['accepted', 'preparing'] },
  { key: 'ready', label: 'Sẵn sàng', statuses: ['ready'] },
  { key: 'done', label: 'Xong', statuses: ['completed', 'cancelled'] },
] as const satisfies readonly { key: string; label: string; statuses: readonly OrderStatus[] }[];

export type StaffOrderTab = (typeof STAFF_ORDER_TABS)[number]['key'];
