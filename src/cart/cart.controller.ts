import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CartService } from './cart.service';

type AuthenticatedRequest = Request & { user: { userId: string } };

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.cartService.list(req.user.userId);
  }

  @Post()
  add(@Req() req: AuthenticatedRequest, @Body('listingId') listingId: string) {
    return this.cartService.add(req.user.userId, listingId);
  }

  @Delete()
  clear(@Req() req: AuthenticatedRequest) {
    return this.cartService.clear(req.user.userId);
  }

  @Delete(':listingId')
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('listingId') listingId: string,
  ) {
    return this.cartService.remove(req.user.userId, listingId);
  }
}
