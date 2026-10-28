import type { Store } from '@/types/api';
import { formatShortDate, formatVndShort } from '../format';
import { openingHoursSummary, storeDraft, storeDraftErrors, timeInput, toStoreInput } from '../admin-stores';

const store: Store = {
  id: 's1',
  name: 'Brew Nguyễn Huệ',
  address: '42 Nguyễn Huệ',
  latitude: 10.7739,
  longitude: 106.7036,
  phone: '028 3822 0001',
  imageUrl: null,
  isActive: true,
  openingHours: { mon: { open: '07:00', close: '22:00' }, sun: null },
};

describe('store form', () => {
  it('loads the saved hours; a day missing from them starts open', () => {
    const draft = storeDraft(store);
    expect(draft.hours.mon).toEqual({ isOpen: true, open: '07:00', close: '22:00' });
    expect(draft.hours.sun.isOpen).toBe(false);
    expect(draft.hours.tue.isOpen).toBe(true);
  });

  it('turns typed digits into a time', () => {
    expect(timeInput('7')).toBe('7');
    expect(timeInput('073')).toBe('07:3');
    expect(timeInput('0730')).toBe('07:30');
    expect(timeInput('07:305')).toBe('07:30');
  });

  it('refuses bad times and closing before opening', () => {
    const draft = storeDraft(store);
    expect(storeDraftErrors({ ...draft, hours: { ...draft.hours, tue: { isOpen: true, open: '7:3', close: '22:00' } } }).hours).toBe(
      'Thứ 3: nhập giờ dạng 07:30',
    );
    expect(storeDraftErrors({ ...draft, hours: { ...draft.hours, wed: { isOpen: true, open: '22:00', close: '07:00' } } }).hours).toBe(
      'Thứ 4: giờ đóng cửa phải sau giờ mở cửa',
    );
    // A closed day isn't checked.
    expect(storeDraftErrors({ ...draft, hours: { ...draft.hours, sun: { isOpen: false, open: '', close: '' } } })).toEqual({});
  });

  it('checks the coordinates, accepting a decimal comma', () => {
    const draft = storeDraft(store);
    expect(storeDraftErrors({ ...draft, latitude: '95' }).latitude).toBeDefined();
    expect(storeDraftErrors({ ...draft, longitude: 'abc' }).longitude).toBeDefined();
    expect(toStoreInput({ ...draft, latitude: '10,5' }).latitude).toBe(10.5);
  });

  it('sends every day, closed ones as null, and an empty phone as null', () => {
    const input = toStoreInput({ ...storeDraft(store), phone: ' ' });
    expect(input.phone).toBeNull();
    expect(Object.keys(input.openingHours)).toHaveLength(7);
    expect(input.openingHours.sun).toBeNull();
  });
});

describe('openingHoursSummary', () => {
  const every = (day: { open: string; close: string } | null) =>
    Object.fromEntries(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((k) => [k, day]));

  it('says it once when every day is the same', () => {
    expect(openingHoursSummary(every({ open: '07:00', close: '22:00' }))).toBe('07:00–22:00 mỗi ngày');
    expect(openingHoursSummary(every(null))).toBe('Nghỉ cả tuần');
    expect(openingHoursSummary(null)).toBe('Chưa có giờ mở cửa');
  });

  it('lists the days when they differ', () => {
    expect(openingHoursSummary({ ...every({ open: '07:00', close: '22:00' }), sun: null })).toContain('Chủ nhật: nghỉ');
  });
});

describe('chart labels', () => {
  it('shortens amounts', () => {
    expect(formatVndShort(950_000)).toBe('950k');
    expect(formatVndShort(1_250_000)).toBe('1,3tr');
    expect(formatVndShort(500)).toBe('500');
  });

  it('shows a day as dd/mm', () => {
    expect(formatShortDate('2026-10-28')).toBe('28/10');
  });
});
