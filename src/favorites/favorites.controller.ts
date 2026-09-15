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
import { FavoritesService } from './favorites.service';

type AuthenticatedRequest = Request & { user: { userId: string } };

@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post()
  add(
    @Req() req: AuthenticatedRequest,
    @Body('listingId') listingId: string,
  ) {
    return this.favoritesService.add(req.user.userId, listingId);
  }

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.favoritesService.list(req.user.userId);
  }

  @Get('ids')
  listIds(@Req() req: AuthenticatedRequest) {
    return this.favoritesService.listIds(req.user.userId);
  }

  @Delete(':listingId')
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('listingId') listingId: string,
  ) {
    return this.favoritesService.remove(req.user.userId, listingId);
  }
}
