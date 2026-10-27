import type { Category, ProductDetail, Store } from '@/types/api';
import { api } from './session';

/** Public catalog: no sign-in needed. */
export const menuService = {
  getMenu: (signal?: AbortSignal) => api.get<Category[]>('/menu', { signal, auth: false }),

  getProduct: (id: string, signal?: AbortSignal) =>
    api.get<ProductDetail>(`/products/${id}`, { signal, auth: false }),

  getStores: (signal?: AbortSignal) => api.get<Store[]>('/stores', { signal, auth: false }),
};
