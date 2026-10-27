import type { CreateOrderInput, Order, Paginated, PaymentSheetParams } from '@/types/api';
import type { ConfirmResult } from '@/types/payment';
import { api } from './session';

/** The signed-in customer's orders and their payment. */
export const orderService = {
  /** Only paid orders: unpaid checkouts are hidden by the backend. */
  list: (signal?: AbortSignal) => api.get<Paginated<Order>>('/orders?limit=50', { signal }),

  get: (id: string, signal?: AbortSignal) => api.get<Order>(`/orders/${id}`, { signal }),

  /** Creates an unpaid order; the server prices every item itself. */
  create: (input: CreateOrderInput) => api.post<Order>('/orders', input),

  cancel: (id: string) => api.post<Order>(`/orders/${id}/cancel`),

  /** A Stripe PaymentIntent for PaymentSheet (reused while still payable). */
  preparePayment: (id: string) => api.post<PaymentSheetParams>(`/orders/${id}/payment`),

  /** Backend checks the payment with Stripe and marks the order paid if it went through. */
  confirmPayment: (id: string) => api.post<ConfirmResult>(`/orders/${id}/payment/confirm`),
};
