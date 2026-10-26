import { BadRequestException } from '@nestjs/common';
import type { Product } from '../menu/entities/product.entity.js';

export type RequestedItem = {
  productId: string;
  quantity: number;
  optionIds: string[];
};

export type PricedOption = {
  optionId: string;
  groupName: string;
  optionName: string;
  priceDelta: number;
};

export type PricedItem = {
  productId: string;
  productName: string;
  productImageUrl: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  options: PricedOption[];
};

/**
 * Prices a cart from the current menu. Never trusts prices from the app.
 * `products` must be loaded with optionGroups.options.
 * Throws BadRequestException with a readable reason when the cart is invalid.
 */
export function priceItems(
  requested: RequestedItem[],
  products: Product[],
): { items: PricedItem[]; subtotal: number } {
  const byId = new Map(products.map((p) => [p.id, p]));

  const items = requested.map((req): PricedItem => {
    const product = byId.get(req.productId);
    if (!product) {
      throw new BadRequestException(`Product ${req.productId} does not exist`);
    }
    if (!product.isAvailable) {
      throw new BadRequestException(`"${product.name}" is not available`);
    }

    const chosen = new Set(req.optionIds);
    if (chosen.size !== req.optionIds.length) {
      throw new BadRequestException(`"${product.name}": duplicate options`);
    }

    const options: PricedOption[] = [];
    for (const group of product.optionGroups) {
      const picked = group.options.filter((o) => chosen.has(o.id));
      if (picked.length < group.minSelect || picked.length > group.maxSelect) {
        throw new BadRequestException(
          group.minSelect === group.maxSelect
            ? `"${product.name}": choose ${group.minSelect} for "${group.name}"`
            : `"${product.name}": choose ${group.minSelect}-${group.maxSelect} for "${group.name}"`,
        );
      }
      for (const option of picked) {
        if (!option.isAvailable) {
          throw new BadRequestException(
            `"${product.name}": "${option.name}" is not available`,
          );
        }
        chosen.delete(option.id);
        options.push({
          optionId: option.id,
          groupName: group.name,
          optionName: option.name,
          priceDelta: option.priceDelta,
        });
      }
    }
    if (chosen.size) {
      throw new BadRequestException(
        `"${product.name}": some options do not belong to this product`,
      );
    }

    const unitPrice =
      product.basePrice + options.reduce((sum, o) => sum + o.priceDelta, 0);
    return {
      productId: product.id,
      productName: product.name,
      productImageUrl: product.imageUrl,
      unitPrice,
      quantity: req.quantity,
      lineTotal: unitPrice * req.quantity,
      options,
    };
  });

  return {
    items,
    subtotal: items.reduce((sum, item) => sum + item.lineTotal, 0),
  };
}
