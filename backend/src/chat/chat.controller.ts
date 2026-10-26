import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  Roles,
  type AuthUser,
} from '../common/decorators/auth.decorators.js';
import { PaginationQueryDto } from '../common/dto/pagination.dto.js';
import { UserRole } from '../users/entities/user-role.enum.js';
import { ChatService } from './chat.service.js';
import { ListMessagesQueryDto, SendMessageDto } from './dto/chat.dto.js';

/** The signed-in customer's chat with the shop. No conversation id needed. */
@ApiTags('chat')
@ApiBearerAuth()
@Roles(UserRole.Customer)
@Controller('chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  /** Conversation id + unread count (for a badge). */
  @Get()
  summary(@CurrentUser() user: AuthUser) {
    return this.chat.getCustomerSummary(user.id);
  }

  @Get('messages')
  messages(
    @CurrentUser() user: AuthUser,
    @Query() query: ListMessagesQueryDto,
  ) {
    return this.chat.listCustomerMessages(user.id, query);
  }

  @Post('messages')
  send(@CurrentUser() user: AuthUser, @Body() dto: SendMessageDto) {
    return this.chat.sendAsCustomer(user.id, dto);
  }

  @Post('read')
  @HttpCode(HttpStatus.NO_CONTENT)
  read(@CurrentUser() user: AuthUser) {
    return this.chat.markReadByCustomer(user.id);
  }
}

@ApiTags('admin / chat')
@ApiBearerAuth()
@Roles(UserRole.Staff, UserRole.Admin)
@Controller('admin/conversations')
export class AdminChatController {
  constructor(private readonly chat: ChatService) {}

  /** With last message and unread count. */
  @Get()
  list(@Query() query: PaginationQueryDto) {
    return this.chat.listConversations(query);
  }

  @Get(':id/messages')
  messages(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ListMessagesQueryDto,
  ) {
    return this.chat.listStaffMessages(id, query);
  }

  @Post(':id/messages')
  send(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chat.sendAsStaff(user.id, id, dto);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  read(@Param('id', ParseUUIDPipe) id: string) {
    return this.chat.markReadByStaff(id);
  }
}
