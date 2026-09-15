import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { FilterListingDto } from './dto/filter-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';

const sellerSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  avatar: true,
  city: true,
  state: true,
  bio: true,
  asaasWalletId: true,
  bankDataCompleted: true,
  ratingAverage: true,
  ratingCount: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

const sortOptions: Record<string, Prisma.ListingOrderByWithRelationInput> = {
  recent: { createdAt: 'desc' },
  price_asc: { price: 'asc' },
  price_desc: { price: 'desc' },
  views: { views: 'desc' },
};

@Injectable()
export class ListingsService {
  constructor(private readonly prisma: PrismaService) {}

  create(sellerId: string, dto: CreateListingDto) {
    return this.prisma.listing.create({
      data: { ...dto, sellerId } as Prisma.ListingUncheckedCreateInput,
    });
  }

  async findAll(filters: FilterListingDto) {
    const page = Math.max(filters.page ?? 1, 1);
    const limit = Math.max(filters.limit ?? 20, 1);
    const where: Prisma.ListingWhereInput = {
      status: 'active',
    };

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { brand: { contains: filters.search, mode: 'insensitive' } },
        { model: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.condition) {
      where.condition = filters.condition;
    }

    if (filters.brand) {
      where.brand = { equals: filters.brand, mode: 'insensitive' };
    }

    if (filters.sellerId) {
      where.sellerId = filters.sellerId;
    }

    if (filters.tag) {
      where.tags = { has: filters.tag };
    }

    if (typeof filters.acceptsTrade === 'boolean') {
      where.acceptsTrade = filters.acceptsTrade;
    }

    if (filters.sellerMinRating) {
      where.seller = {
        ratingAverage: { gte: filters.sellerMinRating },
        ratingCount: { gt: 0 },
      };
    }

    if (filters.city) {
      where.city = filters.city;
    }

    if (filters.state) {
      where.state = filters.state;
    }

    if (filters.minPrice || filters.maxPrice) {
      where.price = {
        ...(filters.minPrice ? { gte: filters.minPrice } : {}),
        ...(filters.maxPrice ? { lte: filters.maxPrice } : {}),
      };
    }

    const orderBy = sortOptions[filters.sort ?? 'recent'] ?? sortOptions.recent;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.listing.findMany({
        where,
        include: { seller: { select: sellerSelect } },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.listing.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findMine(
    userId: string,
    opts: { status?: string; page?: number; limit?: number },
  ) {
    const page = Math.max(opts.page ?? 1, 1);
    const limit = Math.max(opts.limit ?? 20, 1);
    const where: Prisma.ListingWhereInput = {
      sellerId: userId,
      status: opts.status ? opts.status : { not: 'deleted' },
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.listing.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.listing.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: { seller: { select: sellerSelect } },
    });

    if (!listing) {
      throw new HttpException('Listing not found', HttpStatus.NOT_FOUND);
    }

    await this.prisma.listing.update({
      where: { id },
      data: { views: { increment: 1 } },
    });

    return { ...listing, views: listing.views + 1 };
  }

  async findRelated(id: string) {
    const listing = await this.prisma.listing.findUnique({ where: { id } });

    if (!listing) {
      throw new HttpException('Listing not found', HttpStatus.NOT_FOUND);
    }

    return this.prisma.listing.findMany({
      where: {
        id: { not: id },
        status: 'active',
        category: listing.category,
      },
      include: { seller: { select: sellerSelect } },
      orderBy: { createdAt: 'desc' },
      take: 8,
    });
  }

  async update(id: string, userId: string, dto: UpdateListingDto) {
    const listing = await this.prisma.listing.findUnique({ where: { id } });

    if (!listing) {
      throw new HttpException('Listing not found', HttpStatus.NOT_FOUND);
    }

    if (listing.sellerId !== userId) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    return this.prisma.listing.update({
      where: { id },
      data: dto as Prisma.ListingUncheckedUpdateInput,
    });
  }

  async remove(id: string, userId: string) {
    const listing = await this.prisma.listing.findUnique({ where: { id } });

    if (!listing) {
      throw new HttpException('Listing not found', HttpStatus.NOT_FOUND);
    }

    if (listing.sellerId !== userId) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    return this.prisma.listing.update({
      where: { id },
      data: { status: 'deleted' },
    });
  }
}
