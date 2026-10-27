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
};
