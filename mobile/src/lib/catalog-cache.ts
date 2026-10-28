import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './query-keys';

/**
 * Refetch everything built from the menu or the stores, for customers and admins alike.
 * Used after an admin edit on this device and when the server says another device
 * changed something (menu:updated, stores:updated in socket-provider.tsx).
 */

export function refreshMenuQueries(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.menu });
  void queryClient.invalidateQueries({ queryKey: ['product'] });
  void queryClient.invalidateQueries({ queryKey: queryKeys.adminCategories });
  void queryClient.invalidateQueries({ queryKey: queryKeys.adminProducts });
  void queryClient.invalidateQueries({ queryKey: ['admin', 'product'] });
}

export function refreshStoreQueries(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.stores });
  void queryClient.invalidateQueries({ queryKey: queryKeys.adminStores });
}
