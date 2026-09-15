import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

const authorSelect = {
  id: true,
  name: true,
  avatar: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(authorId: string, dto: CreateReviewDto) {
    if (dto.sellerId === authorId) {
      throw new HttpException(
        'Cannot review yourself',
        HttpStatus.BAD_REQUEST,
      );
    }

    const seller = await this.prisma.user.findUnique({
      where: { id: dto.sellerId },
      select: { id: true },
    });

    if (!seller) {
      throw new HttpException('Seller not found', HttpStatus.NOT_FOUND);
    }

    const review = await this.prisma.review.create({
      data: {
        authorId,
        sellerId: dto.sellerId,
        listingId: dto.listingId ?? null,
        rating: dto.rating,
        comment: dto.comment,
      },
      include: { author: { select: authorSelect } },
    });

    await this.recomputeSellerRating(dto.sellerId);

    return review;
  }

  async getSellerReviews(sellerId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: authorSelect } },
    });

    return { ...this.summarize(reviews), reviews };
  }

  async getListingReviews(listingId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { listingId },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: authorSelect } },
    });

    return { ...this.summarize(reviews), reviews };
  }

  private summarize(reviews: { rating: number }[]) {
    const total = reviews.length;
    const average =
      total === 0
        ? 0
        : Math.round(
            (reviews.reduce((sum, r) => sum + r.rating, 0) / total) * 10,
          ) / 10;
    const positive = reviews.filter((r) => r.rating >= 4).length;
    const positivePercent =
      total === 0 ? 0 : Math.round((positive / total) * 100);
    const distribution = [5, 4, 3, 2, 1].reduce<Record<number, number>>(
      (acc, star) => {
        acc[star] = reviews.filter((r) => r.rating === star).length;
        return acc;
      },
      {},
    );

    return { average, total, positivePercent, distribution };
  }

  private async recomputeSellerRating(sellerId: string) {
    const aggregate = await this.prisma.review.aggregate({
      where: { sellerId },
      _avg: { rating: true },
      _count: { _all: true },
    });

    await this.prisma.user.update({
      where: { id: sellerId },
      data: {
        ratingAverage:
          Math.round((aggregate._avg.rating ?? 0) * 10) / 10,
        ratingCount: aggregate._count._all,
      },
    });
  }
}
