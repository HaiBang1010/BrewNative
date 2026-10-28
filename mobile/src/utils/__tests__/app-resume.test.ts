import type { Order, OrderStatus } from '@/types/api';
import { REFRESH_AFTER_MS, RESTART_AFTER_MS, inProgressOrderId, resumeAction } from '../app-resume';

describe('resumeAction', () => {
  it('does nothing after a short absence', () => {
    expect(resumeAction(0)).toBe('none');
    expect(resumeAction(REFRESH_AFTER_MS - 1)).toBe('none');
  });

  it('refetches after a while, restarts after a long time', () => {
    expect(resumeAction(REFRESH_AFTER_MS)).toBe('refresh');
    expect(resumeAction(RESTART_AFTER_MS - 1)).toBe('refresh');
    expect(resumeAction(RESTART_AFTER_MS)).toBe('restart');
    expect(resumeAction(24 * 60 * 60_000)).toBe('restart');
  });

  it('refreshes before it restarts', () => {
    expect(REFRESH_AFTER_MS).toBeLessThan(RESTART_AFTER_MS);
  });
});

describe('inProgressOrderId', () => {
  const order = (id: string, status: OrderStatus, createdAt: string) => ({ id, status, createdAt }) as Order;

  it('picks the newest order not picked up yet', () => {
    expect(
      inProgressOrderId([
        order('old-ready', 'ready', '2026-10-28T08:00:00Z'),
        order('done', 'completed', '2026-10-28T10:00:00Z'),
        order('new-preparing', 'preparing', '2026-10-28T09:00:00Z'),
      ]),
    ).toBe('new-preparing');
  });

  it('is null when every order is finished', () => {
    expect(
      inProgressOrderId([
        order('a', 'completed', '2026-10-28T08:00:00Z'),
        order('b', 'cancelled', '2026-10-28T09:00:00Z'),
      ]),
    ).toBeNull();
  });
});
