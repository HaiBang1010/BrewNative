import { OrderStatus } from './entities/order-status.enum.js';
import { canTransition, nextStatuses } from './order-status.js';

describe('order status transitions', () => {
  it('lets the customer cancel only before payment', () => {
    expect(
      canTransition(
        OrderStatus.PendingPayment,
        OrderStatus.Cancelled,
        'customer',
      ),
    ).toBe(true);
    expect(
      canTransition(OrderStatus.Paid, OrderStatus.Cancelled, 'customer'),
    ).toBe(false);
  });

  it('only lets the system mark an order paid', () => {
    expect(
      canTransition(OrderStatus.PendingPayment, OrderStatus.Paid, 'system'),
    ).toBe(true);
    expect(
      canTransition(OrderStatus.PendingPayment, OrderStatus.Paid, 'staff'),
    ).toBe(false);
  });

  it('walks staff through the happy path in order', () => {
    expect(canTransition(OrderStatus.Paid, OrderStatus.Accepted, 'staff')).toBe(
      true,
    );
    expect(
      canTransition(OrderStatus.Accepted, OrderStatus.Preparing, 'staff'),
    ).toBe(true);
    expect(
      canTransition(OrderStatus.Preparing, OrderStatus.Ready, 'staff'),
    ).toBe(true);
    expect(
      canTransition(OrderStatus.Ready, OrderStatus.Completed, 'staff'),
    ).toBe(true);
  });

  it('rejects skipping steps and leaving final states', () => {
    expect(canTransition(OrderStatus.Paid, OrderStatus.Ready, 'staff')).toBe(
      false,
    );
    expect(
      canTransition(OrderStatus.Completed, OrderStatus.Ready, 'staff'),
    ).toBe(false);
    expect(nextStatuses(OrderStatus.Cancelled, 'staff')).toEqual([]);
  });

  it('lists the next statuses for staff', () => {
    expect(nextStatuses(OrderStatus.Paid, 'staff')).toEqual([
      OrderStatus.Accepted,
      OrderStatus.Cancelled,
    ]);
  });
});
