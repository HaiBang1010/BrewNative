import { OrderStatus } from './entities/order-status.enum.js';

/** Who is changing the status. "system" = payment webhook, timeout job. */
export type StatusActor = 'customer' | 'staff' | 'system';

/** Allowed transitions and who may make them. Matches the state diagram in docs/data-model-and-flow.md. */
const TRANSITIONS: Record<
  OrderStatus,
  Partial<Record<OrderStatus, StatusActor[]>>
> = {
  [OrderStatus.PendingPayment]: {
    [OrderStatus.Paid]: ['system'],
    [OrderStatus.Cancelled]: ['customer', 'system'],
  },
  [OrderStatus.Paid]: {
    [OrderStatus.Accepted]: ['staff'],
    // TODO(stripe): refund the payment when staff rejects a paid order.
    [OrderStatus.Cancelled]: ['staff'],
  },
  [OrderStatus.Accepted]: { [OrderStatus.Preparing]: ['staff'] },
  [OrderStatus.Preparing]: { [OrderStatus.Ready]: ['staff'] },
  [OrderStatus.Ready]: { [OrderStatus.Completed]: ['staff'] },
  [OrderStatus.Completed]: {},
  [OrderStatus.Cancelled]: {},
};

export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
  actor: StatusActor,
): boolean {
  return TRANSITIONS[from][to]?.includes(actor) ?? false;
}

/** Statuses `actor` can move an order to from `from`. Useful for showing buttons in the admin UI. */
export function nextStatuses(
  from: OrderStatus,
  actor: StatusActor,
): OrderStatus[] {
  return (Object.entries(TRANSITIONS[from]) as [OrderStatus, StatusActor[]][])
    .filter(([, actors]) => actors.includes(actor))
    .map(([to]) => to);
}
