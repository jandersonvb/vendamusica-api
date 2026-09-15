import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Req,
} from "@nestjs/common";
import { createHmac, timingSafeEqual } from "crypto";
import { Request } from "express";
import { OrdersService } from "../orders/orders.service";
import { UsersService } from "../users/users.service";

type RawBodyRequest = Request & { rawBody?: Buffer };

type WebhookBody = {
  type?: string;
  event?: string;
  data?: {
    id?: string;
    order_id?: string;
    status?: string;
  };
  payment?: {
    id?: string;
  };
  checkout?: {
    id?: string;
  };
};

@Controller("webhooks")
export class WebhookController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly usersService: UsersService,
  ) {}

  @Post("pagarme")
  @HttpCode(200)
  async handlePagarmeWebhook(
    @Req() req: RawBodyRequest,
    @Body() body: WebhookBody,
    @Headers("x-hub-signature") signature?: string,
  ) {
    this.validateSignature(req.rawBody, signature);

    const orderId = body.data?.order_id ?? body.data?.id;

    switch (body.type) {
      case "order.paid":
      case "charge.paid":
        if (orderId) await this.ordersService.confirmPayment(orderId);
        break;

      case "order.payment_failed":
      case "charge.payment_failed":
        if (orderId) await this.ordersService.failPayment(orderId);
        break;

      case "order.canceled":
      case "charge.refunded":
      case "charge.chargeback":
        if (orderId) await this.ordersService.refundPayment(orderId);
        break;

      case "recipient.updated":
        if (body.data?.id && body.data.status) {
          await this.usersService.updateRecipientStatus(
            body.data.id,
            this.normalizeRecipientStatus(body.data.status),
          );
        }
        break;

      default:
        break;
    }

    return { received: true };
  }

  @Post("asaas")
  @HttpCode(200)
  async handleAsaasWebhook(
    @Body() body: WebhookBody,
    @Headers("asaas-access-token") accessToken?: string,
  ) {
    this.validateAsaasAccessToken(accessToken);

    const gatewayId = body.checkout?.id ?? body.payment?.id;

    switch (body.event) {
      case "CHECKOUT_PAID":
      case "PAYMENT_RECEIVED":
      case "PAYMENT_CONFIRMED":
        if (gatewayId) await this.ordersService.confirmPayment(gatewayId);
        break;

      case "CHECKOUT_EXPIRED":
      case "CHECKOUT_CANCELED":
      case "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED":
      case "PAYMENT_REPROVED_BY_RISK_ANALYSIS":
      case "PAYMENT_OVERDUE":
      case "PAYMENT_DELETED":
        if (gatewayId) await this.ordersService.failPayment(gatewayId);
        break;

      case "PAYMENT_REFUNDED":
      case "PAYMENT_CHARGEBACK_REQUESTED":
        if (gatewayId) await this.ordersService.refundPayment(gatewayId);
        break;

      default:
        break;
    }

    return { received: true };
  }

  private normalizeRecipientStatus(status: string): string {
    switch (status) {
      case "active":
        return "active";
      case "refused":
        return "refused";
      case "suspended":
      case "blocked":
      case "inactive":
        return "suspended";
      case "registration":
      case "affiliation":
        return "pending";
      default:
        return "unknown";
    }
  }

  private validateSignature(rawBody?: Buffer, signature?: string) {
    const secret = process.env.PAGARME_WEBHOOK_SECRET;

    if (!rawBody || !secret || !signature?.startsWith("sha256=")) {
      throw new HttpException("Invalid signature", HttpStatus.UNAUTHORIZED);
    }

    const expectedHash = createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");
    const receivedHash = signature.replace("sha256=", "");
    const expected = Buffer.from(expectedHash, "hex");
    const received = Buffer.from(receivedHash, "hex");

    if (
      expected.length !== received.length ||
      !timingSafeEqual(expected, received)
    ) {
      throw new HttpException("Invalid signature", HttpStatus.UNAUTHORIZED);
    }
  }

  private validateAsaasAccessToken(accessToken?: string) {
    const expected = process.env.ASAAS_WEBHOOK_ACCESS_TOKEN;

    if (!expected) return;
    if (!accessToken) {
      throw new HttpException("Invalid webhook token", HttpStatus.UNAUTHORIZED);
    }

    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(accessToken);
    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      throw new HttpException("Invalid webhook token", HttpStatus.UNAUTHORIZED);
    }
  }
}
