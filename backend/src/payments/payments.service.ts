import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import Stripe from 'stripe';
import { DataSource, In, type EntityManager } from 'typeorm';
import { OrderStatus } from '../orders/entities/order-status.enum.js';
import { Order } from '../orders/entities/order.entity.js';
import {
  OrdersService,
  type TransitionContext,
  type TransitionResult,
} from '../orders/orders.service.js';
import {
  IN_FLIGHT_STATUSES,
  PAYABLE_STATUSES,
  Payment,
  PaymentStatus,
} from './entities/payment.entity.js';
import { StripeEvent } from './entities/stripe-event.entity.js';

/** What the app needs to open Stripe's PaymentSheet. */
export type PaymentSheetParams = {
  paymentIntentId: string;
  clientSecret: string;
  /** Null if STRIPE_PUBLISHABLE_KEY is not set; the app then uses its own copy. */
  publishableKey: string | null;
  amount: number;
  currency: string;
};

@Injectable()
export class PaymentsService implements OnModuleInit {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly stripe: Stripe | null;
  private readonly webhookSecret: string;
  private readonly publishableKey: string | null;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly orders: OrdersService,
    config: ConfigService,
  ) {
    const secretKey = config.get<string>('STRIPE_SECRET_KEY');
    this.stripe = secretKey ? new Stripe(secretKey) : null;
    this.webhookSecret = config.get<string>('STRIPE_WEBHOOK_SECRET') ?? '';
    this.publishableKey = config.get<string>('STRIPE_PUBLISHABLE_KEY') || null;
  }

  onModuleInit(): void {
    this.orders.addTransitionHook((ctx) => this.onOrderTransition(ctx));
  }

  // ---------- Customer: start paying ----------

  /**
   * Returns a PaymentIntent the customer can pay for this order: the current one if
   * it is still payable, otherwise a new one. Safe to call again (e.g. the app was
   * closed while PaymentSheet was open).
   */
  async preparePayment(
    userId: string,
    orderId: string,
  ): Promise<PaymentSheetParams> {
    const stripe = this.requireStripe();

    // The order row stays locked while talking to Stripe, so the timeout job
    // or a cancel can't run in between and leave a payable intent on a cancelled order.
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id: orderId, userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) throw new NotFoundException('Order not found');
      if (order.status !== OrderStatus.PendingPayment) {
        throw new ConflictException('Order is not awaiting payment');
      }

      const payments = await manager.find(Payment, {
        where: { orderId },
        order: { createdAt: 'DESC' },
      });
      const latest = payments[0];
      if (latest && latest.status !== PaymentStatus.Canceled) {
        const intent = await this.callStripe(() =>
          stripe.paymentIntents.retrieve(latest.stripePaymentIntentId),
        );
        await this.syncPayment(manager, latest, intent);
        if (PAYABLE_STATUSES.includes(latest.status)) {
          return this.toSheetParams(intent);
        }
        if (latest.status === PaymentStatus.Succeeded) {
          // Paid, but the order isn't marked yet: the app should call confirm.
          throw new ConflictException('Payment already received');
        }
        if (IN_FLIGHT_STATUSES.includes(latest.status)) {
          throw new ConflictException('Payment is already being processed');
        }
        // Canceled on Stripe's side: fall through and create a new one.
      }

      const intent = await this.callStripe(() =>
        stripe.paymentIntents.create(
          {
            amount: order.total,
            currency: order.currency,
            automatic_payment_methods: { enabled: true },
            description: `Brew ${order.code}`,
            metadata: { orderId: order.id, orderCode: order.code, userId },
          },
          // Same attempt number = same intent, if this request is retried.
          {
            idempotencyKey: `order-${order.id}-attempt-${payments.length + 1}`,
          },
        ),
      );
      await manager.insert(Payment, {
        orderId: order.id,
        stripePaymentIntentId: intent.id,
        amount: intent.amount,
        currency: intent.currency,
        status: intent.status as PaymentStatus,
      });
      return this.toSheetParams(intent);
    });
  }

  /**
   * Asks Stripe for the order's latest PaymentIntent and applies it exactly like
   * the webhook would. The app calls this right after PaymentSheet succeeds, so
   * the order turns paid without waiting for the webhook, and a missed webhook
   * (e.g. `npm run stripe:listen` not running) can't leave a paid order stuck.
   * Safe to call any number of times, and safe to race with the webhook: both
   * lock the order row and the second one finds it already paid.
   */
  async confirmPayment(
    userId: string,
    orderId: string,
  ): Promise<{
    orderStatus: OrderStatus;
    paymentStatus: PaymentStatus | null;
  }> {
    const stripe = this.requireStripe();
    const order = await this.dataSource
      .getRepository(Order)
      .findOneBy({ id: orderId, userId });
    if (!order) throw new NotFoundException('Order not found');

    const latest = await this.dataSource.getRepository(Payment).findOne({
      where: { orderId },
      order: { createdAt: 'DESC' },
    });
    if (!latest) return { orderStatus: order.status, paymentStatus: null };

    // Read from Stripe with the secret key: the app's word isn't trusted.
    const intent = await this.callStripe(() =>
      stripe.paymentIntents.retrieve(latest.stripePaymentIntentId),
    );

    const transitions: TransitionResult[] = [];
    const orderStatus = await this.dataSource.transaction(async (manager) => {
      if (intent.status === 'succeeded') {
        const result = await this.onPaymentSucceeded(manager, intent);
        if (result) transitions.push(result);
      } else {
        await this.syncFromIntent(manager, intent);
      }
      return (await manager.findOneByOrFail(Order, { id: orderId })).status;
    });
    transitions.forEach((t) => this.orders.afterTransition(t));

    return { orderStatus, paymentStatus: intent.status as PaymentStatus };
  }

  /**
   * Safety net for missed webhooks when the app couldn't confirm either (e.g. it
   * was killed right after paying). Every minute, re-checks unpaid orders whose
   * latest PaymentIntent is still open with Stripe.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async reconcilePendingPayments(minAgeSeconds = 60): Promise<number> {
    if (!this.stripe) return 0;
    const rows = await this.dataSource
      .getRepository(Payment)
      .createQueryBuilder('p')
      .innerJoin('p.order', 'o')
      .select('p.orderId', 'orderId')
      .addSelect('o.userId', 'userId')
      .distinct(true)
      .where('o.status = :pending', { pending: OrderStatus.PendingPayment })
      .andWhere('p.status != :canceled', { canceled: PaymentStatus.Canceled })
      // Give the app and the webhook a moment first.
      .andWhere('p.createdAt < now() - make_interval(secs => :age)', {
        age: minAgeSeconds,
      })
      .getRawMany<{ orderId: string; userId: string }>();

    let paid = 0;
    for (const { orderId, userId } of rows) {
      try {
        const { orderStatus } = await this.confirmPayment(userId, orderId);
        if (orderStatus === OrderStatus.Paid) paid++;
      } catch (error) {
        this.logger.warn(
          `Reconcile failed for order ${orderId}: ${String(error)}`,
        );
      }
    }
    if (paid)
      this.logger.log(`Reconciled ${paid} paid order(s) without a webhook`);
    return paid;
  }

  // ---------- Webhook ----------

  /**
   * Verifies and applies a webhook. Every event is applied at most once:
   * its id is inserted in the same transaction as the changes it causes.
   * Throwing makes the controller answer 5xx so Stripe retries later.
   */
  async handleWebhook(
    rawBody: Buffer | undefined,
    signature: string | undefined,
  ): Promise<{ duplicate: boolean }> {
    const stripe = this.requireStripe();
    if (!this.webhookSecret) {
      throw new ServiceUnavailableException('STRIPE_WEBHOOK_SECRET is not set');
    }
    if (!rawBody || !signature) {
      throw new BadRequestException('Missing body or Stripe-Signature header');
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.webhookSecret,
      );
    } catch {
      throw new BadRequestException('Invalid Stripe signature');
    }

    const transitions: TransitionResult[] = [];
    const duplicate = await this.dataSource.transaction(async (manager) => {
      // A concurrent delivery of the same event waits here until this one commits,
      // then inserts nothing.
      const inserted = await manager
        .createQueryBuilder()
        .insert()
        .into(StripeEvent)
        .values({ id: event.id, type: event.type })
        .orIgnore()
        .returning('id')
        .execute();
      if (!(inserted.raw as unknown[]).length) return true;

      switch (event.type) {
        case 'payment_intent.succeeded': {
          const result = await this.onPaymentSucceeded(
            manager,
            event.data.object,
          );
          if (result) transitions.push(result);
          break;
        }
        case 'payment_intent.payment_failed':
        case 'payment_intent.processing':
        case 'payment_intent.requires_action':
        case 'payment_intent.canceled':
          await this.syncFromIntent(manager, event.data.object);
          break;
        case 'charge.refunded':
          await this.onChargeRefunded(manager, event.data.object);
          break;
        default:
          this.logger.debug(`Ignoring Stripe event ${event.type}`);
      }
      return false;
    });

    transitions.forEach((t) => this.orders.afterTransition(t));
    return { duplicate };
  }

  private async onPaymentSucceeded(
    manager: EntityManager,
    intent: Stripe.PaymentIntent,
  ): Promise<TransitionResult | null> {
    const found = await this.syncFromIntent(manager, intent);
    if (!found) return null;
    const { payment, order } = found;

    if (
      intent.amount_received !== order.total ||
      intent.currency !== order.currency
    ) {
      // Should never happen: the intent was created from this order's total.
      // Don't mark it paid; leave it for a human to look at.
      this.logger.error(
        `Order ${order.code}: received ${intent.amount_received} ${intent.currency}, ` +
          `expected ${order.total} ${order.currency} (${intent.id})`,
      );
      return null;
    }

    if (order.status === OrderStatus.PendingPayment) {
      return this.orders.transitionWithin(
        manager,
        order.id,
        OrderStatus.Paid,
        'system',
        null,
      );
    }
    if (order.status === OrderStatus.Cancelled) {
      // Paid after the order was cancelled (e.g. a slow payment method finished
      // late). Give the money back.
      this.logger.warn(
        `Order ${order.code} was cancelled but got paid; refunding ${intent.id}`,
      );
      await this.refund(payment);
    }
    // Already paid by another intent: nothing to do (should not happen).
    return null;
  }

  private async onChargeRefunded(
    manager: EntityManager,
    charge: Stripe.Charge,
  ): Promise<void> {
    const intentId =
      typeof charge.payment_intent === 'string'
        ? charge.payment_intent
        : charge.payment_intent?.id;
    if (!intentId) return;
    await manager.update(
      Payment,
      { stripePaymentIntentId: intentId },
      { amountRefunded: charge.amount_refunded },
    );
  }

  // ---------- Order transitions ----------

  /** Runs inside every order status change (see OrdersService.addTransitionHook). */
  private async onOrderTransition({
    manager,
    order,
    from,
    to,
  }: TransitionContext): Promise<void> {
    if (to !== OrderStatus.Cancelled) return;
    if (from === OrderStatus.PendingPayment) {
      await this.cancelOpenIntents(manager, order);
    } else if (from === OrderStatus.Paid) {
      await this.refundOrder(manager, order);
    }
  }

  /**
   * Cancels the order's unpaid PaymentIntents so the customer can't pay a
   * cancelled order. Refuses (409) if a payment is already in flight.
   */
  private async cancelOpenIntents(
    manager: EntityManager,
    order: Order,
  ): Promise<void> {
    const open = await manager.find(Payment, {
      where: {
        orderId: order.id,
        status: In([...PAYABLE_STATUSES, ...IN_FLIGHT_STATUSES]),
      },
    });
    if (!open.length) return;
    const stripe = this.requireStripe();

    for (const payment of open) {
      let intent = await this.callStripe(() =>
        stripe.paymentIntents.retrieve(payment.stripePaymentIntentId),
      );
      if (PAYABLE_STATUSES.includes(intent.status as PaymentStatus)) {
        try {
          intent = await stripe.paymentIntents.cancel(
            payment.stripePaymentIntentId,
          );
        } catch (error) {
          // The customer finished paying between retrieve and cancel.
          if (
            !(error instanceof Stripe.errors.StripeInvalidRequestError) ||
            error.code !== 'payment_intent_unexpected_state'
          ) {
            throw toHttpError(error, this.logger);
          }
          intent = await this.callStripe(() =>
            stripe.paymentIntents.retrieve(payment.stripePaymentIntentId),
          );
        }
      }
      await this.syncPayment(manager, payment, intent);
      if (IN_FLIGHT_STATUSES.includes(payment.status)) {
        throw new ConflictException(
          'A payment for this order is already being processed',
        );
      }
    }
  }

  /** Staff rejected a paid order: refund the successful payment in full. */
  private async refundOrder(
    manager: EntityManager,
    order: Order,
  ): Promise<void> {
    const paid = await manager.findOne(Payment, {
      where: { orderId: order.id, status: PaymentStatus.Succeeded },
    });
    // No Stripe payment: the order was marked paid with the dev endpoint.
    if (!paid) return;
    await this.refund(paid);
  }

  private async refund(payment: Payment): Promise<void> {
    const stripe = this.requireStripe();
    // Idempotency key: a retried cancel can't refund twice.
    // amountRefunded is updated by the charge.refunded webhook.
    await this.callStripe(() =>
      stripe.refunds.create(
        { payment_intent: payment.stripePaymentIntentId },
        { idempotencyKey: `refund-${payment.id}` },
      ),
    );
  }

  // ---------- Helpers ----------

  /**
   * Copies the intent's status onto our row. Returns null for intents we didn't create.
   * Locks the order first, then writes the payment: the same order as
   * preparePayment() and the cancel hook, so concurrent calls can't deadlock.
   */
  private async syncFromIntent(
    manager: EntityManager,
    intent: Stripe.PaymentIntent,
  ): Promise<{ payment: Payment; order: Order } | null> {
    const payment = await manager.findOneBy(Payment, {
      stripePaymentIntentId: intent.id,
    });
    if (!payment) {
      this.logger.warn(`Webhook for unknown PaymentIntent ${intent.id}`);
      return null;
    }
    const order = await manager.findOneOrFail(Order, {
      where: { id: payment.orderId },
      lock: { mode: 'pessimistic_write' },
    });
    await this.syncPayment(manager, payment, intent);
    return { payment, order };
  }

  private async syncPayment(
    manager: EntityManager,
    payment: Payment,
    intent: Stripe.PaymentIntent,
  ): Promise<void> {
    payment.status = intent.status as PaymentStatus;
    payment.lastError = intent.last_payment_error?.message ?? null;
    await manager.update(Payment, payment.id, {
      status: payment.status,
      lastError: payment.lastError,
    });
  }

  private toSheetParams(intent: Stripe.PaymentIntent): PaymentSheetParams {
    return {
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret!,
      publishableKey: this.publishableKey,
      amount: intent.amount,
      currency: intent.currency,
    };
  }

  private requireStripe(): Stripe {
    if (!this.stripe) {
      throw new ServiceUnavailableException(
        'Payments are not configured (STRIPE_SECRET_KEY is empty)',
      );
    }
    return this.stripe;
  }

  private async callStripe<T>(request: () => Promise<T>): Promise<T> {
    try {
      return await request();
    } catch (error) {
      throw toHttpError(error, this.logger);
    }
  }
}

/** Stripe request errors become 400 with Stripe's message; outages become 502. */
function toHttpError(error: unknown, logger: Logger): unknown {
  if (error instanceof Stripe.errors.StripeInvalidRequestError) {
    return new BadRequestException(error.message);
  }
  if (error instanceof Stripe.errors.StripeError) {
    logger.error(`Stripe error: ${error.message}`);
    return new BadGatewayException('Payment provider error, try again');
  }
  return error;
}
