import { createMMKV } from 'react-native-mmkv';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import type { CartItem } from '@/types/cart';
import { cartItemKey } from '@/utils/cart-pricing';

/**
 * The cart lives only on the phone (the backend has no cart table). It survives
 * closing the app because zustand's `persist` saves it to MMKV, a fast
 * key-value store written in C++ (native code: needs a development build).
 */

/** The backend accepts at most 50 of one item and 50 lines per order. */
export const MAX_QUANTITY = 50;
export const MAX_LINES = 50;

/** What can change on a cart line when the menu changes (the key stays the same). */
export type CartLineUpdate = Pick<CartItem, 'unitPrice' | 'name' | 'imageUrl' | 'options'>;

type CartState = {
  items: CartItem[];
  storeId: string | null;
  note: string;
  add: (item: Omit<CartItem, 'key'>) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  /** Replaces the saved price, name, image and option names with the menu's current ones. */
  refreshLines: (updates: Record<string, CartLineUpdate>) => void;
  setStoreId: (storeId: string) => void;
  setNote: (note: string) => void;
  /** After placing an order. Keeps the chosen store for next time. */
  clear: () => void;
};

const mmkv = createMMKV({ id: 'brew-cart' });

const mmkvStorage: StateStorage = {
  getItem: (name) => mmkv.getString(name) ?? null,
  setItem: (name, value) => mmkv.set(name, value),
  removeItem: (name) => {
    mmkv.remove(name);
  },
};

const clamp = (quantity: number) => Math.max(1, Math.min(MAX_QUANTITY, quantity));

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      storeId: null,
      note: '',

      add: (item) =>
        set((state) => {
          const key = cartItemKey(
            item.productId,
            item.options.map((o) => o.id),
          );
          const existing = state.items.find((i) => i.key === key);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.key === key ? { ...i, quantity: clamp(i.quantity + item.quantity) } : i,
              ),
            };
          }
          if (state.items.length >= MAX_LINES) return state;
          return {
            items: [...state.items, { ...item, key, quantity: clamp(item.quantity) }],
          };
        }),

      setQuantity: (key, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.key !== key)
              : state.items.map((i) => (i.key === key ? { ...i, quantity: clamp(quantity) } : i)),
        })),

      remove: (key) => set((state) => ({ items: state.items.filter((i) => i.key !== key) })),
      refreshLines: (updates) =>
        set((state) => ({
          items: state.items.map((i) => (updates[i.key] ? { ...i, ...updates[i.key] } : i)),
        })),
      setStoreId: (storeId) => set({ storeId }),
      setNote: (note) => set({ note }),
      clear: () => set({ items: [], note: '' }),
    }),
    {
      name: 'cart',
      storage: createJSONStorage(() => mmkvStorage),
      // Only data is saved, not the functions.
      partialize: (state) => ({
        items: state.items,
        storeId: state.storeId,
        note: state.note,
      }),
      version: 1,
    },
  ),
);

/** Number of drinks/items, for the cart badge. */
export const useCartCount = () =>
  useCart((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));

export const useCartTotal = () =>
  useCart((state) => state.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0));
