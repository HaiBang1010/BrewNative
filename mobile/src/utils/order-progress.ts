import type { OrderStatus } from '@/types/api';

/** Segments of the progress bar on the order screen: paid → accepted → preparing → ready. */
export const ORDER_PROGRESS_STEPS = 4;

const FILLED: Record<OrderStatus, number> = {
  pending_payment: 0,
  paid: 1,
  accepted: 2,
  preparing: 3,
  ready: 4,
  completed: 4,
  cancelled: 0,
};

/** How many segments are done. */
export function orderProgress(status: OrderStatus): number {
  return FILLED[status];
}

/** Headline and explanation of each status, for the customer. */
export const ORDER_STATUS_DETAIL: Record<OrderStatus, { title: string; description: string }> = {
  pending_payment: {
    title: 'Đang xác nhận thanh toán',
    description: 'Đơn sẽ được gửi tới quán ngay khi thanh toán được xác nhận.',
  },
  paid: {
    title: 'Đã gửi đơn tới quán',
    description: 'Quán sẽ nhận đơn trong ít phút.',
  },
  accepted: {
    title: 'Quán đã nhận đơn',
    description: 'Đồ uống của bạn sắp được pha.',
  },
  preparing: {
    title: 'Đang pha đồ uống',
    description: 'Chúng tôi sẽ báo ngay khi đồ uống sẵn sàng.',
  },
  ready: {
    title: 'Đồ uống đã sẵn sàng',
    description: 'Mời bạn đến quầy nhận, nhớ đọc mã đơn nhé.',
  },
  completed: {
    title: 'Đã nhận đồ uống',
    description: 'Cảm ơn bạn, chúc một ngày ngon miệng!',
  },
  cancelled: {
    title: 'Đơn đã bị hủy',
    description: 'Nếu bạn đã thanh toán, tiền sẽ được hoàn về thẻ trong vài ngày.',
  },
};
