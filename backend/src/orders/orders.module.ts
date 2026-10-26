import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../menu/entities/product.entity.js';
import { PushModule } from '../push/push.module.js';
import { Store } from '../stores/entities/store.entity.js';
import { AdminOrdersController } from './admin-orders.controller.js';
import { DevOrdersController } from './dev-orders.controller.js';
import { Order } from './entities/order.entity.js';
import { OrderItemOption } from './entities/order-item-option.entity.js';
import { OrderItem } from './entities/order-item.entity.js';
import { OrderStatusHistory } from './entities/order-status-history.entity.js';
import { OrdersController } from './orders.controller.js';
import { OrdersScheduler } from './orders.scheduler.js';
import { OrdersService } from './orders.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      OrderItemOption,
      OrderStatusHistory,
      Product,
      Store,
    ]),
    PushModule,
  ],
  controllers: [OrdersController, AdminOrdersController, DevOrdersController],
  providers: [OrdersService, OrdersScheduler],
  exports: [OrdersService],
})
export class OrdersModule {}
