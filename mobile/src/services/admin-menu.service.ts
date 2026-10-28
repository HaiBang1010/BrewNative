import type {
  CategoryInput,
  CategorySummary,
  Option,
  OptionGroup,
  OptionGroupInput,
  OptionInput,
  Product,
  ProductDetail,
  ProductInput,
} from '@/types/api';
import { File } from 'expo-file-system';
import { api } from './session';

/** A photo picked on the device, to upload. `uri` is a local file:// path. */
export type LocalImage = { uri: string };

/** /admin menu endpoints. Admins only: the backend answers 403 to staff. */
export const adminMenuService = {
  listCategories: (signal?: AbortSignal) =>
    api.get<CategorySummary[]>('/admin/categories', { signal }),

  createCategory: (input: CategoryInput) => api.post<CategorySummary>('/admin/categories', input),

  updateCategory: (id: string, input: Partial<CategoryInput>) =>
    api.patch<CategorySummary>(`/admin/categories/${id}`, input),

  /** 409 while the category still has products. */
  deleteCategory: (id: string) => api.delete<void>(`/admin/categories/${id}`),

  /** Every product, available or not, sorted like the menu. */
  listProducts: (signal?: AbortSignal) => api.get<Product[]>('/admin/products', { signal }),

  getProduct: (id: string, signal?: AbortSignal) =>
    api.get<ProductDetail>(`/admin/products/${id}`, { signal }),

  createProduct: (input: ProductInput) => api.post<Product>('/admin/products', input),

  updateProduct: (id: string, input: Partial<ProductInput>) =>
    api.patch<Product>(`/admin/products/${id}`, input),

  /** Past orders keep their own copy of the name and price. */
  deleteProduct: (id: string) => api.delete<void>(`/admin/products/${id}`),

  /** Replaces the product's image (JPEG, PNG, WebP or HEIC, max 5 MB). */
  uploadProductImage: (id: string, image: LocalImage) => {
    const form = new FormData();
    // The app's fetch is expo/fetch (Expo installs it as the global fetch). It sends Blobs,
    // not React Native's { uri, name, type } objects. expo-file-system's File is a Blob that
    // reads the local file; its name and type (e.g. "abc.jpeg", "image/jpeg") come from the path.
    form.append('file', new File(image.uri));
    return api.post<Product>(`/admin/products/${id}/image`, form);
  },

  createOptionGroup: (productId: string, input: OptionGroupInput) =>
    api.post<OptionGroup>(`/admin/products/${productId}/option-groups`, input),

  updateOptionGroup: (id: string, input: Partial<OptionGroupInput>) =>
    api.patch<OptionGroup>(`/admin/option-groups/${id}`, input),

  /** Also deletes its options. */
  deleteOptionGroup: (id: string) => api.delete<void>(`/admin/option-groups/${id}`),

  createOption: (groupId: string, input: OptionInput) =>
    api.post<Option>(`/admin/option-groups/${groupId}/options`, input),

  updateOption: (id: string, input: Partial<OptionInput>) =>
    api.patch<Option>(`/admin/options/${id}`, input),

  deleteOption: (id: string) => api.delete<void>(`/admin/options/${id}`),
};
