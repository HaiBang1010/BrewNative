import { Injectable, type ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * ThrottlerGuard reads the HTTP request/response, which don't exist for
 * WebSocket messages, so it is limited to HTTP. Socket events have their own
 * limits where needed (see ChatGateway).
 */
@Injectable()
export class HttpThrottlerGuard extends ThrottlerGuard {
  protected override async shouldSkip(
    context: ExecutionContext,
  ): Promise<boolean> {
    return context.getType() !== 'http' || super.shouldSkip(context);
  }
}
