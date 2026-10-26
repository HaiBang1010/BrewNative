import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import type { Request } from 'express';
import type { UserRole } from '../../users/entities/user-role.enum.js';
import {
  IS_PUBLIC_KEY,
  getAuthUser,
  type AuthUser,
} from '../decorators/auth.decorators.js';

export type AccessTokenPayload = { sub: string; role: UserRole };

/** Global guard: every route needs `Authorization: Bearer <accessToken>` unless marked @Public(). */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // WebSocket messages: the socket was authenticated once at connection
    // time (see RealtimeGateway), so only check that it carries a user.
    if (context.getType() === 'ws') {
      if (getAuthUser(context)) return true;
      throw new WsException('Unauthorized');
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Missing access token');
    }

    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token);
      request.user = { id: payload.sub, role: payload.role };
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
    return true;
  }
}
