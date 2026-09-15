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
import { CreateListingDto } from './dto/create-listing.dto';
import { FilterListingDto } from './dto/filter-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { ListingsService } from './listings.service';

type AuthenticatedRequest = Request & { user: { userId: string } };

@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateListingDto) {
    return this.listingsService.create(req.user.userId, dto);
  }

  @Get()
  findAll(@Query() filters: FilterListingDto) {
    return this.listingsService.findAll(filters);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  findMine(
    @Req() req: AuthenticatedRequest,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.listingsService.findMine(req.user.userId, {
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.listingsService.findOne(id);
  }

  @Get(':id/related')
  findRelated(@Param('id') id: string) {
    return this.listingsService.findRelated(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateListingDto,
  ) {
    return this.listingsService.update(id, req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.listingsService.remove(id, req.user.userId);
  }
}
