import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { CreateReportDto } from './dto/create-report.dto';
import { RejectListingDto } from './dto/reject-listing.dto';
import { ModerationService } from './moderation.service';

type MaybeAuthenticatedRequest = Request & { user?: { userId: string } };

@Controller()
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  /** Denúncia é aberta a qualquer visitante. */
  @UseGuards(OptionalJwtAuthGuard)
  @Post('listings/:id/report')
  report(
    @Param('id') id: string,
    @Body() dto: CreateReportDto,
    @Req() req: MaybeAuthenticatedRequest,
  ) {
    return this.moderationService.report(id, req.user?.userId, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/listings/pending')
  pending(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.moderationService.pendingListings(
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('admin/listings/:id/approve')
  approve(@Param('id') id: string) {
    return this.moderationService.approve(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('admin/listings/:id/reject')
  reject(@Param('id') id: string, @Body() dto: RejectListingDto) {
    return this.moderationService.reject(id, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('admin/sellers/:id/verify')
  verify(@Param('id') id: string, @Body('verified') verified?: boolean) {
    return this.moderationService.verifySeller(id, verified !== false);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/reports')
  reports(@Query('status') status?: string) {
    return this.moderationService.listReports(status);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('admin/reports/:id/resolve')
  resolve(@Param('id') id: string, @Body('removeListing') removeListing?: boolean) {
    return this.moderationService.resolveReport(id, removeListing === true);
  }
}
