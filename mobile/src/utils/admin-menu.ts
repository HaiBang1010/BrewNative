import type {
  CategorySummary,
  Option,
  OptionGroup,
  OptionGroupInput,
  OptionInput,
  Product,
  ProductInput,
} from '@/types/api';
import { uuid } from './uuid';

/**
 * Pure logic of the admin menu screens (app/admin/menu): what the forms edit,
 * how they are checked, and which requests saving them takes.
 */

// ---------------------------------------------------------------- list

export type CategorySection = { category: CategorySummary; products: Product[] };

/** Products under their category, in the categories' order. Empty categories are kept. */
export function groupByCategory(categories: CategorySummary[], products: Product[]): CategorySection[] {
  return categories.map((category) => ({
    category,
    products: products.filter((product) => product.categoryId === category.id),
  }));
}

// ---------------------------------------------------------------- product

/** The product form. `basePrice` is null while the field is empty. */
export type ProductDraft = {
  name: string;
  description: string;
  basePrice: number | null;
  categoryId: string | null;
  isAvailable: boolean;
  sortOrder: number;
};

export function productDraft(product?: Product, categoryId?: string): ProductDraft {
  return {
    name: product?.name ?? '',
    description: product?.description ?? '',
    basePrice: product?.basePrice ?? null,
    categoryId: product?.categoryId ?? categoryId ?? null,
    isAvailable: product?.isAvailable ?? true,
    sortOrder: product?.sortOrder ?? 0,
  };
}

export type ProductDraftErrors = Partial<Record<'name' | 'basePrice' | 'categoryId', string>>;

/** Same limits as the backend, so the admin sees them before saving. */
export function productDraftErrors(draft: ProductDraft): ProductDraftErrors {
  const errors: ProductDraftErrors = {};
  if (!draft.name.trim()) errors.name = 'Nhập tên món';
  else if (draft.name.trim().length > 150) errors.name = 'Tên tối đa 150 ký tự';
  if (draft.basePrice === null) errors.basePrice = 'Nhập giá';
  else if (draft.basePrice > 100_000_000) errors.basePrice = 'Giá quá lớn';
  if (!draft.categoryId) errors.categoryId = 'Chọn danh mục';
  return errors;
}

/** Only call once productDraftErrors(draft) is empty. */
export function toProductInput(draft: ProductDraft): ProductInput {
  return {
    name: draft.name.trim(),
    description: draft.description.trim() || null,
    basePrice: draft.basePrice ?? 0,
    categoryId: draft.categoryId!,
    isAvailable: draft.isAvailable,
    sortOrder: draft.sortOrder,
  };
}

// ---------------------------------------------------------------- option group

/** One option row of the form. `id` is null until it is saved. */
export type OptionDraft = {
  key: string;
  id: string | null;
  name: string;
  priceDelta: number | null;
  isAvailable: boolean;
};

export type OptionGroupDraft = {
  name: string;
  minSelect: number;
  maxSelect: number;
  options: OptionDraft[];
};

export function newOptionDraft(): OptionDraft {
  return { key: uuid(), id: null, name: '', priceDelta: 0, isAvailable: true };
}

/** A new group starts like a size picker: pick exactly one. */
export function optionGroupDraft(group?: OptionGroup): OptionGroupDraft {
  if (!group) return { name: '', minSelect: 1, maxSelect: 1, options: [newOptionDraft()] };
  return {
    name: group.name,
    minSelect: group.minSelect,
    maxSelect: group.maxSelect,
    options: group.options.map((option) => ({
      key: option.id,
      id: option.id,
      name: option.name,
      priceDelta: option.priceDelta,
      isAvailable: option.isAvailable,
    })),
  };
}

/** The first problem of the form, or null if it can be saved. */
export function optionGroupDraftError(draft: OptionGroupDraft): string | null {
  if (!draft.name.trim()) return 'Nhập tên nhóm, ví dụ "Size"';
  if (!draft.options.length) return 'Thêm ít nhất một lựa chọn';
  if (draft.options.some((option) => !option.name.trim())) return 'Lựa chọn nào cũng cần có tên';
  if (draft.maxSelect > draft.options.length) {
    return `Chỉ có ${draft.options.length} lựa chọn, không thể cho chọn tối đa ${draft.maxSelect}`;
  }
  if (draft.minSelect > draft.maxSelect) return 'Số bắt buộc chọn không được lớn hơn số tối đa';
  const available = draft.options.filter((option) => option.isAvailable).length;
  if (draft.minSelect > available) return 'Không đủ lựa chọn còn hàng cho số bắt buộc chọn';
  return null;
}

export function toOptionGroupInput(draft: OptionGroupDraft, sortOrder?: number): OptionGroupInput {
  return {
    name: draft.name.trim(),
    minSelect: draft.minSelect,
    maxSelect: draft.maxSelect,
    ...(sortOrder !== undefined && { sortOrder }),
  };
}

export type OptionChanges = {
  remove: string[];
  update: { id: string; input: Partial<OptionInput> }[];
  create: OptionInput[];
};

/**
 * The requests that turn the saved options into the form's rows. Rows keep the
 * order they have on screen (sortOrder = position). Unchanged rows send nothing.
 */
export function planOptionChanges(saved: Option[], rows: OptionDraft[]): OptionChanges {
  const kept = new Set(rows.flatMap((row) => (row.id ? [row.id] : [])));
  const changes: OptionChanges = {
    remove: saved.filter((option) => !kept.has(option.id)).map((option) => option.id),
    update: [],
    create: [],
  };

  rows.forEach((row, sortOrder) => {
    const input: OptionInput = {
      name: row.name.trim(),
      priceDelta: row.priceDelta ?? 0,
      isAvailable: row.isAvailable,
      sortOrder,
    };
    const before = row.id ? saved.find((option) => option.id === row.id) : undefined;
    if (!before) {
      changes.create.push(input);
      return;
    }
    const changed = (Object.keys(input) as (keyof OptionInput)[]).filter((field) => input[field] !== before[field]);
    if (changed.length) {
      changes.update.push({ id: before.id, input: Object.fromEntries(changed.map((f) => [f, input[f]])) });
    }
  });
  return changes;
}

/** A copy of `items` with the item at `from` moved to `to`. */
export function moveItem<T>(items: T[], from: number, to: number): T[] {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Removes an option row, keeping minSelect ≤ maxSelect ≤ the number of rows left. */
export function removeOption(draft: OptionGroupDraft, key: string): OptionGroupDraft {
  const options = draft.options.filter((option) => option.key !== key);
  const maxSelect = Math.max(1, Math.min(draft.maxSelect, options.length));
  return { ...draft, options, maxSelect, minSelect: Math.min(draft.minSelect, maxSelect) };
}
