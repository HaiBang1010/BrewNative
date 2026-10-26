import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  Roles,
  type AuthUser,
} from '../common/decorators/auth.decorators.js';
import { UserRole } from '../users/entities/user-role.enum.js';
import {
  ListAdminOrdersQueryDto,
  UpdateOrderStatusDto,
} from './dto/order.dto.js';
import { OrdersService } from './orders.service.js';

@ApiTags('admin / orders')
@ApiBearerAuth()
@Roles(UserRole.Staff, UserRole.Admin)
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list(@Query() query: ListAdminOrdersQueryDto) {
    return this.orders.listForStaff(query);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.orders.getForStaff(id);
  }

  /** paid → accepted | cancelled, accepted → preparing → ready → completed. */
  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.orders.updateStatusByStaff(user.id, id, dto.status);
  }
}
