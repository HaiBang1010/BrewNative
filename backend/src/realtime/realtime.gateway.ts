import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  WebSocketGateway,
  WebSocketServer,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  type OnGatewayInit,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type { AuthUser } from '../common/decorators/auth.decorators.js';
import type { AccessTokenPayload } from '../common/guards/jwt-auth.guard.js';
import { STAFF_ROLES } from '../users/entities/user-role.enum.js';
import { RealtimeService } from './realtime.service.js';
import { STAFF_ROOM, ServerEvent, userRoom } from './realtime.events.js';

export type SocketData = {
  user: AuthUser;
  /** Access token expiry, ms since epoch. */
  expiresAt: number;
  expiryTimer?: NodeJS.Timeout;
};
export type AuthedSocket = Socket & { data: SocketData };

const MAX_TIMEOUT_MS = 2_147_483_647;

/** Same options must be used by every gateway, since they share one Socket.IO server. */
export const GATEWAY_OPTIONS = { cors: { origin: true } };

/**
 * Socket.IO endpoint: ws://<host>:3100 (path /socket.io, no /api prefix).
 * Clients authenticate with the access token:
 *   io(url, { auth: { token: accessToken } })
 * and are put into their rooms automatically. This gateway only handles
 * connections; feature gateways (e.g. ChatGateway) handle client events.
 */
@WebSocketGateway(GATEWAY_OPTIONS)
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  private readonly server: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly realtime: RealtimeService,
  ) {}

  afterInit(server: Server): void {
    this.realtime.attach(server);

    // Runs before a connection is accepted. Rejecting here makes the client
    // receive `connect_error` with this message, and no handler ever sees the socket.
    server.use((socket, next) => {
      const token = extractToken(socket);
      if (!token) return next(new Error('Missing access token'));
      this.jwt
        .verifyAsync<AccessTokenPayload & { exp: number }>(token)
        .then((payload) => {
          const data = socket.data as SocketData;
          data.user = { id: payload.sub, role: payload.role };
          data.expiresAt = payload.exp * 1000;
          next();
        })
        .catch(() => next(new Error('Invalid or expired access token')));
    });
  }

  async handleConnection(socket: AuthedSocket): Promise<void> {
    const { user } = socket.data;
    await socket.join(userRoom(user.id));
    if (STAFF_ROLES.includes(user.role)) await socket.join(STAFF_ROOM);

    // The token was valid when connecting, but sockets can stay open for hours.
    // Disconnect when it expires; the client refreshes and reconnects
    // (which also picks up role changes).
    this.scheduleExpiry(socket);

    this.logger.debug(`Connected ${socket.id} user=${user.id} (${user.role})`);
  }

  /** setTimeout caps delays at ~24.8 days, so long delays are re-armed in steps. */
  private scheduleExpiry(socket: AuthedSocket): void {
    const remaining = socket.data.expiresAt - Date.now();
    if (remaining <= 0) {
      socket.emit(ServerEvent.SessionExpired);
      socket.disconnect(true);
      return;
    }
    socket.data.expiryTimer = setTimeout(
      () => this.scheduleExpiry(socket),
      Math.min(remaining, MAX_TIMEOUT_MS),
    );
  }

  handleDisconnect(socket: AuthedSocket): void {
    clearTimeout(socket.data.expiryTimer);
    this.logger.debug(`Disconnected ${socket.id}`);
  }
}

/** Token from `auth: { token }` (Socket.IO clients) or an `Authorization: Bearer` header. */
function extractToken(socket: Socket): string | null {
  const auth = socket.handshake.auth as { token?: unknown } | undefined;
  if (typeof auth?.token === 'string' && auth.token) {
    return auth.token.replace(/^Bearer\s+/i, '');
  }
  const [scheme, token] =
    socket.handshake.headers.authorization?.split(' ') ?? [];
  return scheme === 'Bearer' && token ? token : null;
}
