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
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { CreateLeadDto } from './dto/create-lead.dto';
import { LeadsService } from './leads.service';

type MaybeAuthenticatedRequest = Request & { user?: { userId: string } };
type AuthenticatedRequest = Request & { user: { userId: string } };

@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  /** Chamado pelo front a cada clique em contato (WhatsApp, telefone, chat). */
  @UseGuards(OptionalJwtAuthGuard)
  @Post()
  register(
    @Body() dto: CreateLeadDto,
    @Req() req: MaybeAuthenticatedRequest,
  ) {
    return this.leadsService.register(dto, req.user?.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/summary')
  summary(@Req() req: AuthenticatedRequest, @Query('days') days?: string) {
    return this.leadsService.summary(
      req.user.userId,
      days ? Number(days) : undefined,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  recent(@Req() req: AuthenticatedRequest, @Query('limit') limit?: string) {
    return this.leadsService.findRecent(
      req.user.userId,
      limit ? Number(limit) : undefined,
    );
  }
}
