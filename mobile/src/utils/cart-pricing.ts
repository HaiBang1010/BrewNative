import type { OptionGroup, ProductDetail } from '@/types/api';
import type { CartItem, CartLineCheck, ChosenOption, Selection } from '@/types/cart';

/**
 * Pure helpers for choosing options on the product screen. No React Native
 * imports, so they can be tested with plain Node.
 *
 * The app's prices are only for display: the backend recomputes every price
 * when the order is created (backend/src/orders/order-pricing.ts).
 */

/** Required single-choice groups start with their first available option (e.g. Size S). */
export function defaultSelection(product: ProductDetail): Selection {
  const selection: Selection = {};
  for (const group of product.optionGroups) {
    const first = group.options.find((o) => o.isAvailable);
    selection[group.id] = group.minSelect >= 1 && group.maxSelect === 1 && first ? [first.id] : [];
  }
  return selection;
}

/**
 * Taps an option: radio behaviour when only one may be picked, checkbox otherwise.
 * Never exceeds maxSelect.
 */
export function toggleOption(
  selection: Selection,
  group: OptionGroup,
  optionId: string,
): Selection {
  const current = selection[group.id] ?? [];
  let next: string[];
  if (current.includes(optionId)) {
    // A required radio group can't be emptied by tapping its selected option.
    next =
      group.maxSelect === 1 && group.minSelect >= 1
        ? current
        : current.filter((id) => id !== optionId);
  } else if (group.maxSelect === 1) {
    next = [optionId];
  } else if (current.length < group.maxSelect) {
    next = [...current, optionId];
  } else {
    next = current;
  }
  return { ...selection, [group.id]: next };
}

/** Message for a group whose selection is incomplete, or null if fine. */
export function groupError(group: OptionGroup, selection: Selection): string | null {
  const count = (selection[group.id] ?? []).length;
  if (count < group.minSelect) {
    return group.minSelect === 1
      ? `Chọn ${group.name.toLowerCase()}`
      : `Chọn ít nhất ${group.minSelect}`;
  }
  if (count > group.maxSelect) return `Chọn tối đa ${group.maxSelect}`;
  return null;
}

export function isSelectionValid(product: ProductDetail, selection: Selection): boolean {
  return product.optionGroups.every((group) => groupError(group, selection) === null);
}

/** Selected options in menu order, with the names needed to show them in the cart. */
export function chosenOptions(product: ProductDetail, selection: Selection): ChosenOption[] {
  return product.optionGroups.flatMap((group) =>
    group.options
      .filter((option) => (selection[group.id] ?? []).includes(option.id))
      .map((option) => ({
        id: option.id,
        groupName: group.name,
        name: option.name,
        priceDelta: option.priceDelta,
      })),
  );
}

export function unitPrice(basePrice: number, options: ChosenOption[]): number {
  return basePrice + options.reduce((sum, option) => sum + option.priceDelta, 0);
}

/** Same product with the same options = same cart line (quantities add up). */
export function cartItemKey(productId: string, optionIds: string[]): string {
  return [productId, ...[...optionIds].sort()].join('|');
}

/**
 * Checks a saved cart line against the product as it is now, with the same rules
 * the backend applies when the order is created (backend/src/orders/order-pricing.ts).
 * The cart keeps the price from when the line was added, and it survives closing the
 * app: in the meantime the shop may have changed a price or run out of something.
 *
 * `product` is null when the product no longer exists.
 */
export function checkCartItem(item: CartItem, product: ProductDetail | null): CartLineCheck {
  if (!product) return { ok: false, reason: 'Món này không còn bán' };
  if (!product.isAvailable) return { ok: false, reason: 'Hết hàng' };

  const chosen = new Set(item.options.map((o) => o.id));
  const options: ChosenOption[] = [];
  for (const group of product.optionGroups) {
    const picked = group.options.filter((o) => chosen.has(o.id));
    if (picked.length < group.minSelect || picked.length > group.maxSelect) {
      return { ok: false, reason: 'Tùy chọn đã thay đổi, hãy chọn lại món' };
    }
    for (const option of picked) {
      if (!option.isAvailable) return { ok: false, reason: `${option.name} đã hết` };
      chosen.delete(option.id);
      options.push({
        id: option.id,
        groupName: group.name,
        name: option.name,
        priceDelta: option.priceDelta,
      });
    }
  }
  // An option that was removed from the product.
  if (chosen.size) return { ok: false, reason: 'Tùy chọn đã thay đổi, hãy chọn lại món' };

  return {
    ok: true,
    unitPrice: unitPrice(product.basePrice, options),
    name: product.name,
    imageUrl: product.imageUrl,
    options,
  };
}
