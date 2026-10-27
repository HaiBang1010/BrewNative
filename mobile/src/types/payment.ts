import type { OrderStatus, PaymentStatus } from './api';

/** POST /orders/:id/payment/confirm */
export type ConfirmResult = {
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus | null;
};

/** 'paid': Stripe took the money (result.orderStatus says if the order is already marked). */
export type PayResult = { outcome: 'paid'; orderStatus: OrderStatus } | { outcome: 'cancelled' };
