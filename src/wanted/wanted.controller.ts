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
import { CreateWantedDto } from './dto/create-wanted.dto';
import { UpdateWantedDto } from './dto/update-wanted.dto';
import { WantedService } from './wanted.service';

type AuthenticatedRequest = Request & { user: { userId: string } };

@Controller('wanted')
export class WantedController {
  constructor(private readonly wantedService: WantedService) {}

  /** Resumo público da demanda — usado na home e na página de planos. */
  @Get('demand')
  demand(
    @Query('category') category?: string,
    @Query('city') city?: string,
    @Query('state') state?: string,
  ) {
    return this.wantedService.demandSummary({ category, city, state });
  }

  /** Lista de quem procura (vendedor). Bloqueada sem plano que libere. */
  @UseGuards(JwtAuthGuard)
  @Get('demand/list')
  demandList(
    @Req() req: AuthenticatedRequest,
    @Query('category') category?: string,
    @Query('city') city?: string,
    @Query('state') state?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.wantedService.demandList(req.user.userId, {
      category,
      city,
      state,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  /** Quantas procuras casam com o que eu vendo (painel do vendedor). */
  @UseGuards(JwtAuthGuard)
  @Get('demand/for-me')
  forMe(@Req() req: AuthenticatedRequest) {
    return this.wantedService.matchingMyListings(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateWantedDto) {
    return this.wantedService.create(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  findMine(@Req() req: AuthenticatedRequest) {
    return this.wantedService.findMine(req.user.userId);
  }

  /** Anúncios que apareceram e casam com o que eu procuro. */
  @UseGuards(JwtAuthGuard)
  @Get('me/matches')
  myMatches(@Req() req: AuthenticatedRequest) {
    return this.wantedService.myMatches(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.wantedService.findOwned(req.user.userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateWantedDto,
  ) {
    return this.wantedService.update(req.user.userId, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.wantedService.remove(req.user.userId, id);
  }
}
