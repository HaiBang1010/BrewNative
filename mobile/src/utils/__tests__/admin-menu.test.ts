import type { CategorySummary, Option, OptionGroup, Product } from '@/types/api';
import {
  groupByCategory,
  moveItem,
  newOptionDraft,
  optionGroupDraft,
  optionGroupDraftError,
  planOptionChanges,
  productDraft,
  productDraftErrors,
  removeOption,
  toProductInput,
  type OptionGroupDraft,
} from '../admin-menu';

const category = (id: string): CategorySummary => ({ id, name: id, slug: id, imageUrl: null, sortOrder: 0 });

const product = (id: string, categoryId: string): Product => ({
  id,
  categoryId,
  name: id,
  description: null,
  imageUrl: null,
  basePrice: 30000,
  isAvailable: true,
  sortOrder: 0,
});

const option = (id: string, priceDelta = 0, sortOrder = 0): Option => ({
  id,
  optionGroupId: 'size',
  name: id.toUpperCase(),
  priceDelta,
  isAvailable: true,
  sortOrder,
});

const sizeGroup: OptionGroup = {
  id: 'size',
  productId: 'p',
  name: 'Size',
  minSelect: 1,
  maxSelect: 1,
  sortOrder: 0,
  options: [option('s', 0, 0), option('m', 5000, 1), option('l', 10000, 2)],
};

describe('groupByCategory', () => {
  it('keeps the categories order and empty categories', () => {
    const sections = groupByCategory(
      [category('coffee'), category('tea'), category('cake')],
      [product('latte', 'coffee'), product('peach', 'tea'), product('mocha', 'coffee')],
    );
    expect(sections.map((s) => [s.category.id, s.products.map((p) => p.id)])).toEqual([
      ['coffee', ['latte', 'mocha']],
      ['tea', ['peach']],
      ['cake', []],
    ]);
  });
});

describe('product form', () => {
  it('starts a new product in the given category, available', () => {
    expect(productDraft(undefined, 'tea')).toMatchObject({ categoryId: 'tea', isAvailable: true, basePrice: null });
  });

  it('asks for a name, a price and a category', () => {
    expect(productDraftErrors({ ...productDraft(), name: '  ' })).toEqual({
      name: 'Nhập tên món',
      basePrice: 'Nhập giá',
      categoryId: 'Chọn danh mục',
    });
  });

  it('accepts a free product (price 0) and sends an empty description as null', () => {
    const draft = { ...productDraft(undefined, 'tea'), name: ' Nước lọc ', basePrice: 0, description: '  ' };
    expect(productDraftErrors(draft)).toEqual({});
    expect(toProductInput(draft)).toMatchObject({ name: 'Nước lọc', basePrice: 0, description: null });
  });
});

describe('option group form', () => {
  const draftOf = (changes: Partial<OptionGroupDraft> = {}) => ({ ...optionGroupDraft(sizeGroup), ...changes });

  it('is valid as loaded', () => {
    expect(optionGroupDraftError(draftOf())).toBeNull();
  });

  it('refuses rules the customer could not satisfy', () => {
    expect(optionGroupDraftError(draftOf({ name: '' }))).toMatch(/tên nhóm/);
    expect(optionGroupDraftError(draftOf({ maxSelect: 4 }))).toMatch(/Chỉ có 3 lựa chọn/);
    expect(optionGroupDraftError(draftOf({ minSelect: 2, maxSelect: 1 }))).toMatch(/không được lớn hơn/);
    const allSoldOut = draftOf().options.map((o) => ({ ...o, isAvailable: false }));
    expect(optionGroupDraftError(draftOf({ options: allSoldOut }))).toMatch(/còn hàng/);
    expect(optionGroupDraftError(draftOf({ options: [{ ...newOptionDraft(), name: ' ' }] }))).toMatch(/cần có tên/);
  });

  it('keeps min ≤ max ≤ rows when a row is removed', () => {
    const draft = draftOf({ minSelect: 3, maxSelect: 3 });
    const after = removeOption(draft, 'l');
    expect(after.options.map((o) => o.id)).toEqual(['s', 'm']);
    expect([after.minSelect, after.maxSelect]).toEqual([2, 2]);
  });

  it('moves a row', () => {
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
  });
});

describe('planOptionChanges', () => {
  const rows = () => optionGroupDraft(sizeGroup).options;

  it('sends nothing for an unchanged form', () => {
    expect(planOptionChanges(sizeGroup.options, rows())).toEqual({ remove: [], update: [], create: [] });
  });

  it('deletes removed rows, patches only changed fields, creates new rows', () => {
    const [s, m] = rows();
    const extra = { ...newOptionDraft(), name: ' XL ', priceDelta: 15000 };
    const changes = planOptionChanges(sizeGroup.options, [s, { ...m, priceDelta: 6000 }, extra]);

    expect(changes.remove).toEqual(['l']);
    expect(changes.update).toEqual([{ id: 'm', input: { priceDelta: 6000 } }]);
    expect(changes.create).toEqual([{ name: 'XL', priceDelta: 15000, isAvailable: true, sortOrder: 2 }]);
  });

  it('saves the order shown on screen', () => {
    const [s, m, l] = rows();
    const changes = planOptionChanges(sizeGroup.options, [l, s, m]);
    expect(changes.update).toEqual([
      { id: 'l', input: { sortOrder: 0 } },
      { id: 's', input: { sortOrder: 1 } },
      { id: 'm', input: { sortOrder: 2 } },
    ]);
  });

  it('treats an empty price as 0', () => {
    const [s, m, l] = rows();
    const changes = planOptionChanges(sizeGroup.options, [s, m, { ...l, priceDelta: null }]);
    expect(changes.update).toEqual([{ id: 'l', input: { priceDelta: 0 } }]);
  });
});
