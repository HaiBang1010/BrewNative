import { BadRequestException } from '@nestjs/common';
import type { Product } from '../menu/entities/product.entity.js';
import { priceItems } from './order-pricing.js';

const latte = {
  id: 'latte',
  name: 'Latte',
  imageUrl: null,
  basePrice: 45_000,
  isAvailable: true,
  optionGroups: [
    {
      name: 'Size',
      minSelect: 1,
      maxSelect: 1,
      options: [
        { id: 'size-m', name: 'M', priceDelta: 0, isAvailable: true },
        { id: 'size-l', name: 'L', priceDelta: 10_000, isAvailable: true },
      ],
    },
    {
      name: 'Topping',
      minSelect: 0,
      maxSelect: 2,
      options: [
        {
          id: 'pearl',
          name: 'Trân châu',
          priceDelta: 5_000,
          isAvailable: true,
        },
        { id: 'jelly', name: 'Thạch', priceDelta: 5_000, isAvailable: false },
        { id: 'cream', name: 'Kem', priceDelta: 8_000, isAvailable: true },
      ],
    },
  ],
} as unknown as Product;

const price = (optionIds: string[], quantity = 1) =>
  priceItems([{ productId: 'latte', quantity, optionIds }], [latte]);

describe('priceItems', () => {
  it('adds option deltas to the base price and multiplies by quantity', () => {
    const { items, subtotal } = price(['size-l', 'pearl', 'cream'], 2);
    expect(items[0].unitPrice).toBe(45_000 + 10_000 + 5_000 + 8_000);
    expect(items[0].lineTotal).toBe(68_000 * 2);
    expect(subtotal).toBe(136_000);
    expect(items[0].options.map((o) => o.optionName)).toEqual([
      'L',
      'Trân châu',
      'Kem',
    ]);
  });

  it('requires the mandatory group', () => {
    expect(() => price(['pearl'])).toThrow(BadRequestException);
  });

  it('enforces maxSelect', () => {
    expect(() => price(['size-m', 'size-l'])).toThrow(/choose 1 for "Size"/);
  });

  it('rejects unavailable options and foreign option ids', () => {
    expect(() => price(['size-m', 'jelly'])).toThrow(/not available/);
    expect(() => price(['size-m', 'other-product-option'])).toThrow(
      /do not belong/,
    );
  });

  it('rejects unknown or unavailable products', () => {
    expect(() =>
      priceItems([{ productId: 'nope', quantity: 1, optionIds: [] }], [latte]),
    ).toThrow(/does not exist/);
    expect(() =>
      priceItems(
        [{ productId: 'latte', quantity: 1, optionIds: ['size-m'] }],
        [{ ...latte, isAvailable: false } as Product],
      ),
    ).toThrow(/not available/);
  });
});
