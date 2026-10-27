import { useQuery } from '@tanstack/react-query';
import type {
  Category,
  Order,
  Paginated,
  ProductDetail,
  User,
} from '@/types/api';
import { api } from './session';

/**
 * Every read from the backend goes through a hook here, so screens never call
 * fetch directly and share one cache (opening a screen twice doesn't refetch
 * while the data is fresh).
 */

export const meQueryKey = ['me'] as const;

export function useMe() {
  return useQuery({
    queryKey: meQueryKey,
    queryFn: ({ signal }) => api.get<User>('/me', { signal }),
  });
}

export function useMenu() {
  return useQuery({
    queryKey: ['menu'],
    queryFn: ({ signal }) => api.get<Category[]>('/menu', { signal, auth: false }),
    // The menu rarely changes.
    staleTime: 5 * 60_000,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: ({ signal }) => api.get<ProductDetail>(`/products/${id}`, { signal, auth: false }),
  });
}

export function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: ({ signal }) => api.get<Paginated<Order>>('/orders?limit=50', { signal }),
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['order', id],
    queryFn: ({ signal }) => api.get<Order>(`/orders/${id}`, { signal }),
  });
}
