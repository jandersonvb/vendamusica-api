import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateStoreDto } from './dto/update-store.dto';
import { SellersService } from './sellers.service';

type AuthenticatedRequest = Request & { user: { userId: string } };

@Controller('sellers')
export class SellersController {
  constructor(private readonly sellersService: SellersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('following/ids')
  followingIds(@Req() req: AuthenticatedRequest) {
    return this.sellersService.followingIds(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMyStore(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateStoreDto,
  ) {
    return this.sellersService.updateMyStore(req.user.userId, dto);
  }

  @Get(':id')
  getProfile(@Param('id') id: string) {
    return this.sellersService.getProfile(id);
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
