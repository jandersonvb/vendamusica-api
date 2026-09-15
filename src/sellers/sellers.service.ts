import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateStoreDto } from './dto/update-store.dto';

const storeSelect = {
  id: true,
  name: true,
  avatar: true,
  bio: true,
  city: true,
  state: true,
  storeName: true,
  storeSlug: true,
  storeBanner: true,
  isVerified: true,
  ratingAverage: true,
  ratingCount: true,
  followersCount: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class SellersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(id: string) {
    const seller = await this.prisma.user.findUnique({
      where: { id },
      select: storeSelect,
    });

    if (!seller) {
      throw new HttpException('Seller not found', HttpStatus.NOT_FOUND);
    }

    const [listingsCount, salesCount, totalReviews, positiveReviews] =
      await this.prisma.$transaction([
        this.prisma.listing.count({
          where: { sellerId: id, status: 'active' },
        }),
        this.prisma.order.count({
          where: { sellerId: id, status: 'paid' },
        }),
        this.prisma.review.count({ where: { sellerId: id } }),
        this.prisma.review.count({
          where: { sellerId: id, rating: { gte: 4 } },
        }),
      ]);

    const positivePercent =
      totalReviews === 0
        ? 0
        : Math.round((positiveReviews / totalReviews) * 100);

    return {
      ...seller,
      stats: {
        listingsCount,
        salesCount,
        followersCount: seller.followersCount,
        ratingAverage: seller.ratingAverage,
        ratingCount: seller.ratingCount,
        positivePercent,
      },
    };
  }

  async follow(followerId: string, sellerId: string) {
    if (followerId === sellerId) {
      throw new HttpException('Cannot follow yourself', HttpStatus.BAD_REQUEST);
    }

    const seller = await this.prisma.user.findUnique({
      where: { id: sellerId },
      select: { id: true },
    });

    if (!seller) {
      throw new HttpException('Seller not found', HttpStatus.NOT_FOUND);
    }

    await this.prisma.follow.upsert({
      where: { followerId_sellerId: { followerId, sellerId } },
      update: {},
      create: { followerId, sellerId },
    });

    const followersCount = await this.recomputeFollowers(sellerId);

    return { following: true, sellerId, followersCount };
  }

  async unfollow(followerId: string, sellerId: string) {
    await this.prisma.follow.deleteMany({
      where: { followerId, sellerId },
    });

    const followersCount = await this.recomputeFollowers(sellerId);

    return { following: false, sellerId, followersCount };
  }

  async followingIds(userId: string) {
    const follows = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { sellerId: true },
    });

    return follows.map((follow) => follow.sellerId);
  }

  async updateMyStore(userId: string, dto: UpdateStoreDto) {
    try {
      const updated = await this.prisma.user.update({
        where: { id: userId },
        data: dto,
        select: storeSelect,
      });

      return updated;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new HttpException(
          'Store slug already in use',
          HttpStatus.CONFLICT,
        );
      }

      throw error;
    }
  }

  private async recomputeFollowers(sellerId: string) {
    const followersCount = await this.prisma.follow.count({
      where: { sellerId },
    });

    await this.prisma.user.update({
      where: { id: sellerId },
      data: { followersCount },
    });

    return followersCount;
  }
}
