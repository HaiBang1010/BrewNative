import type { OrderStatus } from '../orders/entities/order-status.enum.js';
import type { UserRole } from '../users/entities/user-role.enum.js';

/**
 * The WebSocket contract between backend, mobile app and admin web.
 * Documented in docs/data-model-and-flow.md (section "WebSocket").
 */

/** Rooms every socket joins automatically after authenticating. */
export const userRoom = (userId: string) => `user:${userId}`;
export const STAFF_ROOM = 'staff';

/** Server → client. */
export const ServerEvent = {
  OrderUpdated: 'order:updated',
  MessageNew: 'message:new',
  ConversationRead: 'conversation:read',
  /** Sent right before the server disconnects a socket whose access token expired. */
  SessionExpired: 'session:expired',
} as const;

/** Client → server. Reply comes back through the Socket.IO acknowledgement. */
export const ClientEvent = {
  MessageSend: 'message:send',
  ConversationRead: 'conversation:read',
} as const;

export type OrderUpdatedEvent = {
  orderId: string;
  code: string;
  userId: string;
  storeId: string;
  status: OrderStatus;
  previousStatus: OrderStatus;
  changedAt: string;
};

/** Public profile of a message sender; never includes email or phone. */
export type MessageSender = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  role: UserRole;
};

/** A chat message as clients receive it (REST, ack and message:new all use this shape). */
export type MessageDto = {
  id: string;
  /** Echo of the clientId the sender passed, if any. */
  clientId: string | null;
  conversationId: string;
  senderId: string | null;
  sender: MessageSender | null;
  body: string;
  /** ISO 8601. */
  createdAt: string;
};

export type MessageNewEvent = {
  conversationId: string;
  customerId: string;
  message: MessageDto;
};

export type ConversationReadEvent = {
  conversationId: string;
  customerId: string;
  reader: 'customer' | 'staff';
  readAt: string;
};

/** Every acknowledgement has this shape, so the client can always check `ok`. */
export type WsReply<T> =
  | { ok: true; data: T }
  | { ok: false; error: { status: number; message: string | string[] } };
