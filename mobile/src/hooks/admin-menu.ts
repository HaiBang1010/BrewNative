import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { refreshMenuQueries } from '@/lib/catalog-cache';
import { queryKeys } from '@/lib/query-keys';
import { adminMenuService, type LocalImage } from '@/services/admin-menu.service';
import type { CategoryInput, OptionGroup, Product, ProductInput } from '@/types/api';
import { errorMessage } from '@/utils/errors';
import {
  planOptionChanges,
  toOptionGroupInput,
  type OptionGroupDraft,
} from '@/utils/admin-menu';

/**
 * Hooks for the admin menu screens (app/admin/menu). After any change, the
 * admin lists and the customer menu are refetched on this device at once.
 * Other devices refetch when the server sends menu:updated (lib/socket-provider.tsx).
 */

/**
 * Delete hooks are called as the screen closes (the deleted thing has nothing
 * left to show), so a failure is reported here, not by the screen.
 */
function alertDeleteFailed(error: unknown) {
  Alert.alert('Không xoá được', errorMessage(error));
}

export function useAdminCategories() {
  return useQuery({
    queryKey: queryKeys.adminCategories,
    queryFn: ({ signal }) => adminMenuService.listCategories(signal),
  });
}

export function useAdminProducts() {
  return useQuery({
    queryKey: queryKeys.adminProducts,
    queryFn: ({ signal }) => adminMenuService.listProducts(signal),
  });
}

/** Pass null for a product that doesn't exist yet (the "new product" form). */
export function useAdminProduct(id: string | null) {
  return useQuery({
    queryKey: queryKeys.adminProduct(id ?? 'new'),
    queryFn: ({ signal }) => adminMenuService.getProduct(id!, signal),
    enabled: !!id,
  });
}

// ---------------------------------------------------------------- categories

/** Creates the category if `id` is null, otherwise updates it. */
export function useSaveCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string | null; input: CategoryInput }) =>
      id ? adminMenuService.updateCategory(id, input) : adminMenuService.createCategory(input),
    onSuccess: () => refreshMenuQueries(queryClient),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminMenuService.deleteCategory,
    onSuccess: () => refreshMenuQueries(queryClient),
    onError: alertDeleteFailed,
  });
}

// ---------------------------------------------------------------- products

/**
 * Creates or updates the product, then uploads the new image if one was picked.
 * A failed upload doesn't fail the save (`imageError`): the product exists, and
 * saving again must not create it twice.
 */
export function useSaveProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
      image,
    }: {
      id: string | null;
      input: ProductInput;
      image: LocalImage | null;
    }): Promise<{ product: Product; imageError: unknown }> => {
      const product = id
        ? await adminMenuService.updateProduct(id, input)
        : await adminMenuService.createProduct(input);
      if (!image) return { product, imageError: null };
      try {
        return { product: await adminMenuService.uploadProductImage(product.id, image), imageError: null };
      } catch (imageError) {
        return { product, imageError };
      }
    },
    onSuccess: () => refreshMenuQueries(queryClient),
  });
}

/** The "Còn hàng" switch of the list: changes at once, goes back if the request fails. */
export function useSetProductAvailable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) =>
      adminMenuService.updateProduct(id, { isAvailable }),
    onMutate: async ({ id, isAvailable }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.adminProducts });
      const previous = queryClient.getQueryData<Product[]>(queryKeys.adminProducts);
      queryClient.setQueryData<Product[]>(queryKeys.adminProducts, (products) =>
        products?.map((p) => (p.id === id ? { ...p, isAvailable } : p)),
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      queryClient.setQueryData(queryKeys.adminProducts, context?.previous);
    },
    onSettled: () => refreshMenuQueries(queryClient),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminMenuService.deleteProduct,
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.adminProduct(id) });
      refreshMenuQueries(queryClient);
    },
    onError: alertDeleteFailed,
  });
}

// ---------------------------------------------------------------- option groups

/**
 * Saving the group worked but some of its options failed: part of the form is
 * saved. The screen should show the server's version again rather than let the
 * admin save the same form twice (that would create the group or options twice).
 */
export class PartialSaveError extends Error {
  constructor(readonly reason: unknown) {
    super('Option group partly saved');
  }
}

/**
 * Saves the whole option group form: the group itself, then its options
 * (delete removed rows, update changed ones, create new ones).
 * Throws PartialSaveError if the group was saved but not all of its options.
 */
export function useSaveOptionGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      productId,
      group,
      draft,
      sortOrder,
    }: {
      productId: string;
      /** The saved group, or undefined to create one. */
      group: OptionGroup | undefined;
      draft: OptionGroupDraft;
      /** Position of a new group under the product. */
      sortOrder: number;
    }) => {
      const groupId = group
        ? (await adminMenuService.updateOptionGroup(group.id, toOptionGroupInput(draft))).id
        : (await adminMenuService.createOptionGroup(productId, toOptionGroupInput(draft, sortOrder))).id;

      const changes = planOptionChanges(group?.options ?? [], draft.options);
      try {
        await Promise.all(changes.remove.map((id) => adminMenuService.deleteOption(id)));
        await Promise.all(changes.update.map(({ id, input }) => adminMenuService.updateOption(id, input)));
        await Promise.all(changes.create.map((input) => adminMenuService.createOption(groupId, input)));
      } catch (error) {
        throw new PartialSaveError(error);
      }
    },
    onSettled: () => refreshMenuQueries(queryClient),
  });
}

export function useDeleteOptionGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminMenuService.deleteOptionGroup,
    onSuccess: () => refreshMenuQueries(queryClient),
    onError: alertDeleteFailed,
  });
}
