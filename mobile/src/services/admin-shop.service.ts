import type { SalesStats, Store, StoreInput } from '@/types/api';
import { api } from './session';

/** /admin stores and sales figures. Admins only: the backend answers 403 to staff. */
export const adminShopService = {
  /** Every store, closed ones included. */
  listStores: (signal?: AbortSignal) => api.get<Store[]>('/admin/stores', { signal }),

  createStore: (input: StoreInput) => api.post<Store>('/admin/stores', input),

  /** Stores are never deleted (orders point to them): set isActive to false instead. */
  updateStore: (id: string, input: Partial<StoreInput>) =>
    api.patch<Store>(`/admin/stores/${id}`, input),

  /** The last `days` days, today included. */
  getSalesStats: (days: number, signal?: AbortSignal) =>
    api.get<SalesStats>(`/admin/stats/sales?days=${days}`, { signal }),
};
