import type { OrderStatus, Paginated, StaffOrder } from '@/types/api';
import type { ChatMessagePage, StaffConversation } from '@/types/realtime';
import { sendChatMessage } from './chat.service';
import { api } from './session';

/** /admin endpoints for staff and admins: handle orders, chat with customers. */
export const staffService = {
  /** Most recent orders of every store. The app groups them by status. */
  listOrders: (signal?: AbortSignal) =>
    api.get<Paginated<StaffOrder>>('/admin/orders?limit=100', { signal }),

  getOrder: (id: string, signal?: AbortSignal) =>
    api.get<StaffOrder>(`/admin/orders/${id}`, { signal }),

  /** The backend checks the step is allowed (e.g. paid → accepted) and refunds on paid → cancelled. */
  updateOrderStatus: (id: string, status: OrderStatus) =>
    api.patch<StaffOrder>(`/admin/orders/${id}/status`, { status }),

  listConversations: (signal?: AbortSignal) =>
    api.get<Paginated<StaffConversation>>('/admin/conversations?limit=100', { signal }),

  getMessages: (conversationId: string, before: string | undefined, signal?: AbortSignal) =>
    api.get<ChatMessagePage>(
      `/admin/conversations/${conversationId}/messages?limit=30${before ? `&before=${before}` : ''}`,
      { signal },
    ),

  sendMessage: (conversationId: string, body: string, clientId: string) =>
    sendChatMessage(
      { conversationId, body, clientId },
      `/admin/conversations/${conversationId}/messages`,
    ),

  markConversationRead: (conversationId: string) =>
    api.post<void>(`/admin/conversations/${conversationId}/read`),
};
