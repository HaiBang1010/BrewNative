import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { refreshStoreQueries } from '@/lib/catalog-cache';
import { queryKeys } from '@/lib/query-keys';
import { adminShopService } from '@/services/admin-shop.service';
import type { StoreInput } from '@/types/api';

/**
 * Hooks for the admin stores and sales screens. Store changes reach other devices
 * through stores:updated; the sales figures refetch on order:updated
 * (lib/socket-provider.tsx), so the numbers move while the screen is open.
 */

export function useAdminStores() {
  return useQuery({
    queryKey: queryKeys.adminStores,
    queryFn: ({ signal }) => adminShopService.listStores(signal),
  });
}

/** Creates the store if `id` is null, otherwise updates it. */
export function useSaveStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string | null; input: StoreInput }) =>
      id ? adminShopService.updateStore(id, input) : adminShopService.createStore(input),
    onSuccess: () => refreshStoreQueries(queryClient),
  });
}

export function useSalesStats(days: number) {
  return useQuery({
    queryKey: queryKeys.adminSalesStats(days),
    queryFn: ({ signal }) => adminShopService.getSalesStats(days, signal),
    // Keep the previous period on screen while another loads (no flash of skeleton).
    placeholderData: (previous) => previous,
  });
}
