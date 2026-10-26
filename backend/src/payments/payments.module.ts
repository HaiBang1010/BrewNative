import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersModule } from '../orders/orders.module.js';
import { Payment } from './entities/payment.entity.js';
import { StripeEvent } from './entities/stripe-event.entity.js';
import {
  PaymentsController,
  StripeWebhookController,
} from './payments.controller.js';
import { PaymentsService } from './payments.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, StripeEvent]), OrdersModule],
  controllers: [PaymentsController, StripeWebhookController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
