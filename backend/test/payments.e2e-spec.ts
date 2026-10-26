import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import Stripe from 'stripe';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { DataSource, In } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { hashPassword } from '../src/common/utils/password.js';
import { Category } from '../src/menu/entities/category.entity.js';
import { Order } from '../src/orders/entities/order.entity.js';
import { Store } from '../src/stores/entities/store.entity.js';
import { UserRole } from '../src/users/entities/user-role.enum.js';
import { User } from '../src/users/entities/user.entity.js';

// Talks to Stripe in test mode (STRIPE_SECRET_KEY = sk_test_...), so it needs
// network access. Webhooks are signed locally with STRIPE_WEBHOOK_SECRET, so
// `npm run stripe:listen` is not needed. Stop it (and the dev server) while running
// this: real events it forwards would change the same test orders. Skipped when
// Stripe is not configured.
try {
  process.loadEnvFile();
} catch {
  // Rely on the environment.
}
const secretKey = process.env.STRIPE_SECRET_KEY ?? '';
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? '';
const configured = secretKey.startsWith('sk_test_') && !!webhookSecret;

const suffix = Math.random().toString(36).slice(2, 8);

describe.skipIf(!configured)('Payments (e2e, Stripe test mode)', () => {
  const stripe = new Stripe(secretKey || 'sk_test_unused');
  let app: INestApplication<App>;
  let db: DataSource;
  const userIds: string[] = [];
  let customer: string;
  let staff: string;
  let storeId: string;
  let categoryId: string;
  let productId: string;
  let cheapProductId: string;
  let eventCounter = 0;

  const http = () => request(app.getHttpServer());
  const as = (token: string) => ({ Authorization: `Bearer ${token}` });

  async function createUser(role: UserRole): Promise<string> {
    const email = `pay-${role}-${suffix}-${userIds.length}@test.local`;
    const user = await db.getRepository(User).save({
      email,
      passwordHash: await hashPassword('secret123'),
      fullName: `Pay ${role}`,
      role,
    });
    userIds.push(user.id);
    const res = await http()
      .post('/api/auth/login')
      .send({ email, password: 'secret123' })
      .expect(200);
    return res.body.accessToken as string;
  }

  async function createOrder(product = productId, quantity = 2) {
    const res = await http()
      .post('/api/orders')
      .set(as(customer))
      .send({
        storeId,
        items: [{ productId: product, quantity, optionIds: [] }],
      })
      .expect(201);
    return res.body as { id: string; total: number; status: string };
  }

  async function payWith(orderId: string, paymentMethod: string) {
    const sheet = (
      await http()
        .post(`/api/orders/${orderId}/payment`)
        .set(as(customer))
        .expect(200)
    ).body;
    try {
      await stripe.paymentIntents.confirm(sheet.paymentIntentId, {
        payment_method: paymentMethod,
        return_url: 'brew://stripe',
      });
    } catch {
      // Declined cards throw; the intent still records the failure.
    }
    return stripe.paymentIntents.retrieve(sheet.paymentIntentId);
  }

  /** Posts a webhook the way Stripe would, signed with STRIPE_WEBHOOK_SECRET. */
  function sendWebhook(type: string, object: unknown, id?: string) {
    const payload = JSON.stringify({
      id: id ?? `evt_test_${suffix}_${++eventCounter}`,
      object: 'event',
      type,
      api_version: '2026-09-30.endive',
      created: Math.floor(Date.now() / 1000),
      data: { object },
    });
    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: webhookSecret,
    });
    return http()
      .post('/api/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', signature)
      .send(payload);
  }

  const getOrder = async (id: string) =>
    (await http().get(`/api/admin/orders/${id}`).set(as(staff)).expect(200))
      .body;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication({ rawBody: true });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    db = app.get(DataSource);

    customer = await createUser(UserRole.Customer);
    staff = await createUser(UserRole.Staff);
    const admin = await createUser(UserRole.Admin);

    storeId = (
      await http()
        .post('/api/admin/stores')
        .set(as(admin))
        .send({
          name: `Pay ${suffix}`,
          address: 'x',
          latitude: 10,
          longitude: 106,
        })
        .expect(201)
    ).body.id;
    categoryId = (
      await http()
        .post('/api/admin/categories')
        .set(as(admin))
        .send({ name: `Pay ${suffix}` })
        .expect(201)
    ).body.id;
    productId = (
      await http()
        .post('/api/admin/products')
        .set(as(admin))
        .send({ categoryId, name: 'Pay product', basePrice: 35_000 })
        .expect(201)
    ).body.id;
    cheapProductId = (
      await http()
        .post('/api/admin/products')
        .set(as(admin))
        .send({ categoryId, name: 'Cheap product', basePrice: 1_000 })
        .expect(201)
    ).body.id;
  }, 30_000);

  afterAll(async () => {
    if (db) {
      await db.getRepository(Order).delete({ userId: In(userIds) });
      await db.getRepository(User).delete({ id: In(userIds) });
      await db.query('DELETE FROM products WHERE category_id = $1', [
        categoryId,
      ]);
      if (categoryId) await db.getRepository(Category).delete(categoryId);
      if (storeId) await db.getRepository(Store).delete(storeId);
      await db.query(
        `DELETE FROM stripe_events WHERE id LIKE 'evt_test_${suffix}_%'`,
      );
    }
    await app?.close();
  });

  it('marks the order paid when the succeeded webhook arrives, once', async () => {
    const order = await createOrder();
    const sheet = (
      await http()
        .post(`/api/orders/${order.id}/payment`)
        .set(as(customer))
        .expect(200)
    ).body;
    expect(sheet).toMatchObject({ amount: order.total, currency: 'vnd' });
    expect(sheet.clientSecret).toMatch(/^pi_.+_secret_/);

    // Calling again while unpaid reuses the same intent.
    const again = (
      await http()
        .post(`/api/orders/${order.id}/payment`)
        .set(as(customer))
        .expect(200)
    ).body;
    expect(again.paymentIntentId).toBe(sheet.paymentIntentId);

    const intent = await stripe.paymentIntents.confirm(sheet.paymentIntentId, {
      payment_method: 'pm_card_visa',
      return_url: 'brew://stripe',
    });
    expect(intent.status).toBe('succeeded');
    // Not paid until the webhook says so.
    expect((await getOrder(order.id)).status).toBe('pending_payment');

    const eventId = `evt_test_${suffix}_dup`;
    await sendWebhook('payment_intent.succeeded', intent, eventId).expect(200);
    await sendWebhook('payment_intent.succeeded', intent, eventId).expect(200);

    const paid = await getOrder(order.id);
    expect(paid.status).toBe('paid');
    expect(paid.payments[0].status).toBe('succeeded');
    const paidEntries = paid.statusHistory.filter(
      (h: { toStatus: string }) => h.toStatus === 'paid',
    );
    expect(paidEntries).toHaveLength(1);

    await http()
      .post(`/api/orders/${order.id}/payment`)
      .set(as(customer))
      .expect(409);
  }, 30_000);

  it('rejects webhooks with a bad or missing signature', async () => {
    await http()
      .post('/api/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', 't=1,v1=deadbeef')
      .send('{}')
      .expect(400);
    await http()
      .post('/api/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .send('{}')
      .expect(400);
  });

  it('does not mark paid when the received amount does not match the order', async () => {
    const order = await createOrder();
    const intent = await payWith(order.id, 'pm_card_visa');
    await sendWebhook('payment_intent.succeeded', {
      ...intent,
      amount_received: intent.amount_received - 1,
    }).expect(200);
    expect((await getOrder(order.id)).status).toBe('pending_payment');
  }, 30_000);

  it('records a declined card and lets the customer retry the same intent', async () => {
    const order = await createOrder();
    const declined = await payWith(order.id, 'pm_card_chargeDeclined');
    expect(declined.status).toBe('requires_payment_method');
    await sendWebhook('payment_intent.payment_failed', declined).expect(200);

    const afterFail = await getOrder(order.id);
    expect(afterFail.status).toBe('pending_payment');
    expect(afterFail.payments[0].lastError).toMatch(/declined/i);

    const retry = (
      await http()
        .post(`/api/orders/${order.id}/payment`)
        .set(as(customer))
        .expect(200)
    ).body;
    expect(retry.paymentIntentId).toBe(declined.id);
  }, 30_000);

  it('cancels the PaymentIntent when the customer cancels an unpaid order', async () => {
    const order = await createOrder();
    const sheet = (
      await http()
        .post(`/api/orders/${order.id}/payment`)
        .set(as(customer))
        .expect(200)
    ).body;
    await http()
      .post(`/api/orders/${order.id}/cancel`)
      .set(as(customer))
      .expect(200);
    const intent = await stripe.paymentIntents.retrieve(sheet.paymentIntentId);
    expect(intent.status).toBe('canceled');
  }, 30_000);

  it('refuses to cancel while a successful payment awaits its webhook', async () => {
    const order = await createOrder();
    const intent = await payWith(order.id, 'pm_card_visa');
    expect(intent.status).toBe('succeeded');

    await http()
      .post(`/api/orders/${order.id}/cancel`)
      .set(as(customer))
      .expect(409);
    await sendWebhook('payment_intent.succeeded', intent).expect(200);
    expect((await getOrder(order.id)).status).toBe('paid');
  }, 30_000);

  it('refunds in full when staff rejects a paid order', async () => {
    const order = await createOrder();
    const intent = await payWith(order.id, 'pm_card_visa');
    await sendWebhook('payment_intent.succeeded', intent).expect(200);

    await http()
      .patch(`/api/admin/orders/${order.id}/status`)
      .set(as(staff))
      .send({ status: 'cancelled' })
      .expect(200);

    const refunds = await stripe.refunds.list({ payment_intent: intent.id });
    expect(refunds.data).toHaveLength(1);
    expect(refunds.data[0].amount).toBe(order.total);

    const charge = await stripe.charges.retrieve(
      intent.latest_charge as string,
    );
    await sendWebhook('charge.refunded', charge).expect(200);
    expect((await getOrder(order.id)).payments[0].amountRefunded).toBe(
      order.total,
    );
  }, 30_000);

  it("explains Stripe's minimum amount instead of failing with 500", async () => {
    const order = await createOrder(cheapProductId, 1);
    const res = await http()
      .post(`/api/orders/${order.id}/payment`)
      .set(as(customer))
      .expect(400);
    expect(res.body.message).toMatch(/at least/i);
  }, 30_000);
});
