import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { io, type Socket } from 'socket.io-client';
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

// Needs the database running: npm run db:up && npm run migration:run
// Creates its own users/menu/store and deletes them afterwards.

const TIMEOUT = 3_000;
const suffix = Math.random().toString(36).slice(2, 8);

/** Resolves with the next `event` on `socket`, or rejects after TIMEOUT. */
function next<T = any>(
  socket: Socket,
  event: string,
  timeout = TIMEOUT,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out waiting for "${event}"`)),
      timeout,
    );
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

/** Resolves when no `event` arrives within `ms`. */
function silence(socket: Socket, event: string, ms = 300): Promise<void> {
  return new Promise((resolve, reject) => {
    const onEvent = () => reject(new Error(`Unexpected "${event}"`));
    socket.once(event, onEvent);
    setTimeout(() => {
      socket.off(event, onEvent);
      resolve();
    }, ms);
  });
}

describe('Realtime (e2e)', () => {
  let app: INestApplication<App>;
  let url: string;
  let db: DataSource;
  const sockets: Socket[] = [];
  const userIds: string[] = [];
  let customerToken: string;
  let staffToken: string;
  let customerId: string;
  let storeId: string;
  let categoryId: string;
  let productId: string;

  const http = () => request(app.getHttpServer());

  function connect(token?: string): Socket {
    const socket = io(url, {
      auth: token ? { token } : {},
      transports: ['websocket'],
      reconnection: false,
      forceNew: true,
    });
    sockets.push(socket);
    return socket;
  }

  async function connected(token: string): Promise<Socket> {
    const socket = connect(token);
    await next(socket, 'connect');
    return socket;
  }

  async function createUser(role: UserRole) {
    const email = `ws-${role}-${suffix}-${userIds.length}@test.local`;
    const user = await db.getRepository(User).save({
      email,
      passwordHash: await hashPassword('secret123'),
      fullName: `WS ${role}`,
      phone: '0900000000',
      role,
    });
    userIds.push(user.id);
    const res = await http()
      .post('/api/auth/login')
      .send({ email, password: 'secret123' })
      .expect(200);
    return { id: user.id, token: res.body.accessToken as string };
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.listen(0);
    const { port } = (
      app.getHttpServer() as unknown as Server
    ).address() as AddressInfo;
    url = `http://127.0.0.1:${port}`;
    db = app.get(DataSource);

    const customer = await createUser(UserRole.Customer);
    const staff = await createUser(UserRole.Staff);
    const admin = await createUser(UserRole.Admin);
    customerId = customer.id;
    customerToken = customer.token;
    staffToken = staff.token;

    const auth = { Authorization: `Bearer ${admin.token}` };
    storeId = (
      await http()
        .post('/api/admin/stores')
        .set(auth)
        .send({
          name: `WS ${suffix}`,
          address: 'x',
          latitude: 10,
          longitude: 106,
        })
        .expect(201)
    ).body.id;
    categoryId = (
      await http()
        .post('/api/admin/categories')
        .set(auth)
        .send({ name: `WS ${suffix}` })
        .expect(201)
    ).body.id;
    productId = (
      await http()
        .post('/api/admin/products')
        .set(auth)
        .send({ categoryId, name: 'WS product', basePrice: 10_000 })
        .expect(201)
    ).body.id;
  });

  afterAll(async () => {
    sockets.forEach((s) => s.disconnect());
    if (db) {
      await db.getRepository(Order).delete({ userId: In(userIds) });
      await db.getRepository(User).delete({ id: In(userIds) });
      if (productId)
        await db.query('DELETE FROM products WHERE id = $1', [productId]);
      if (categoryId) await db.getRepository(Category).delete(categoryId);
      if (storeId) await db.getRepository(Store).delete(storeId);
    }
    await app?.close();
  });

  describe('connection', () => {
    it('rejects a socket without a token', async () => {
      const error = await next<Error>(connect(), 'connect_error');
      expect(error.message).toBe('Missing access token');
    });

    it('rejects an invalid token', async () => {
      const error = await next<Error>(connect('not-a-jwt'), 'connect_error');
      expect(error.message).toBe('Invalid or expired access token');
    });

    it('disconnects when the access token expires', async () => {
      // exp is in whole seconds: +2 gives 1-2 s of life, enough to connect first.
      const exp = Math.floor(Date.now() / 1000) + 2;
      const shortToken = await app
        .get(JwtService)
        .signAsync({ sub: customerId, role: UserRole.Customer, exp });
      const socket = await connected(shortToken);
      const expired = next(socket, 'session:expired', 4_000);
      const disconnected = next<string>(socket, 'disconnect', 4_000);
      await expired;
      expect(await disconnected).toBe('io server disconnect');
    });
  });

  describe('chat', () => {
    let conversationId: string;

    it('customer message reaches staff and the customer, without private sender fields', async () => {
      const customer = await connected(customerToken);
      const staff = await connected(staffToken);

      const atStaff = next(staff, 'message:new');
      const atCustomer = next(customer, 'message:new');
      const ack = await customer.emitWithAck('message:send', {
        body: '  Xin chào  ',
      });

      expect(ack.ok).toBe(true);
      expect(ack.data.body).toBe('Xin chào');
      const event = await atStaff;
      await atCustomer;
      conversationId = event.conversationId;
      expect(event.customerId).toBe(customerId);
      expect(event.message.id).toBe(ack.data.id);
      expect(Object.keys(event.message.sender).sort()).toEqual([
        'avatarUrl',
        'fullName',
        'id',
        'role',
      ]);
      expect(ack.data.sender.email).toBeUndefined();
      expect(ack.data.sender.phone).toBeUndefined();
    });

    it('staff reply reaches the customer', async () => {
      const customer = await connected(customerToken);
      const staff = await connected(staffToken);

      const atCustomer = next(customer, 'message:new');
      const ack = await staff.emitWithAck('message:send', {
        conversationId,
        body: 'Chào bạn',
      });
      expect(ack.ok).toBe(true);
      expect((await atCustomer).message.body).toBe('Chào bạn');
    });

    it('validates payloads and roles through the ack', async () => {
      const customer = await connected(customerToken);
      const staff = await connected(staffToken);

      const empty = await customer.emitWithAck('message:send', { body: '   ' });
      expect(empty).toMatchObject({ ok: false, error: { status: 400 } });

      const unknownField = await customer.emitWithAck('message:send', {
        body: 'hi',
        extra: 1,
      });
      expect(unknownField).toMatchObject({ ok: false, error: { status: 400 } });

      const customerWithId = await customer.emitWithAck('message:send', {
        conversationId,
        body: 'hi',
      });
      expect(customerWithId.ok).toBe(false);

      const staffWithoutId = await staff.emitWithAck('message:send', {
        body: 'hi',
      });
      expect(staffWithoutId).toMatchObject({
        ok: false,
        error: { status: 400 },
      });

      const missing = await staff.emitWithAck('message:send', {
        conversationId: '00000000-0000-4000-8000-000000000000',
        body: 'hi',
      });
      expect(missing).toMatchObject({ ok: false, error: { status: 404 } });
    });

    it('broadcasts read receipts', async () => {
      const customer = await connected(customerToken);
      const staff = await connected(staffToken);

      const atStaff = next(staff, 'conversation:read');
      expect(await customer.emitWithAck('conversation:read', {})).toEqual({
        ok: true,
        data: null,
      });
      expect(await atStaff).toMatchObject({
        conversationId,
        reader: 'customer',
      });

      const atCustomer = next(customer, 'conversation:read');
      await staff.emitWithAck('conversation:read', { conversationId });
      expect(await atCustomer).toMatchObject({ reader: 'staff' });
    });

    it('also emits for messages sent over REST', async () => {
      const staff = await connected(staffToken);
      const atStaff = next(staff, 'message:new');
      await http()
        .post('/api/chat/messages')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ body: 'qua REST' })
        .expect(201);
      expect((await atStaff).message.body).toBe('qua REST');
    });

    it('does not leak a customer message to other customers', async () => {
      const other = await createUser(UserRole.Customer);
      const otherSocket = await connected(other.token);
      const customer = await connected(customerToken);
      const quiet = silence(otherSocket, 'message:new');
      await customer.emitWithAck('message:send', { body: 'riêng tư' });
      await quiet;
    });

    it('treats a resend with the same clientId as the same message', async () => {
      const sender = await createUser(UserRole.Customer);
      const customer = await connected(sender.token);
      const staff = await connected(staffToken);
      const clientId = '6f1c3b0e-8d0f-4a51-9b7e-2f6a8f3c1d42';

      const firstEvent = next(staff, 'message:new');
      const first = await customer.emitWithAck('message:send', {
        body: 'một lần thôi',
        clientId,
      });
      expect(first.ok).toBe(true);
      expect(first.data.clientId).toBe(clientId);
      expect(typeof first.data.createdAt).toBe('string');
      expect((await firstEvent).message.id).toBe(first.data.id);

      const quiet = silence(staff, 'message:new');
      const again = await customer.emitWithAck('message:send', {
        body: 'một lần thôi',
        clientId,
      });
      expect(again.data.id).toBe(first.data.id);
      await quiet;

      const viaRest = await http()
        .post('/api/chat/messages')
        .set('Authorization', `Bearer ${sender.token}`)
        .send({ body: 'một lần thôi', clientId })
        .expect(201);
      expect(viaRest.body.id).toBe(first.data.id);

      const page = await http()
        .get('/api/chat/messages')
        .set('Authorization', `Bearer ${sender.token}`)
        .expect(200);
      expect(page.body.items).toHaveLength(1);
    });

    it('does not skip messages from the same millisecond when paginating', async () => {
      const owner = await createUser(UserRole.Customer);
      const auth = { Authorization: `Bearer ${owner.token}` };
      const { conversationId: convId } = (
        await http().get('/api/chat').set(auth).expect(200)
      ).body;
      // Same millisecond, different microseconds: JS Dates can't tell them apart.
      await db.query(
        `INSERT INTO messages (conversation_id, sender_id, body, created_at) VALUES
           ($1, $2, 'older', '2026-01-01 00:00:00.123100+00'),
           ($1, $2, 'newer', '2026-01-01 00:00:00.123400+00')`,
        [convId, owner.id],
      );

      const first = (
        await http().get('/api/chat/messages?limit=1').set(auth).expect(200)
      ).body;
      expect(first.items.map((m: { body: string }) => m.body)).toEqual([
        'newer',
      ]);
      const second = (
        await http()
          .get(`/api/chat/messages?limit=1&before=${first.items[0].id}`)
          .set(auth)
          .expect(200)
      ).body;
      expect(second.items.map((m: { body: string }) => m.body)).toEqual([
        'older',
      ]);
    });

    it('rate-limits conversation:read', async () => {
      const reader = await createUser(UserRole.Customer);
      const socket = await connected(reader.token);
      const results = [];
      for (let i = 0; i < 21; i++) {
        results.push(await socket.emitWithAck('conversation:read', {}));
      }
      expect(results[19].ok).toBe(true);
      expect(results[20]).toMatchObject({ ok: false, error: { status: 429 } });
    });

    it('rate-limits message:send', async () => {
      const customer = await connected(customerToken);
      const results = [];
      for (let i = 0; i < 12; i++) {
        results.push(
          await customer.emitWithAck('message:send', { body: `spam ${i}` }),
        );
      }
      expect(results.at(-1)).toMatchObject({
        ok: false,
        error: { status: 429 },
      });
    });
  });

  describe('orders', () => {
    it('pushes order:updated to the customer and staff on each status change', async () => {
      const customer = await connected(customerToken);
      const staff = await connected(staffToken);

      const order = (
        await http()
          .post('/api/orders')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({ storeId, items: [{ productId, quantity: 1, optionIds: [] }] })
          .expect(201)
      ).body;

      const paidAtCustomer = next(customer, 'order:updated');
      const paidAtStaff = next(staff, 'order:updated');
      await http()
        .post(`/api/dev/orders/${order.id}/mark-paid`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);
      expect(await paidAtCustomer).toMatchObject({
        orderId: order.id,
        code: order.code,
        status: 'paid',
        previousStatus: 'pending_payment',
      });
      expect((await paidAtStaff).status).toBe('paid');

      const accepted = next(customer, 'order:updated');
      await http()
        .patch(`/api/admin/orders/${order.id}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'accepted' })
        .expect(200);
      expect(await accepted).toMatchObject({
        status: 'accepted',
        previousStatus: 'paid',
      });
    });

    it('does not send order events for a failed transition', async () => {
      const customer = await connected(customerToken);
      const order = (
        await http()
          .post('/api/orders')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({ storeId, items: [{ productId, quantity: 1, optionIds: [] }] })
          .expect(201)
      ).body;
      const quiet = silence(customer, 'order:updated');
      await http()
        .patch(`/api/admin/orders/${order.id}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'ready' })
        .expect(409);
      await quiet;
    });
  });
});
