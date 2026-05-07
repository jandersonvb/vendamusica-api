import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { Request } from 'express';
import { OrdersService } from '../orders/orders.service';

type RawBodyRequest = Request & { rawBody?: Buffer };

@Controller('webhooks')
export class WebhookController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('pagarme')
  @HttpCode(200)
  async handlePagarmeWebhook(
    @Req() req: RawBodyRequest,
    @Body() body: { type?: string; data?: { id?: string } },
    @Headers('x-hub-signature') signature?: string,
  ) {
    this.validateSignature(req.rawBody, signature);

    if (body.type === 'order.paid' && body.data?.id) {
      await this.ordersService.confirmPayment(body.data.id);
    }

    if (body.type === 'order.payment_failed' && body.data?.id) {
      await this.ordersService.failPayment(body.data.id);
    }

    return { received: true };
  }

  private validateSignature(rawBody?: Buffer, signature?: string) {
    const secret = process.env.PAGARME_WEBHOOK_SECRET;

    if (!rawBody || !secret || !signature?.startsWith('sha256=')) {
      throw new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED);
    }

    const expectedHash = createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');
    const receivedHash = signature.replace('sha256=', '');
    const expected = Buffer.from(expectedHash, 'hex');
    const received = Buffer.from(receivedHash, 'hex');

    if (
      expected.length !== received.length ||
      !timingSafeEqual(expected, received)
    ) {
      throw new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED);
    }
  }
}
