import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SubscribeDto } from './dto/subscribe.dto';
import { PlansService } from './plans.service';

type AuthenticatedRequest = Request & { user: { userId: string } };

@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  list(@Query('audience') audience?: string) {
    return this.plansService.listPlans(audience);
  }

  /** Plano atual + quanto da cota já foi usado (tela "Meu plano"). */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: AuthenticatedRequest) {
    return this.plansService.getEntitlements(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('subscribe')
  subscribe(@Req() req: AuthenticatedRequest, @Body() dto: SubscribeDto) {
    return this.plansService.subscribe(req.user.userId, dto.planSlug);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me')
  cancel(@Req() req: AuthenticatedRequest) {
    return this.plansService.cancel(req.user.userId);
  }
}
