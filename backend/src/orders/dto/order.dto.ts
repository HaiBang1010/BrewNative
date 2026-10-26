import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';
import { OrderStatus } from '../entities/order-status.enum.js';

export class OrderItemInputDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @Min(1)
  @Max(50)
  quantity: number;

  @IsArray()
  @ArrayMaxSize(30)
  @IsUUID('all', { each: true })
  optionIds: string[] = [];
}

/** Only ids and quantities: the server looks up all prices itself. */
export class CreateOrderDto {
  @IsUUID()
  storeId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items: OrderItemInputDto[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class ListAdminOrdersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsUUID()
  storeId?: string;
}

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;
}
