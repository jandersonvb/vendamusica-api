import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { LeadsService } from '../leads/leads.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateStoreDto } from './dto/update-store.dto';

/** Perfil público da loja. Contato sai por /sellers/:id/contact (vira lead). */
const storeSelect = {
  id: true,
  name: true,
  avatar: true,
  bio: true,
  city: true,
  state: true,
  accountType: true,
  storeName: true,
  storeSlug: true,
  storeBanner: true,
  storeAddress: true,
  storeHours: true,
  storeWebsite: true,
  isVerified: true,
  ratingAverage: true,
  ratingCount: true,
  followersCount: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class SellersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leadsService: LeadsService,
  ) {}

  getProfile(id: string) {
    return this.buildProfile({ id });
  }

  getProfileBySlug(slug: string) {
    return this.buildProfile({ storeSlug: slug });
  }

  private async buildProfile(where: Prisma.UserWhereUniqueInput) {
    const seller = await this.prisma.user.findUnique({
      where,
      select: { ...storeSelect, whatsapp: true, publicPhone: true },
    });

    if (!seller) {
      throw new HttpException('Vendedor não encontrado', HttpStatus.NOT_FOUND);
    }

    const { whatsapp, publicPhone, ...publicData } = seller;

    const [listingsCount, soldCount, totalReviews, positiveReviews] =
      await this.prisma.$transaction([
        this.prisma.listing.count({
          where: { sellerId: seller.id, status: 'active' },
        }),
        this.prisma.listing.count({
          where: { sellerId: seller.id, status: 'sold' },
        }),
        this.prisma.review.count({ where: { sellerId: seller.id } }),
        this.prisma.review.count({
          where: { sellerId: seller.id, rating: { gte: 4 } },
        }),
      ]);

    const positivePercent =
      totalReviews === 0
        ? 0
        : Math.round((positiveReviews / totalReviews) * 100);

    return {
      ...publicData,
      contact: {
        whatsapp: Boolean(whatsapp),
        phone: Boolean(publicPhone),
        chat: true,
      },
      stats: {
        listingsCount,
        soldCount,
        followersCount: seller.followersCount,
        ratingAverage: seller.ratingAverage,
        ratingCount: seller.ratingCount,
        positivePercent,
      },
    };
  }

  /** Contato da loja a partir da página dela (fora de um anúncio). */
  async getContact(sellerId: string, channel: string, visitorId?: string) {
    const seller = await this.prisma.user.findUnique({
      where: { id: sellerId },
      select: { id: true, name: true, storeName: true, whatsapp: true, publicPhone: true },
    });

    if (!seller) {
      throw new HttpException('Vendedor não encontrado', HttpStatus.NOT_FOUND);
    }

    await this.leadsService.register(
      { sellerId, channel, source: 'store_page' },
      visitorId,
    );

    return {
      sellerName: seller.storeName ?? seller.name,
      whatsapp: channel === 'whatsapp' ? seller.whatsapp : null,
      phone: channel === 'phone' ? seller.publicPhone : null,
      suggestedMessage: `Olá! Vi sua loja no VendaMúsica e queria saber mais.`,
    };
  }

  async follow(followerId: string, sellerId: string) {
    if (followerId === sellerId) {
      throw new HttpException('Não dá para seguir a si mesmo', HttpStatus.BAD_REQUEST);
    }

    const seller = await this.prisma.user.findUnique({
      where: { id: sellerId },
      select: { id: true },
    });

    if (!seller) {
      throw new HttpException('Vendedor não encontrado', HttpStatus.NOT_FOUND);
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
    await this.prisma.follow.deleteMany({ where: { followerId, sellerId } });

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

  /** Lojas em destaque na home — plano Premium primeiro. */
  featuredStores(limit = 8) {
    return this.prisma.user.findMany({
      where: {
        accountType: 'store',
        listings: { some: { status: 'active' } },
      },
      select: {
        ...storeSelect,
        _count: { select: { listings: true } },
      },
      orderBy: [{ searchPriority: 'desc' }, { followersCount: 'desc' }],
      take: Math.min(Math.max(limit, 1), 24),
    });
  }

  async updateMyStore(userId: string, dto: UpdateStoreDto) {
    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data: dto,
        select: { ...storeSelect, whatsapp: true, publicPhone: true, document: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new HttpException(
          'Esse endereço de loja já está em uso',
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
