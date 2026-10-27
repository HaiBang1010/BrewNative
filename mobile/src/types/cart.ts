/** optionGroupId -> selected option ids */
export type Selection = Record<string, string[]>;

export type ChosenOption = {
  id: string;
  groupName: string;
  name: string;
  priceDelta: number;
};

/** One line in the cart (stores/cart.ts). */
export type CartItem = {
  /** productId + option ids; identical choices share one line. */
  key: string;
  productId: string;
  name: string;
  imageUrl: string | null;
  /**
   * Price when the line was added, refreshed from the menu when the cart opens
   * (hooks/cart-check.ts). Display only: the server recomputes prices.
   */
  unitPrice: number;
  options: ChosenOption[];
  quantity: number;
};

/**
 * A cart line checked against the current menu (utils/cart-pricing.ts `checkCartItem`).
 * `ok`: can be ordered, with today's price. Otherwise `reason` says why not.
 */
export type CartLineCheck =
  | { ok: true; unitPrice: number; name: string; imageUrl: string | null; options: ChosenOption[] }
  | { ok: false; reason: string };

/** A line whose price changed since it was added, shown to the customer once. */
export type PriceChange = { name: string; from: number; to: number };
