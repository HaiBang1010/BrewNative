import { describe, expect, it } from 'vitest';
import { fillDays, lastDays, shopDate } from './stats-days.js';

describe('shopDate', () => {
  it('uses the Vietnam date, not UTC', () => {
    // 2026-10-28 20:00 UTC is already the 29th in Vietnam (UTC+7).
    expect(shopDate(new Date('2026-10-28T20:00:00Z'))).toBe('2026-10-29');
    expect(shopDate(new Date('2026-10-28T16:59:00Z'))).toBe('2026-10-28');
  });
});

describe('lastDays', () => {
  it('ends with the given day, oldest first, across a month end', () => {
    expect(lastDays('2026-11-02', 4)).toEqual([
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
    ]);
    expect(lastDays('2026-10-28', 1)).toEqual(['2026-10-28']);
  });
});

describe('fillDays', () => {
  it('adds zero days between days with sales', () => {
    expect(
      fillDays(
        ['2026-10-27', '2026-10-28', '2026-10-29'],
        [{ date: '2026-10-28', revenue: 90_000, orders: 2 }],
      ),
    ).toEqual([
      { date: '2026-10-27', revenue: 0, orders: 0 },
      { date: '2026-10-28', revenue: 90_000, orders: 2 },
      { date: '2026-10-29', revenue: 0, orders: 0 },
    ]);
  });
});
