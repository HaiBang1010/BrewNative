import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, LessThan, Repository } from 'typeorm';
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
} as const;

const DETAIL_ORDER = { statusHistory: { createdAt: 'ASC' } } as const;

/** Push text sent to the customer when their order reaches a status. */
const CUSTOMER_PUSH: Partial<Record<OrderStatus, (code: string) => string>> = {
  [OrderStatus.Accepted]: (code) => `Quán đã nhận đơn ${code}`,
  [OrderStatus.Ready]: (code) => `Đơn ${code} đã sẵn sàng, mời bạn đến lấy`,
  [OrderStatus.Cancelled]: (code) => `Đơn ${code} đã bị hủy`,
};

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

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
    const saved = await this.orders.save(order);
    // TODO(stripe): create a PaymentIntent here and return its clientSecret.
    return this.getForUser(userId, saved.id);
  }

  async listForUser(userId: string, query: PaginationQueryDto) {
    const [items, total] = await this.orders.findAndCount({
      where: { userId },
      relations: { store: true, items: true },
      order: { createdAt: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
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

  /** Called by the Stripe webhook later; by the dev endpoint for now. */
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
        // Paid in the meantime: nothing to do.
        if (!(error instanceof ConflictException)) throw error;
      }
    }
    return expired.length;
  }

  // ---------- Core ----------

  /**
   * The only place that changes an order's status. Locks the row so two staff
   * clicking at the same time can't both move it, and records history.
   */
  private async transition(
    id: string,
    to: OrderStatus,
    actor: StatusActor,
    changedById: string | null,
  ): Promise<void> {
    let from: OrderStatus | undefined;
    const order = await this.dataSource.transaction(async (manager) => {
      const current = await manager.findOne(Order, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!current) throw new NotFoundException('Order not found');
      if (!canTransition(current.status, to, actor)) {
        throw new ConflictException(
          `Cannot change order from "${current.status}" to "${to}"`,
        );
      }

      from = current.status;
      await manager.update(Order, id, { status: to });
      await manager.insert(OrderStatusHistory, {
        orderId: id,
        fromStatus: from,
        toStatus: to,
        changedById,
      });
      current.status = to;
      return current;
    });

    this.logger.log(`Order ${order.code}: ${from} -> ${to} (${actor})`);

    // Emitted after the transaction commits, so a client that refetches on this
    // event always sees the new status.
    const event: OrderUpdatedEvent = {
      orderId: order.id,
      code: order.code,
      userId: order.userId,
      storeId: order.storeId,
      status: to,
      previousStatus: from!,
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
