import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { OrderStatus } from '../orders/entities/order-status.enum.js';
import {
  SHOP_TIME_ZONE,
  fillDays,
  lastDays,
  shopDate,
  type DaySales,
} from './stats-days.js';

/** Orders that bring money in: paid and not cancelled (a cancelled paid order is refunded). */
const SOLD: OrderStatus[] = [
  OrderStatus.Paid,
  OrderStatus.Accepted,
  OrderStatus.Preparing,
  OrderStatus.Ready,
  OrderStatus.Completed,
];
const TOP_PRODUCTS = 5;

export type SalesStats = {
  /** First and last day, "YYYY-MM-DD" in Vietnam time. */
  from: string;
  to: string;
  /** VND. */
  revenue: number;
  orders: number;
  /** VND, rounded. 0 without orders. */
  averageOrder: number;
  itemsSold: number;
  /** Paid orders the shop then cancelled (refunded). */
  cancelledOrders: number;
  byDay: DaySales[];
  /** Best sellers by quantity. productId is null for a product deleted since. */
  topProducts: {
    productId: string | null;
    name: string;
    quantity: number;
    revenue: number;
  }[];
  byStore: { storeId: string; name: string; revenue: number; orders: number }[];
};

/**
 * Sales figures for the admin app. Orders count on the day they were placed.
 * Prices come from the orders themselves, so later menu changes don't alter past sales.
 */
@Injectable()
export class StatsService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  async sales(days: number): Promise<SalesStats> {
    const dates = lastDays(shopDate(new Date()), days);
    const from = dates[0];
    const to = dates[dates.length - 1];
    // [start, end) as timestamptz: midnight of `from` to midnight after `to`, Vietnam time.
    const range = `o.created_at >= ($1::date)::timestamp AT TIME ZONE '${SHOP_TIME_ZONE}'
      AND o.created_at < ($2::date + 1)::timestamp AT TIME ZONE '${SHOP_TIME_ZONE}'`;
    const params = [from, to, SOLD];

    const [byDay, products, stores, items, cancelled] = await Promise.all([
      this.db.query<{ date: string; revenue: string; orders: string }[]>(
        `SELECT to_char(o.created_at AT TIME ZONE '${SHOP_TIME_ZONE}', 'YYYY-MM-DD') AS date,
                SUM(o.total) AS revenue, COUNT(*) AS orders
           FROM orders o
          WHERE ${range} AND o.status = ANY($3)
          GROUP BY 1`,
        params,
      ),
      this.db.query<
        {
          product_id: string | null;
          name: string;
          quantity: string;
          revenue: string;
        }[]
      >(
        `SELECT i.product_id, MAX(i.product_name) AS name,
                SUM(i.quantity) AS quantity, SUM(i.line_total) AS revenue
           FROM order_items i JOIN orders o ON o.id = i.order_id
          WHERE ${range} AND o.status = ANY($3)
          GROUP BY i.product_id, CASE WHEN i.product_id IS NULL THEN i.product_name END
          ORDER BY quantity DESC, revenue DESC
          LIMIT ${TOP_PRODUCTS}`,
        params,
      ),
      this.db.query<
        { store_id: string; name: string; revenue: string; orders: string }[]
      >(
        `SELECT s.id AS store_id, s.name, SUM(o.total) AS revenue, COUNT(*) AS orders
           FROM orders o JOIN stores s ON s.id = o.store_id
          WHERE ${range} AND o.status = ANY($3)
          GROUP BY s.id, s.name
          ORDER BY revenue DESC`,
        params,
      ),
      this.db.query<{ items: string | null }[]>(
        `SELECT SUM(i.quantity) AS items
           FROM order_items i JOIN orders o ON o.id = i.order_id
          WHERE ${range} AND o.status = ANY($3)`,
        params,
      ),
      // Cancelled after payment: the history has paid → cancelled (unpaid checkouts are not sales).
      this.db.query<{ count: string }[]>(
        `SELECT COUNT(DISTINCT o.id) AS count
           FROM orders o JOIN order_status_history h ON h.order_id = o.id
          WHERE ${range} AND h.from_status = 'paid' AND h.to_status = 'cancelled'`,
        [from, to],
      ),
    ]);

    // Postgres returns SUM/COUNT of integers as strings (bigint/numeric).
    const daySales = fillDays(
      dates,
      byDay.map((row) => ({
        date: row.date,
        revenue: Number(row.revenue),
        orders: Number(row.orders),
      })),
    );
    const revenue = daySales.reduce((sum, day) => sum + day.revenue, 0);
    const orders = daySales.reduce((sum, day) => sum + day.orders, 0);

    return {
      from,
      to,
      revenue,
      orders,
      averageOrder: orders ? Math.round(revenue / orders) : 0,
      itemsSold: Number(items[0]?.items ?? 0),
      cancelledOrders: Number(cancelled[0]?.count ?? 0),
      byDay: daySales,
      topProducts: products.map((row) => ({
        productId: row.product_id,
        name: row.name,
        quantity: Number(row.quantity),
        revenue: Number(row.revenue),
      })),
      byStore: stores.map((row) => ({
        storeId: row.store_id,
        name: row.name,
        revenue: Number(row.revenue),
        orders: Number(row.orders),
      })),
    };
  }
}
