import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrdersService } from './orders.service';

type AuthenticatedRequest = Request & { user: { userId: string } };

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(
    @Req() req: AuthenticatedRequest,
    @Body('listingId') listingId: string,
  ) {
    return this.ordersService.create(req.user.userId, listingId);
  }

  @Get()
  findByUser(@Req() req: AuthenticatedRequest) {
    return this.ordersService.findByUser(req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.ordersService.findOne(req.user.userId, id);
  }

  @Post(':id/pay')
  pay(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.ordersService.payMock(req.user.userId, id);
  }
}
