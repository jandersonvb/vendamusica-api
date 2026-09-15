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

const listingInclude = {
  seller: { select: sellerSelect },
} satisfies Prisma.ListingInclude;

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  private get cartItem() {
    return (this.prisma as unknown as { cartItem: any }).cartItem;
  }

  async list(userId: string) {
    const items = await this.cartItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        listing: { include: listingInclude },
      },
    });

    return items.map((item) => item.listing);
  }

  async add(userId: string, listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, sellerId: true, status: true },
    });

    if (!listing || listing.status !== 'active') {
      throw new HttpException('Listing not found', HttpStatus.NOT_FOUND);
    }

    if (listing.sellerId === userId) {
      throw new HttpException(
        'Cannot add your own listing to cart',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.cartItem.upsert({
      where: { userId_listingId: { userId, listingId } },
      update: {},
      create: { userId, listingId },
    });

    return this.findListing(listingId);
  }

  async remove(userId: string, listingId: string) {
    await this.cartItem.deleteMany({
      where: { userId, listingId },
    });

    return { removed: true, listingId };
  }

  async clear(userId: string) {
    await this.cartItem.deleteMany({ where: { userId } });
    return { cleared: true };
  }

  private async findListing(listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: listingInclude,
    });

    if (!listing) {
      throw new HttpException('Listing not found', HttpStatus.NOT_FOUND);
    }

    return listing;
  }
}
