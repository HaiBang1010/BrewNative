import { useQueries } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { queryKeys } from '@/lib/query-keys';
import { menuService } from '@/services/menu.service';
import { useCart, type CartLineUpdate } from '@/stores/cart';
import type { ProductDetail } from '@/types/api';
import type { CartLineCheck, ChosenOption, PriceChange } from '@/types/cart';
import { ApiError } from '@/utils/api-error';
import { checkCartItem } from '@/utils/cart-pricing';

const sameOptions = (a: ChosenOption[], b: ChosenOption[]) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Checks every cart line against the current menu, for the cart screen.
 *
 * Loads the detail of each product in the cart (the menu list has no options or
 * option prices), always fresh when the cart opens. Then:
 * - lines that can't be ordered any more get a `reason` ("Hết hàng"...);
 * - lines whose price, name or image changed are updated in the cart, and each
 *   price change is returned once in `priceChanges` so the screen can tell the customer.
 */
export function useCartCheck() {
  const items = useCart((state) => state.items);
  const refreshLines = useCart((state) => state.refreshLines);
  const [priceChanges, setPriceChanges] = useState<PriceChange[]>([]);

  const productIds = useMemo(() => [...new Set(items.map((i) => i.productId))], [items]);
  const products = useQueries({
    queries: productIds.map((id) => ({
      queryKey: queryKeys.product(id),
      queryFn: ({ signal }: { signal: AbortSignal }) => menuService.getProduct(id, signal),
      // The price must be today's, not the one cached when the product screen was opened.
      staleTime: 0,
    })),
    combine: (results) => ({
      /** productId -> product, null if it no longer exists. Missing while loading or offline. */
      byId: new Map<string, ProductDetail | null>(
        results.flatMap((r, i): [string, ProductDetail | null][] => {
          if (r.data) return [[productIds[i], r.data]];
          if (r.error instanceof ApiError && r.error.status === 404) return [[productIds[i], null]];
          return [];
        }),
      ),
      // isFetching, not isPending: a product opened earlier is cached, maybe with an old price.
      isChecking: results.some((r) => r.isFetching),
      refetch: () => Promise.all(results.map((r) => r.refetch())),
    }),
  });

  /** cart line key -> check. A line is missing until its product has loaded. */
  const checks = useMemo(() => {
    const map = new Map<string, CartLineCheck>();
    for (const item of items) {
      const product = products.byId.get(item.productId);
      if (product !== undefined) map.set(item.key, checkCartItem(item, product));
    }
    return map;
  }, [items, products.byId]);

  // Save today's prices into the cart (so the total, the badge and the next visit agree).
  useEffect(() => {
    const updates: Record<string, CartLineUpdate> = {};
    const changes: PriceChange[] = [];
    for (const item of items) {
      const check = checks.get(item.key);
      if (!check?.ok) continue;
      if (
        check.unitPrice !== item.unitPrice ||
        check.name !== item.name ||
        check.imageUrl !== item.imageUrl ||
        !sameOptions(check.options, item.options)
      ) {
        const { unitPrice, name, imageUrl, options } = check;
        updates[item.key] = { unitPrice, name, imageUrl, options };
      }
      if (check.unitPrice !== item.unitPrice) {
        changes.push({ name: check.name, from: item.unitPrice, to: check.unitPrice });
      }
    }
    if (changes.length) setPriceChanges((prev) => [...prev, ...changes]);
    if (Object.keys(updates).length) refreshLines(updates);
  }, [checks, items, refreshLines]);

  const blocked = items.filter((item) => checks.get(item.key)?.ok === false);

  return {
    checks,
    /** Products still loading: don't let the customer pay with prices not checked yet. */
    isChecking: products.isChecking,
    /** Lines that can't be ordered; paying is disabled until they're removed. */
    blockedCount: blocked.length,
    priceChanges,
    dismissPriceChanges: () => setPriceChanges([]),
    refetch: products.refetch,
  };
}
