import { IsOptional, IsUUID } from 'class-validator';
import { SendMessageDto } from './chat.dto.js';

/** `message:send` payload. Staff must say which conversation; customers can't (they only have their own). */
export class WsSendMessageDto extends SendMessageDto {
  @IsOptional()
  @IsUUID()
  conversationId?: string;
}

/** `conversation:read` payload. Same rule for conversationId as above. */
export class WsReadConversationDto {
  @IsOptional()
  @IsUUID()
  conversationId?: string;
}
