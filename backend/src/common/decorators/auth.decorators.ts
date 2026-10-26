import {
  createParamDecorator,
  SetMetadata,
  type ExecutionContext,
} from '@nestjs/common';
import type { UserRole } from '../../users/entities/user-role.enum.js';

export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';

/** Skips the global JWT guard for this route or controller. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Only users with one of these roles may call the route. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

/** What the JWT guard puts on `request.user` (HTTP) or `socket.data.user` (WebSocket). */
export type AuthUser = {
  id: string;
  role: UserRole;
};

/** The signed-in user for an HTTP request or a WebSocket message, if any. */
export function getAuthUser(ctx: ExecutionContext): AuthUser | undefined {
  if (ctx.getType() === 'ws') {
    return ctx.switchToWs().getClient<{ data?: { user?: AuthUser } }>().data
      ?.user;
  }
  return ctx.switchToHttp().getRequest<{ user?: AuthUser }>().user;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => getAuthUser(ctx)!,
);
