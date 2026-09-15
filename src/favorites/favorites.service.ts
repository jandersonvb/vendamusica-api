import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const sellerSelect = {
  id: true,
  name: true,
  avatar: true,
  city: true,
  state: true,
  ratingAverage: true,
  ratingCount: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async add(userId: string, listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true },
    });

    if (!listing) {
      throw new HttpException('Listing not found', HttpStatus.NOT_FOUND);
    }

    await this.prisma.favorite.upsert({
      where: { userId_listingId: { userId, listingId } },
      update: {},
      create: { userId, listingId },
    });

    return { favorited: true, listingId };
  }

  async remove(userId: string, listingId: string) {
    await this.prisma.favorite.deleteMany({
      where: { userId, listingId },
    });

    return { favorited: false, listingId };
  }

  async list(userId: string) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        listing: {
          include: { seller: { select: sellerSelect } },
        },
      },
    });

    return favorites.map((favorite) => favorite.listing);
  }

  async listIds(userId: string) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      select: { listingId: true },
    });

    return favorites.map((favorite) => favorite.listingId);
  }
}
