import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  In,
  LessThan,
  Repository,
  type EntityManager,
} from 'typeorm';
import {
  paginate,
  type PaginationQueryDto,
} from '../common/dto/pagination.dto.js';
import { Product } from '../menu/entities/product.entity.js';
import { PushService } from '../push/push.service.js';
import {
  ServerEvent,
  type OrderUpdatedEvent,
} from '../realtime/realtime.events.js';
import { RealtimeService } from '../realtime/realtime.service.js';
import { Store } from '../stores/entities/store.entity.js';
import type {
  CreateOrderDto,
  ListAdminOrdersQueryDto,
} from './dto/order.dto.js';
import { OrderStatusHistory } from './entities/order-status-history.entity.js';
import { OrderStatus } from './entities/order-status.enum.js';
import { Order } from './entities/order.entity.js';
import { priceItems } from './order-pricing.js';
import { canTransition, type StatusActor } from './order-status.js';

const DETAIL_RELATIONS = {
  store: true,
  items: { options: true },
  statusHistory: true,
  payments: true,
} as const;

const DETAIL_ORDER = {
  statusHistory: { createdAt: 'ASC' },
  payments: { createdAt: 'ASC' },
} as const;

export type TransitionContext = {
  /** The transaction the status change runs in; the order row is locked. */
  manager: EntityManager;
  order: Order;
  from: OrderStatus;
  to: OrderStatus;
  actor: StatusActor;
};

/**
 * Runs inside the transition's transaction, after the transition is known to be
 * allowed and before it is saved. Throwing aborts the transition.
 * Lets other modules (payments) react without OrdersService depending on them.
 */
export type TransitionHook = (ctx: TransitionContext) => Promise<void>;

/** What a committed transition hands to afterTransition(). */
export type TransitionResult = {
  order: Order;
  from: OrderStatus;
  to: OrderStatus;
  actor: StatusActor;
};

/** Push text sent to the customer when their order reaches a status. */
const CUSTOMER_PUSH: Partial<Record<OrderStatus, (code: string) => string>> = {
  [OrderStatus.Accepted]: (code) => `Quán đã nhận đơn ${code}`,
  [OrderStatus.Ready]: (code) => `Đơn ${code} đã sẵn sàng, mời bạn đến lấy`,
  [OrderStatus.Cancelled]: (code) => `Đơn ${code} đã bị hủy`,
};

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  private readonly hooks: TransitionHook[] = [];

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(Store) private readonly stores: Repository<Store>,
    private readonly push: PushService,
    private readonly realtime: RealtimeService,
    private readonly config: ConfigService,
  ) {}

  // ---------- Customer ----------

  async create(userId: string, dto: CreateOrderDto): Promise<Order> {
    const store = await this.stores.findOneBy({
      id: dto.storeId,
      isActive: true,
    });
    if (!store) throw new BadRequestException('Store does not exist');

    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    const products = await this.products.find({
      where: { id: In(productIds) },
      relations: { optionGroups: { options: true } },
    });
    const { items, subtotal } = priceItems(dto.items, products);

    const order = this.orders.create({
      userId,
      storeId: store.id,
      status: OrderStatus.PendingPayment,
      subtotal,
      total: subtotal,
      note: dto.note?.trim() || null,
      items: items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        productImageUrl: item.productImageUrl,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        lineTotal: item.lineTotal,
        options: item.options,
      })),
      statusHistory: [
        {
          fromStatus: null,
          toStatus: OrderStatus.PendingPayment,
          changedById: userId,
        },
      ],
    });
    // Cascades insert items, their options and the first history row in one transaction.
    // The app then calls POST /orders/:id/payment to get a Stripe PaymentIntent.
    const saved = await this.orders.save(order);
    return this.getForUser(userId, saved.id);
  }

  /**
   * The customer's orders, newest first. An order only becomes "real" for the
   * customer once it is paid: checkouts that were never paid (still waiting, or
   * abandoned and cancelled) are hidden. Orders cancelled after payment
   * (refunded) still show.
   */
  async listForUser(userId: string, query: PaginationQueryDto) {
    const [items, total] = await this.orders
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.store', 'store')
      .leftJoinAndSelect('o.items', 'items')
      .where('o.userId = :userId', { userId })
      .andWhere(
        `(o.status NOT IN (:...unpaid) OR EXISTS (
          SELECT 1 FROM order_status_history h
          WHERE h.order_id = o.id AND h.to_status = :paid))`,
        {
          unpaid: [OrderStatus.PendingPayment, OrderStatus.Cancelled],
          paid: OrderStatus.Paid,
        },
      )
      .orderBy('o.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return paginate(items, total, query);
  }

  async getForUser(userId: string, id: string): Promise<Order> {
    const order = await this.orders.findOne({
      where: { id, userId },
      relations: DETAIL_RELATIONS,
      order: DETAIL_ORDER,
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async cancelByCustomer(userId: string, id: string): Promise<Order> {
    await this.getForUser(userId, id);
    await this.transition(id, OrderStatus.Cancelled, 'customer', userId);
    return this.getForUser(userId, id);
  }

  // ---------- Staff ----------

  async listForStaff(query: ListAdminOrdersQueryDto) {
    const [items, total] = await this.orders.findAndCount({
      where: {
        ...(query.status && { status: query.status }),
        ...(query.storeId && { storeId: query.storeId }),
      },
      relations: { store: true, user: true, items: true },
      order: { createdAt: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return paginate(items, total, query);
  }

  async getForStaff(id: string): Promise<Order> {
    const order = await this.orders.findOne({
      where: { id },
      relations: { ...DETAIL_RELATIONS, user: true },
      order: DETAIL_ORDER,
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateStatusByStaff(
    staffId: string,
    id: string,
    status: OrderStatus,
  ): Promise<Order> {
    await this.transition(id, status, 'staff', staffId);
    return this.getForStaff(id);
  }

  // ---------- System ----------

  /** Dev-only shortcut (DevOrdersController); real payments go through the Stripe webhook. */
  async markPaid(id: string): Promise<Order> {
    await this.transition(id, OrderStatus.Paid, 'system', null);
    return this.getForStaff(id);
  }

  /** Cancels orders that stayed unpaid longer than ORDER_PAYMENT_TIMEOUT_MINUTES. */
  async cancelExpiredUnpaid(): Promise<number> {
    const minutes = Number(this.config.get('ORDER_PAYMENT_TIMEOUT_MINUTES'));
    const expired = await this.orders.find({
      where: {
        status: OrderStatus.PendingPayment,
        createdAt: LessThan(new Date(Date.now() - minutes * 60_000)),
      },
      select: { id: true },
    });
    for (const { id } of expired) {
      try {
        await this.transition(id, OrderStatus.Cancelled, 'system', null);
      } catch (error) {
        // Paid in the meantime, or a payment is still processing: leave it.
        if (!(error instanceof ConflictException)) throw error;
      }
    }
    return expired.length;
  }

  // ---------- Core ----------

  addTransitionHook(hook: TransitionHook): void {
    this.hooks.push(hook);
  }

  /**
   * Changes an order's status in its own transaction, then emits events.
   * The only way status changes, together with transitionWithin().
   */
  private async transition(
    id: string,
    to: OrderStatus,
    actor: StatusActor,
    changedById: string | null,
  ): Promise<void> {
    const result = await this.dataSource.transaction((manager) =>
      this.transitionWithin(manager, id, to, actor, changedById),
    );
    this.afterTransition(result);
  }

  /**
   * Status change inside a caller's transaction (e.g. the Stripe webhook, which
   * also records the event). Locks the order row so concurrent changes are
   * serialized, checks the transition is allowed, runs hooks, records history.
   * The caller must call afterTransition() once the transaction has committed.
   */
  async transitionWithin(
    manager: EntityManager,
    id: string,
    to: OrderStatus,
    actor: StatusActor,
    changedById: string | null,
  ): Promise<TransitionResult> {
    const order = await manager.findOne(Order, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!order) throw new NotFoundException('Order not found');
    const from = order.status;
    if (!canTransition(from, to, actor)) {
      throw new ConflictException(
        `Cannot change order from "${from}" to "${to}"`,
      );
    }

    for (const hook of this.hooks) {
      await hook({ manager, order, from, to, actor });
    }

    await manager.update(Order, id, { status: to });
    await manager.insert(OrderStatusHistory, {
      orderId: id,
      fromStatus: from,
      toStatus: to,
      changedById,
    });
    order.status = to;
    return { order, from, to, actor };
  }

  /** Logs, emits order:updated and sends pushes. Call only after the transaction committed. */
  afterTransition({ order, from, to, actor }: TransitionResult): void {
    this.logger.log(`Order ${order.code}: ${from} -> ${to} (${actor})`);
    const event: OrderUpdatedEvent = {
      orderId: order.id,
      code: order.code,
      userId: order.userId,
      storeId: order.storeId,
      status: to,
      previousStatus: from,
      changedAt: new Date().toISOString(),
    };
    this.realtime.emitToUserAndStaff(
      order.userId,
      ServerEvent.OrderUpdated,
      event,
    );
    this.notify(order, actor);
  }

  private notify(order: Order, actor: StatusActor): void {
    const text = CUSTOMER_PUSH[order.status];
    // The customer doesn't need a push for something they just did themselves.
    if (text && actor !== 'customer') {
      this.push.notifyUsers([order.userId], {
        title: 'Brew',
        body: text(order.code),
        data: { type: 'order', orderId: order.id },
      });
    }
    if (order.status === OrderStatus.Paid) {
      this.push.notifyStaff({
        title: 'Đơn mới',
        body: `Đơn ${order.code} vừa thanh toán`,
        data: { type: 'order', orderId: order.id },
      });
    }
  }
}
