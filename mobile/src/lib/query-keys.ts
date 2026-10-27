/**
 * Cache keys for TanStack Query, in one place so a key used to read data
 * (hooks/queries.ts) and to refresh it after a change always match.
 */
export const queryKeys = {
  me: ['me'] as const,
  menu: ['menu'] as const,
  product: (id: string) => ['product', id] as const,
  stores: ['stores'] as const,
  orders: ['orders'] as const,
  order: (id: string) => ['order', id] as const,
  chatSummary: ['chat', 'summary'] as const,
  chatMessages: ['chat', 'messages'] as const,
  // Staff screens. Everything under ['admin'] is refetched after a reconnect.
  staffOrders: ['admin', 'orders'] as const,
  staffOrder: (id: string) => ['admin', 'order', id] as const,
  staffConversations: ['admin', 'conversations'] as const,
  staffMessages: (conversationId: string) => ['admin', 'messages', conversationId] as const,
};
