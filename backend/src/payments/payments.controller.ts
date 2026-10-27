import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  type RawBodyRequest,
} from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';
import {
  CurrentUser,
  Public,
  type AuthUser,
} from '../common/decorators/auth.decorators.js';
import { PaymentsService } from './payments.service.js';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  /**
   * Parameters for Stripe PaymentSheet in the app. Call after creating the order,
   * and again if the sheet was closed: it reuses the PaymentIntent while it is
   * still payable. The order turns `paid` only when Stripe's webhook confirms it.
   */
  @Post(':id/payment')
  @HttpCode(HttpStatus.OK)
  preparePayment(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payments.preparePayment(user.id, id);
  }

  /**
   * Checks the payment with Stripe and marks the order paid if it went through.
   * Call after PaymentSheet reports success; the webhook does the same as a backup.
   */
  @Post(':id/payment/confirm')
  @HttpCode(HttpStatus.OK)
  confirmPayment(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payments.confirmPayment(user.id, id);
  }
}

/** Called by Stripe, not by the app. Verified with the Stripe-Signature header. */
@Public()
@SkipThrottle()
@Controller('webhooks')
export class StripeWebhookController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async stripe(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string | undefined,
  ) {
    await this.payments.handleWebhook(req.rawBody, signature);
    return { received: true };
  }
}
