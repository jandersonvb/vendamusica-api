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
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewsService } from './reviews.service';

type AuthenticatedRequest = Request & { user: { userId: string } };

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(req.user.userId, dto);
  }

  @Get('seller/:sellerId')
  getSellerReviews(@Param('sellerId') sellerId: string) {
    return this.reviewsService.getSellerReviews(sellerId);
  }

  @Get('listing/:listingId')
  getListingReviews(@Param('listingId') listingId: string) {
    return this.reviewsService.getListingReviews(listingId);
  }
}
