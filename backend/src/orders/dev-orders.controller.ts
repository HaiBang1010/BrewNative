import {
  Controller,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/auth.decorators.js';
import { STAFF_ROLES } from '../users/entities/user-role.enum.js';
import { OrdersService } from './orders.service.js';

/**
 * Stand-in for the Stripe webhook until payments exist, so the order flow can be
 * tested end to end. Returns 404 when NODE_ENV=production.
 */
@ApiTags('dev')
@ApiBearerAuth()
@Controller('dev/orders')
export class DevOrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly config: ConfigService,
  ) {}

  @Post(':id/mark-paid')
  @HttpCode(HttpStatus.OK)
  async markPaid(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    if (this.config.get('NODE_ENV') === 'production') {
      throw new NotFoundException();
    }
    // Owners can pay their own order; staff can pay any.
    if (!STAFF_ROLES.includes(user.role)) {
      await this.orders.getForUser(user.id, id);
    }
    return this.orders.markPaid(id);
  }
}
