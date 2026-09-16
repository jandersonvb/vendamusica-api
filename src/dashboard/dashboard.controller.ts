import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

type AuthenticatedRequest = Request & { user: { userId: string } };

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  getOverview(@Req() req: AuthenticatedRequest) {
    return this.dashboardService.getOverview(req.user.userId);
  }

  @Get('leads')
  recentLeads(@Req() req: AuthenticatedRequest, @Query('limit') limit?: string) {
    return this.dashboardService.recentLeads(
      req.user.userId,
      limit ? Number(limit) : undefined,
    );
  }
}
