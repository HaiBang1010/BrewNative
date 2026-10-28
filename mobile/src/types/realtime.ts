import type { OrderStatus, User, UserRole } from './api';

/**
 * WebSocket contract with the backend (backend/src/realtime/realtime.events.ts,
 * documented in docs/data-model-and-flow.md, section "WebSocket").
 */

/** Public profile of a message sender; never includes email or phone. */
export type MessageSender = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  role: UserRole;
};

/** A chat message, same shape over REST, in acks and in `message:new`. */
export type ChatMessage = {
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

/** GET /chat/messages: newest first, `before` = id of the oldest loaded message. */
export type ChatMessagePage = {
  items: ChatMessage[];
  hasMore: boolean;
};

/** GET /chat */
export type ChatSummary = {
  conversationId: string;
  lastMessageAt: string | null;
  unreadCount: number;
};

/** GET /admin/conversations: one customer's chat, as staff see it. */
export type StaffConversation = {
  id: string;
  customerId: string;
  customer: User;
  lastMessageAt: string | null;
  lastMessage: ChatMessage | null;
  /** Messages from the customer that no staff member has read yet. */
  unreadCount: number;
};

/** Server → client events. */
export type OrderUpdatedEvent = {
  orderId: string;
  code: string;
  userId: string;
  storeId: string;
  status: OrderStatus;
  previousStatus: OrderStatus;
  changedAt: string;
};

/** menu:updated and stores:updated, sent to everyone. Only says "refetch". */
export type CatalogUpdatedEvent = { changedAt: string };

export type MessageNewEvent = {
  conversationId: string;
  customerId: string;
  message: ChatMessage;
};

export type ConversationReadEvent = {
  conversationId: string;
  customerId: string;
  reader: 'customer' | 'staff';
  readAt: string;
};

/** Every acknowledgement of a client → server event has this shape. */
export type WsReply<T> =
  | { ok: true; data: T }
  | { ok: false; error: { status: number; message: string | string[] } };
