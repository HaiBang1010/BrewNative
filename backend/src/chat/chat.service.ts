import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, QueryFailedError, Repository } from 'typeorm';
import {
  paginate,
  type PaginationQueryDto,
} from '../common/dto/pagination.dto.js';
import { PushService } from '../push/push.service.js';
import {
  ServerEvent,
  type ConversationReadEvent,
  type MessageDto,
  type MessageNewEvent,
} from '../realtime/realtime.events.js';
import { RealtimeService } from '../realtime/realtime.service.js';
import type { ListMessagesQueryDto, SendMessageDto } from './dto/chat.dto.js';
import { Conversation } from './entities/conversation.entity.js';
import { Message } from './entities/message.entity.js';

export type MessagePage = {
  /** Newest first, ready for an inverted FlatList. */
  items: MessageDto[];
  hasMore: boolean;
};

type Reader = ConversationReadEvent['reader'];

const PREVIEW_LENGTH = 100;

/** Sender columns exposed to clients. Email and phone stay private. */
const PUBLIC_SENDER_COLUMNS = ['id', 'fullName', 'avatarUrl', 'role'] as const;

/** Column on `conversations` that records when each side last read. */
const READ_COLUMN = {
  customer: { property: 'customerLastReadAt', column: 'customer_last_read_at' },
  staff: { property: 'staffLastReadAt', column: 'staff_last_read_at' },
} as const;

const UNIQUE_VIOLATION = '23505';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversations: Repository<Conversation>,
    @InjectRepository(Message) private readonly messages: Repository<Message>,
    private readonly push: PushService,
    private readonly realtime: RealtimeService,
  ) {}

  // ---------- Customer ----------

  async getCustomerSummary(customerId: string) {
    const conversation = await this.getOrCreate(customerId);
    return {
      conversationId: conversation.id,
      lastMessageAt: conversation.lastMessageAt,
      unreadCount: await this.countUnreadForCustomer(conversation.id),
    };
  }

  async listCustomerMessages(
    customerId: string,
    query: ListMessagesQueryDto,
  ): Promise<MessagePage> {
    const conversation = await this.getOrCreate(customerId);
    return this.listMessages(conversation.id, query);
  }

  async sendAsCustomer(
    customerId: string,
    dto: SendMessageDto,
  ): Promise<MessageDto> {
    const conversation = await this.getOrCreate(customerId);
    const { message, created } = await this.addMessage(
      conversation,
      customerId,
      dto,
    );
    if (!created) return message;

    // Staff with the app open already got it over WebSocket.
    this.push.notifyStaff(
      {
        title: message.sender?.fullName ?? 'Khách hàng',
        body: preview(message.body),
        data: { type: 'chat', conversationId: conversation.id },
      },
      this.realtime.onlineStaffIds(),
    );
    return message;
  }

  async markReadByCustomer(customerId: string): Promise<void> {
    const conversation = await this.getOrCreate(customerId);
    await this.advanceRead(conversation, 'customer', null);
  }

  // ---------- Staff ----------

  /** Conversations that have at least one message, most recent activity first. */
  async listConversations(query: PaginationQueryDto) {
    const [conversations, total] = await this.conversations.findAndCount({
      where: { lastMessageAt: Not(IsNull()) },
      relations: { customer: true },
      order: { lastMessageAt: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    if (!conversations.length) return paginate([], total, query);

    const ids = conversations.map((c) => c.id);
    const lastMessages = await this.messages
      .createQueryBuilder('m')
      .distinctOn(['m.conversationId'])
      .where('m.conversationId IN (:...ids)', { ids })
      .orderBy('m.conversationId')
      .addOrderBy('m.createdAt', 'DESC')
      .addOrderBy('m.id', 'DESC')
      .getMany();
    const unreadRows = await this.messages
      .createQueryBuilder('m')
      .innerJoin('m.conversation', 'c')
      .select('m.conversationId', 'conversationId')
      .addSelect('COUNT(*)::int', 'count')
      .where('m.conversationId IN (:...ids)', { ids })
      .andWhere('m.senderId = c.customerId')
      .andWhere("m.createdAt > COALESCE(c.staffLastReadAt, 'epoch')")
      .groupBy('m.conversationId')
      .getRawMany<{ conversationId: string; count: number }>();

    const lastById = new Map(lastMessages.map((m) => [m.conversationId, m]));
    const unreadById = new Map(
      unreadRows.map((r) => [r.conversationId, r.count]),
    );
    const items = conversations.map((c) => {
      const last = lastById.get(c.id);
      return {
        ...c,
        lastMessage: last ? toMessageDto(last) : null,
        unreadCount: unreadById.get(c.id) ?? 0,
      };
    });
    return paginate(items, total, query);
  }

  async listStaffMessages(
    conversationId: string,
    query: ListMessagesQueryDto,
  ): Promise<MessagePage> {
    await this.findConversation(conversationId);
    return this.listMessages(conversationId, query);
  }

  async sendAsStaff(
    staffId: string,
    conversationId: string,
    dto: SendMessageDto,
  ): Promise<MessageDto> {
    const conversation = await this.findConversation(conversationId);
    const { message, created } = await this.addMessage(
      conversation,
      staffId,
      dto,
    );
    if (!created) return message;

    // Replying implies staff has read everything up to and including it.
    await this.advanceRead(conversation, 'staff', message.id);

    // A customer with the app open already got it over WebSocket.
    if (!(await this.realtime.isUserOnline(conversation.customerId))) {
      this.push.notifyUsers([conversation.customerId], {
        title: 'Brew',
        body: preview(message.body),
        data: { type: 'chat', conversationId: conversation.id },
      });
    }
    return message;
  }

  async markReadByStaff(conversationId: string): Promise<void> {
    const conversation = await this.findConversation(conversationId);
    await this.advanceRead(conversation, 'staff', null);
  }

  // ---------- Helpers ----------

  private async getOrCreate(customerId: string): Promise<Conversation> {
    // ON CONFLICT DO NOTHING: safe if two requests create it at the same time.
    await this.conversations
      .createQueryBuilder()
      .insert()
      .values({ customerId })
      .orIgnore()
      .execute();
    return this.conversations.findOneByOrFail({ customerId });
  }

  private async findConversation(id: string): Promise<Conversation> {
    const conversation = await this.conversations.findOneBy({ id });
    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }

  /**
   * Saves a message and emits `message:new`. If the sender already sent this
   * clientId (a retry), returns the stored message with `created: false` and
   * emits nothing.
   */
  private async addMessage(
    conversation: Conversation,
    senderId: string,
    dto: SendMessageDto,
  ): Promise<{ message: MessageDto; created: boolean }> {
    const clientId = dto.clientId ?? null;
    let id: string;
    try {
      ({ id } = await this.messages.save(
        this.messages.create({
          conversationId: conversation.id,
          senderId,
          body: dto.body,
          clientId,
        }),
      ));
    } catch (error) {
      if (clientId && isUniqueViolation(error)) {
        const existing = await this.messages.findOneByOrFail({
          senderId,
          clientId,
        });
        if (existing.conversationId !== conversation.id) {
          throw new ConflictException(
            'clientId was already used in another conversation',
          );
        }
        return { message: await this.loadMessage(existing.id), created: false };
      }
      throw error;
    }

    // GREATEST keeps it moving forward when sends overlap.
    await this.conversations
      .createQueryBuilder()
      .update()
      .set({
        lastMessageAt: () =>
          `GREATEST(COALESCE(last_message_at, 'epoch'), (SELECT created_at FROM messages WHERE id = :messageId))`,
      })
      .where('id = :conversationId', { conversationId: conversation.id })
      .setParameter('messageId', id)
      .execute();

    const message = await this.loadMessage(id);
    const event: MessageNewEvent = {
      conversationId: conversation.id,
      customerId: conversation.customerId,
      message,
    };
    this.realtime.emitToUserAndStaff(
      conversation.customerId,
      ServerEvent.MessageNew,
      event,
    );
    return { message, created: true };
  }

  private async loadMessage(id: string): Promise<MessageDto> {
    const message = await this.messages
      .createQueryBuilder('m')
      .leftJoin('m.sender', 'sender')
      .addSelect(PUBLIC_SENDER_COLUMNS.map((c) => `sender.${c}`))
      .where('m.id = :id', { id })
      .getOneOrFail();
    return toMessageDto(message);
  }

  /**
   * Moves `reader`'s last-read time forward (never back) to now, or to the given
   * message's time, then tells everyone in the conversation. Times come from the
   * database so they compare exactly with messages.created_at.
   */
  private async advanceRead(
    conversation: Conversation,
    reader: Reader,
    upToMessageId: string | null,
  ): Promise<void> {
    const { property, column } = READ_COLUMN[reader];
    const target = upToMessageId
      ? '(SELECT created_at FROM messages WHERE id = :messageId)'
      : 'now()';
    const result = await this.conversations
      .createQueryBuilder()
      .update()
      .set({
        [property]: () => `GREATEST(COALESCE(${column}, 'epoch'), ${target})`,
      })
      .where('id = :conversationId', { conversationId: conversation.id })
      .setParameter('messageId', upToMessageId)
      .returning(column)
      .execute();
    const readAt = (result.raw as Record<string, Date | undefined>[])[0]?.[
      column
    ];
    if (!readAt) return;

    const event: ConversationReadEvent = {
      conversationId: conversation.id,
      customerId: conversation.customerId,
      reader,
      readAt: readAt.toISOString(),
    };
    // Staff use it to sync unread badges; the customer for read receipts.
    this.realtime.emitToUserAndStaff(
      conversation.customerId,
      ServerEvent.ConversationRead,
      event,
    );
  }

  /**
   * Cursor pagination on (createdAt, id), so messages with equal timestamps aren't
   * skipped. The cursor is compared in SQL: a JS Date would drop the microseconds
   * Postgres stores and lose messages from the same millisecond.
   */
  private async listMessages(
    conversationId: string,
    query: ListMessagesQueryDto,
  ): Promise<MessagePage> {
    const qb = this.messages
      .createQueryBuilder('m')
      .leftJoin('m.sender', 'sender')
      .addSelect(PUBLIC_SENDER_COLUMNS.map((c) => `sender.${c}`))
      .where('m.conversationId = :conversationId', { conversationId })
      .orderBy('m.createdAt', 'DESC')
      .addOrderBy('m.id', 'DESC')
      .take(query.limit + 1);

    if (query.before) {
      const cursorExists = await this.messages.existsBy({
        id: query.before,
        conversationId,
      });
      if (!cursorExists)
        throw new NotFoundException('Cursor message not found');
      qb.andWhere(
        '(m.createdAt, m.id) < (SELECT c.created_at, c.id FROM messages c WHERE c.id = :before)',
        { before: query.before },
      );
    }

    const rows = await qb.getMany();
    return {
      items: rows.slice(0, query.limit).map(toMessageDto),
      hasMore: rows.length > query.limit,
    };
  }

  /** Messages from staff (or deleted accounts) the customer hasn't read yet. */
  private countUnreadForCustomer(conversationId: string): Promise<number> {
    return this.messages
      .createQueryBuilder('m')
      .innerJoin('m.conversation', 'c')
      .where('m.conversationId = :conversationId', { conversationId })
      .andWhere('(m.senderId IS NULL OR m.senderId != c.customerId)')
      .andWhere("m.createdAt > COALESCE(c.customerLastReadAt, 'epoch')")
      .getCount();
  }
}

function toMessageDto(message: Message): MessageDto {
  return {
    id: message.id,
    clientId: message.clientId,
    conversationId: message.conversationId,
    senderId: message.senderId,
    sender: message.sender
      ? {
          id: message.sender.id,
          fullName: message.sender.fullName,
          avatarUrl: message.sender.avatarUrl,
          role: message.sender.role,
        }
      : null,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string }).code === UNIQUE_VIOLATION
  );
}

function preview(body: string): string {
  return body.length > PREVIEW_LENGTH
    ? `${body.slice(0, PREVIEW_LENGTH - 1)}…`
    : body;
}
