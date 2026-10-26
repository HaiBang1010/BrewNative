import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { STAFF_ROLES } from '../users/entities/user-role.enum.js';
import {
  GATEWAY_OPTIONS,
  type AuthedSocket,
} from '../realtime/realtime.gateway.js';
import { ClientEvent } from '../realtime/realtime.events.js';
import { SlidingWindowLimiter } from '../realtime/rate-limiter.js';
import { parseDto, reply } from '../realtime/ws-utils.js';
import { ChatService } from './chat.service.js';
import { WsReadConversationDto, WsSendMessageDto } from './dto/chat-ws.dto.js';

/**
 * Chat over WebSocket. Same rules as the REST endpoints in ChatController,
 * which stay available (e.g. for sending when the socket is down).
 * Every handler replies through the ack: `{ ok: true, data }` or `{ ok: false, error }`.
 */
@WebSocketGateway(GATEWAY_OPTIONS)
export class ChatGateway {
  // Per user: 10 messages / 10 s, 20 read receipts / 10 s.
  private readonly sendLimiter = new SlidingWindowLimiter(10, 10_000);
  private readonly readLimiter = new SlidingWindowLimiter(20, 10_000);

  constructor(private readonly chat: ChatService) {}

  /**
   * Customer: `{ body }`. Staff: `{ conversationId, body }`.
   * Ack data: the saved message. Everyone in the conversation (including the
   * sender's other devices) also receives it as `message:new`.
   */
  @SubscribeMessage(ClientEvent.MessageSend)
  send(@ConnectedSocket() socket: AuthedSocket, @MessageBody() data: unknown) {
    return reply(async () => {
      const { user } = socket.data;
      checkRate(this.sendLimiter, user.id);
      const dto = await parseDto(WsSendMessageDto, data);

      if (STAFF_ROLES.includes(user.role)) {
        if (!dto.conversationId) {
          throw new BadRequestException('conversationId is required for staff');
        }
        return this.chat.sendAsStaff(user.id, dto.conversationId, dto);
      }
      if (dto.conversationId) {
        throw new BadRequestException('Customers cannot set conversationId');
      }
      return this.chat.sendAsCustomer(user.id, dto);
    });
  }

  /** Customer: `{}`. Staff: `{ conversationId }`. Ack data: null. */
  @SubscribeMessage(ClientEvent.ConversationRead)
  read(@ConnectedSocket() socket: AuthedSocket, @MessageBody() data: unknown) {
    return reply(async () => {
      const { user } = socket.data;
      checkRate(this.readLimiter, user.id);
      const dto = await parseDto(WsReadConversationDto, data);

      if (STAFF_ROLES.includes(user.role)) {
        if (!dto.conversationId) {
          throw new BadRequestException('conversationId is required for staff');
        }
        await this.chat.markReadByStaff(dto.conversationId);
      } else {
        if (dto.conversationId) {
          throw new BadRequestException('Customers cannot set conversationId');
        }
        await this.chat.markReadByCustomer(user.id);
      }
      return null;
    });
  }
}

function checkRate(limiter: SlidingWindowLimiter, userId: string): void {
  if (!limiter.tryHit(userId)) {
    throw new HttpException(
      'Too many requests, slow down',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
