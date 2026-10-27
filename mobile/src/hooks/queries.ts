import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { menuService } from '@/services/menu.service';
import { orderService } from '@/services/order.service';
import { userService } from '@/services/user.service';
import type { Order } from '@/types/api';

/**
 * Screens read and change backend data through these hooks. The hooks add
 * caching (TanStack Query): screens share one cache, and opening a screen twice
 * doesn't refetch while the data is fresh. The actual HTTP calls are in services/.
 *
 * useQuery = read data. useMutation = change data (create an order, cancel...).
 */

export function useMe() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: ({ signal }) => userService.getMe(signal),
  });
}

export function useMenu() {
  return useQuery({
    queryKey: queryKeys.menu,
    queryFn: ({ signal }) => menuService.getMenu(signal),
    // The menu rarely changes.
    staleTime: 5 * 60_000,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: queryKeys.product(id),
    queryFn: ({ signal }) => menuService.getProduct(id, signal),
  });
}

export function useStores() {
  return useQuery({
    queryKey: queryKeys.stores,
    queryFn: ({ signal }) => menuService.getStores(signal),
    staleTime: 5 * 60_000,
  });
}

export function useOrders() {
  return useQuery({
    queryKey: queryKeys.orders,
    queryFn: ({ signal }) => orderService.list(signal),
  });
}

export function useOrder(
  id: string,
  options?: Pick<UseQueryOptions<Order, Error, Order, QueryKey>, 'refetchInterval'>,
) {
  return useQuery({
    queryKey: queryKeys.order(id),
    queryFn: ({ signal }) => orderService.get(id, signal),
    refetchInterval: options?.refetchInterval,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: orderService.create,
    onSuccess: (order) => {
      // Put the new order in the cache so its screen opens instantly,
      // and mark the list as outdated so it refetches.
      queryClient.setQueryData(queryKeys.order(order.id), order);
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: orderService.cancel,
    onSuccess: (order) => {
      queryClient.setQueryData(queryKeys.order(order.id), order);
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders });
    },
  });
}
