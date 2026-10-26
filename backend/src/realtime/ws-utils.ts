import { BadRequestException, HttpException, Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { WsReply } from './realtime.events.js';

const logger = new Logger('WsHandler');

/**
 * Validates a WebSocket payload against a DTO class, with the same rules as the
 * HTTP ValidationPipe (unknown fields are rejected).
 */
export async function parseDto<T extends object>(
  dtoClass: new () => T,
  data: unknown,
): Promise<T> {
  const instance = plainToInstance(dtoClass, data ?? {});
  const errors = await validate(instance, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  if (errors.length) {
    throw new BadRequestException(
      errors.flatMap((e) => Object.values(e.constraints ?? {})),
    );
  }
  return instance;
}

/**
 * Runs a handler and turns the result or error into a WsReply, which Nest sends
 * back as the Socket.IO acknowledgement. Without this, errors would only reach
 * the client as a separate "exception" event, not as the ack of their emit.
 */
export async function reply<T>(handler: () => Promise<T>): Promise<WsReply<T>> {
  try {
    return { ok: true, data: await handler() };
  } catch (error) {
    if (error instanceof HttpException) {
      const response = error.getResponse();
      const message =
        typeof response === 'object' && response && 'message' in response
          ? (response as { message: string | string[] }).message
          : error.message;
      return { ok: false, error: { status: error.getStatus(), message } };
    }
    logger.error(error);
    return { ok: false, error: { status: 500, message: 'Internal error' } };
  }
}
