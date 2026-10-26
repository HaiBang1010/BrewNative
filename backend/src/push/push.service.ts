import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Expo, type ExpoPushMessage } from 'expo-server-sdk';
import { In, Repository } from 'typeorm';
import { PushToken } from '../users/entities/push-token.entity.js';
import { STAFF_ROLES } from '../users/entities/user-role.enum.js';

export type PushPayload = {
  title: string;
  body: string;
  /** Read by the app when the notification is tapped, e.g. { type: 'order', orderId }. */
  data?: Record<string, unknown>;
};

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly expo: Expo;

  constructor(
    @InjectRepository(PushToken)
    private readonly pushTokens: Repository<PushToken>,
    config: ConfigService,
  ) {
    const accessToken = config.get<string>('EXPO_ACCESS_TOKEN');
    this.expo = new Expo(accessToken ? { accessToken } : {});
  }

  /**
   * Fire-and-forget: a failed push must never fail the request that triggered it.
   * Call without `await`.
   */
  notifyUsers(userIds: string[], payload: PushPayload): void {
    this.sendToUsers(userIds, payload).catch((error: unknown) =>
      this.logger.error('Push failed', error),
    );
  }

  /**
   * Every staff and admin device, except users in `skipUserIds` (e.g. those
   * already watching over WebSocket). Fire-and-forget like notifyUsers.
   */
  notifyStaff(
    payload: PushPayload,
    skipUserIds: Promise<Set<string>> | Set<string> = new Set(),
  ): void {
    Promise.all([
      this.pushTokens.find({ where: { user: { role: In(STAFF_ROLES) } } }),
      skipUserIds,
    ])
      .then(([tokens, skip]) =>
        this.send(
          tokens.filter((t) => !skip.has(t.userId)),
          payload,
        ),
      )
      .catch((error: unknown) => this.logger.error('Push failed', error));
  }

  async sendToUsers(userIds: string[], payload: PushPayload): Promise<void> {
    if (!userIds.length) return;
    const tokens = await this.pushTokens.find({
      where: { userId: In(userIds) },
    });
    await this.send(tokens, payload);
  }

  private async send(tokens: PushToken[], payload: PushPayload): Promise<void> {
    const valid = tokens.filter((t) => Expo.isExpoPushToken(t.token));
    if (!valid.length) return;

    const messages: ExpoPushMessage[] = valid.map((t) => ({
      to: t.token,
      sound: 'default',
      title: payload.title,
      body: payload.body,
      data: payload.data,
    }));

    const deadTokens: string[] = [];
    let offset = 0;
    for (const chunk of this.expo.chunkPushNotifications(messages)) {
      const tickets = await this.expo.sendPushNotificationsAsync(chunk);
      tickets.forEach((ticket, i) => {
        if (ticket.status === 'error') {
          if (ticket.details?.error === 'DeviceNotRegistered') {
            deadTokens.push(valid[offset + i].token);
          } else {
            this.logger.warn(`Push ticket error: ${ticket.message}`);
          }
        }
      });
      offset += chunk.length;
    }

    // The app was uninstalled or the token changed: stop sending to it.
    if (deadTokens.length) {
      await this.pushTokens.delete({ token: In(deadTokens) });
    }
  }
}
