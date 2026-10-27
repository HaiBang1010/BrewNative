/**
 * `data` of the push notifications the backend sends (backend/src/orders/orders.service.ts
 * `notify`, backend/src/chat/chat.service.ts). Read when the user taps one.
 */
export type NotificationData =
  | { type: 'order'; orderId: string }
  | { type: 'chat'; conversationId: string };
