import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CheckoutService } from './checkout.service';
import {
  CheckoutDto,
  CheckoutPreviewDto,
  ValidateCouponDto,
} from './dto/checkout.dto';

type AuthenticatedRequest = Request & { user: { userId: string } };

@Controller('checkout')
@UseGuards(JwtAuthGuard)
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Get('shipping-options')
  shippingOptions(@Query('listingId') listingId?: string) {
    return this.checkoutService.shippingOptionsForListing(listingId);
  }

  @Post('preview')
  preview(@Req() req: AuthenticatedRequest, @Body() dto: CheckoutPreviewDto) {
    return this.checkoutService.preview(req.user.userId, dto);
  }

  @Post('coupon')
  validateCoupon(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ValidateCouponDto,
  ) {
    return this.checkoutService.validateCouponForListing(
      req.user.userId,
      dto.code,
      dto.listingId,
    );
  }

  @Post()
  checkout(@Req() req: AuthenticatedRequest, @Body() dto: CheckoutDto) {
    return this.checkoutService.checkout(req.user.userId, dto);
  }
}
