import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrdersService } from './orders.service.js';

@Injectable()
export class OrdersScheduler {
  private readonly logger = new Logger(OrdersScheduler.name);

  constructor(private readonly orders: OrdersService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async cancelExpiredUnpaid() {
    const count = await this.orders.cancelExpiredUnpaid();
    if (count) this.logger.log(`Cancelled ${count} unpaid order(s)`);
  }
}
