import type { OptionGroup, ProductDetail } from '@/types/api';
import type { CartItem } from '@/types/cart';
import {
  cartItemKey,
  checkCartItem,
  chosenOptions,
  defaultSelection,
  groupError,
  isSelectionValid,
  toggleOption,
  unitPrice,
} from '../cart-pricing';

const option = (id: string, priceDelta = 0, isAvailable = true) => ({
  id,
  optionGroupId: 'g',
  name: id.toUpperCase(),
  priceDelta,
  isAvailable,
  sortOrder: 0,
});

const sizeGroup: OptionGroup = {
  id: 'size',
  productId: 'p',
  name: 'Size',
  minSelect: 1,
  maxSelect: 1,
  sortOrder: 0,
  options: [option('s'), option('m', 5000), option('l', 10000)],
};

const toppingGroup: OptionGroup = {
  id: 'topping',
  productId: 'p',
  name: 'Topping',
  minSelect: 0,
  maxSelect: 2,
  sortOrder: 1,
  options: [option('pearl', 7000), option('jelly', 5000), option('pudding', 8000)],
};

function product(overrides: Partial<ProductDetail> = {}): ProductDetail {
  return {
    id: 'p',
    categoryId: 'c',
    name: 'Trà sữa',
    description: null,
    imageUrl: null,
    basePrice: 40000,
    isAvailable: true,
    sortOrder: 0,
    optionGroups: [structuredClone(sizeGroup), structuredClone(toppingGroup)],
    ...overrides,
  };
}

describe('defaultSelection', () => {
  it('picks the first available option of required single-choice groups only', () => {
    const p = product();
    p.optionGroups[0].options[0].isAvailable = false;
    expect(defaultSelection(p)).toEqual({ size: ['m'], topping: [] });
  });
});

describe('toggleOption', () => {
  it('behaves like a radio button when one option may be picked', () => {
    expect(toggleOption({ size: ['s'] }, sizeGroup, 'l')).toEqual({ size: ['l'] });
  });

  it("doesn't empty a required radio group", () => {
    expect(toggleOption({ size: ['s'] }, sizeGroup, 's')).toEqual({ size: ['s'] });
  });

  it('behaves like checkboxes and never exceeds maxSelect', () => {
    let selection = toggleOption({}, toppingGroup, 'pearl');
    selection = toggleOption(selection, toppingGroup, 'jelly');
    selection = toggleOption(selection, toppingGroup, 'pudding');
    expect(selection.topping).toEqual(['pearl', 'jelly']);
    expect(toggleOption(selection, toppingGroup, 'pearl').topping).toEqual(['jelly']);
  });
});

describe('groupError / isSelectionValid', () => {
  it('asks for a required choice', () => {
    expect(groupError(sizeGroup, {})).toBe('Chọn size');
    expect(isSelectionValid(product(), { topping: [] })).toBe(false);
  });

  it('accepts a complete selection', () => {
    expect(groupError(sizeGroup, { size: ['m'] })).toBeNull();
    expect(isSelectionValid(product(), { size: ['m'], topping: [] })).toBe(true);
  });
});

describe('chosenOptions / unitPrice', () => {
  it('lists options in menu order and adds their prices to the base price', () => {
    const options = chosenOptions(product(), { size: ['l'], topping: ['jelly', 'pearl'] });
    expect(options.map((o) => o.id)).toEqual(['l', 'pearl', 'jelly']);
    expect(unitPrice(40000, options)).toBe(40000 + 10000 + 7000 + 5000);
  });
});

describe('cartItemKey', () => {
  it('is the same whatever the order the options were picked in', () => {
    expect(cartItemKey('p', ['b', 'a'])).toBe(cartItemKey('p', ['a', 'b']));
    expect(cartItemKey('p', ['a'])).not.toBe(cartItemKey('p', ['b']));
  });
});

describe('checkCartItem', () => {
  // Added to the cart when size L cost +5,000 and the base price was 40,000.
  const item: CartItem = {
    key: 'p|l',
    productId: 'p',
    name: 'Trà sữa',
    imageUrl: null,
    unitPrice: 45000,
    options: [{ id: 'l', groupName: 'Size', name: 'L', priceDelta: 5000 }],
    quantity: 2,
  };

  it("returns today's price, including option prices that changed", () => {
    const result = checkCartItem(item, product({ basePrice: 42000 }));
    expect(result).toMatchObject({ ok: true, unitPrice: 42000 + 10000 });
  });

  it('flags a product that no longer exists or is sold out', () => {
    expect(checkCartItem(item, null)).toEqual({ ok: false, reason: 'Món này không còn bán' });
    expect(checkCartItem(item, product({ isAvailable: false }))).toEqual({
      ok: false,
      reason: 'Hết hàng',
    });
  });

  it('flags a sold-out option', () => {
    const p = product();
    p.optionGroups[0].options[2].isAvailable = false;
    expect(checkCartItem(item, p)).toEqual({ ok: false, reason: 'L đã hết' });
  });

  it('flags options that no longer fit the product (removed option, new required group)', () => {
    const removed = product();
    removed.optionGroups[0].options.pop();
    expect(checkCartItem(item, removed).ok).toBe(false);

    const newGroup = product();
    newGroup.optionGroups.push({ ...structuredClone(sizeGroup), id: 'sugar', name: 'Đường' });
    expect(checkCartItem(item, newGroup).ok).toBe(false);
  });
});
