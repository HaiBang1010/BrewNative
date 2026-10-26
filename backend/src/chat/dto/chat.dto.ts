import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';

export class SendMessageDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 2000)
  body: string;

  /**
   * Random UUID made by the app for this message. Sending again with the same
   * clientId returns the already-saved message instead of creating a duplicate,
   * so a send can be retried after a dropped connection.
   */
  @IsOptional()
  @IsUUID()
  clientId?: string;
}

export class ListMessagesQueryDto {
  /** Id of the oldest message already loaded; returns messages before it. Omit for the latest page. */
  @IsOptional()
  @IsUUID()
  before?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 30;
}
