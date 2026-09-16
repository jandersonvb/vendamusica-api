import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { UpdateStoreDto } from './dto/update-store.dto';
import { SellersService } from './sellers.service';

type AuthenticatedRequest = Request & { user: { userId: string } };
type MaybeAuthenticatedRequest = Request & { user?: { userId: string } };

@Controller('sellers')
export class SellersController {
  constructor(private readonly sellersService: SellersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('following/ids')
  followingIds(@Req() req: AuthenticatedRequest) {
    return this.sellersService.followingIds(req.user.userId);
  }

  /** Lojas em destaque na home (ordenadas por plano). */
  @Get('featured')
  featured(@Query('limit') limit?: string) {
    return this.sellersService.featuredStores(limit ? Number(limit) : undefined);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMyStore(@Req() req: AuthenticatedRequest, @Body() dto: UpdateStoreDto) {
    return this.sellersService.updateMyStore(req.user.userId, dto);
  }

  @Get('slug/:slug')
  getBySlug(@Param('slug') slug: string) {
    return this.sellersService.getProfileBySlug(slug);
  }

  @Get(':id')
  getProfile(@Param('id') id: string) {
    return this.sellersService.getProfile(id);
  }

  /** Revela o contato da loja e registra o lead. */
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id/contact')
  getContact(
    @Param('id') id: string,
    @Req() req: MaybeAuthenticatedRequest,
    @Query('channel') channel = 'whatsapp',
  ) {
    return this.sellersService.getContact(id, channel, req.user?.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/follow')
  follow(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.sellersService.follow(req.user.userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/follow')
  unfollow(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.sellersService.unfollow(req.user.userId, id);
  }
}
