import type { Order, OrderStatus } from '@/types/api';

/**
 * What the app does when it comes back to the foreground, by how long it was away
 * (in the background, not killed: a killed app cold-starts with the splash anyway).
 */

// TESTING values. For release: REFRESH_AFTER_MS = 20 * MINUTE, RESTART_AFTER_MS = 60 * MINUTE.
const MINUTE = 60_000;
/** Away at least this long: refetch all data, stay on the same screen. */
export const REFRESH_AFTER_MS = 2 * MINUTE;
/** Away at least this long: splash again, back to the home screen, refetch all data. */
export const RESTART_AFTER_MS = 4 * MINUTE;

export type ResumeAction = 'none' | 'refresh' | 'restart';

export function resumeAction(awayMs: number): ResumeAction {
  if (awayMs >= RESTART_AFTER_MS) return 'restart';
  if (awayMs >= REFRESH_AFTER_MS) return 'refresh';
  return 'none';
}

/** Paid but not picked up yet: what a customer coming back most likely wants to see. */
const IN_PROGRESS: readonly OrderStatus[] = ['paid', 'accepted', 'preparing', 'ready'];

/** The customer's newest order still in progress, if any. */
export function inProgressOrderId(orders: Order[]): string | null {
  const active = orders.filter((order) => IN_PROGRESS.includes(order.status));
  if (!active.length) return null;
  return active.reduce((newest, order) => (order.createdAt > newest.createdAt ? order : newest)).id;
}
