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
  /** Display only; the server recomputes prices. */
  unitPrice: number;
  options: ChosenOption[];
  quantity: number;
};
