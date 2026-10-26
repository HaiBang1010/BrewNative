import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WsException } from '@nestjs/websockets';
import type { UserRole } from '../../users/entities/user-role.enum.js';
import { ROLES_KEY, getAuthUser } from '../decorators/auth.decorators.js';

/** Global guard: enforces @Roles(...). Runs after JwtAuthGuard. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!roles?.length) return true;

    const user = getAuthUser(context);
    if (!user || !roles.includes(user.role)) {
      const message = 'You do not have access to this resource';
      throw context.getType() === 'ws'
        ? new WsException(message)
        : new ForbiddenException(message);
    }
    return true;
  }
}
