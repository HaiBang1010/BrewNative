import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/auth.decorators.js';
import { UserRole } from '../users/entities/user-role.enum.js';
import { SalesStatsQueryDto } from './dto/stats.dto.js';
import { StatsService } from './stats.service.js';

@ApiTags('admin / stats')
@ApiBearerAuth()
@Roles(UserRole.Admin)
@Controller('admin/stats')
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  /** Revenue, orders, best sellers and stores over the last `days` days (default 7). */
  @Get('sales')
  sales(@Query() query: SalesStatsQueryDto) {
    return this.stats.sales(query.days ?? 7);
  }
}
