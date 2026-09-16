import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PlansService } from '../plans/plans.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWantedDto } from './dto/create-wanted.dto';
import { UpdateWantedDto } from './dto/update-wanted.dto';

const buyerSelect = {
  id: true,
  name: true,
  avatar: true,
  city: true,
  state: true,
} satisfies Prisma.UserSelect;

const listingSelect = {
  id: true,
  title: true,
  price: true,
  images: true,
  city: true,
  state: true,
  sellerId: true,
} satisfies Prisma.ListingSelect;

@Injectable()
export class WantedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly plansService: PlansService,
  ) {}

  async create(userId: string, dto: CreateWantedDto) {
    const wanted = await this.prisma.wantedItem.create({
      data: { ...dto, userId },
    });

    await this.matchListingsFor(wanted.id);

    return this.findOwned(userId, wanted.id);
  }

  findMine(userId: string) {
    return this.prisma.wantedItem.findMany({
      where: { userId, status: { not: 'archived' } },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { matches: true } },
      },
    });
  }

  async findOwned(userId: string, id: string) {
    const wanted = await this.prisma.wantedItem.findUnique({
      where: { id },
      include: {
        matches: {
          orderBy: { createdAt: 'desc' },
          include: { listing: { select: listingSelect } },
        },
      },
    });

    if (!wanted || wanted.userId !== userId) {
      throw new HttpException('Procura não encontrada', HttpStatus.NOT_FOUND);
    }

    return wanted;
  }

  async update(userId: string, id: string, dto: UpdateWantedDto) {
    await this.findOwned(userId, id);

    const updated = await this.prisma.wantedItem.update({
      where: { id },
      data: dto,
    });

    if (updated.status === 'active') {
      await this.matchListingsFor(id);
    }

    return updated;
  }

  async remove(userId: string, id: string) {
    await this.findOwned(userId, id);

    return this.prisma.wantedItem.update({
      where: { id },
      data: { status: 'archived' },
    });
  }

  /**
   * Resumo público da demanda: quantas pessoas procuram cada categoria.
   * É o gancho de venda do plano — a lista com nome e contato exige plano pago.
   */
  async demandSummary(filters: { category?: string; city?: string; state?: string }) {
    const where: Prisma.WantedItemWhereInput = {
      status: 'active',
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.city ? { city: filters.city } : {}),
      ...(filters.state ? { state: filters.state } : {}),
    };

    // Promise.all e não $transaction: dentro da transação o Prisma perde a
    // tipagem de `_count` no groupBy.
    const [total, byCategory] = await Promise.all([
      this.prisma.wantedItem.count({ where }),
      this.prisma.wantedItem.groupBy({
        by: ['category'],
        where,
        _count: { _all: true },
        orderBy: { category: 'asc' },
      }),
    ]);

    return {
      total,
      byCategory: byCategory
        .map((row) => ({ category: row.category, count: row._count._all }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 12),
    };
  }

  /**
   * Lista de quem está procurando, para o vendedor. Sem plano que libere a
   * lista, devolve só a contagem (o "37 pessoas procurando" do painel).
   */
  async demandList(
    userId: string,
    filters: { category?: string; city?: string; state?: string; page?: number; limit?: number },
  ) {
    const { plan } = await this.plansService.getEntitlements(userId);
    const where: Prisma.WantedItemWhereInput = {
      status: 'active',
      userId: { not: userId },
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.city ? { city: filters.city } : {}),
      ...(filters.state ? { state: filters.state } : {}),
    };

    const total = await this.prisma.wantedItem.count({ where });

    if (!plan.seesWantedList) {
      return {
        locked: true,
        total,
        data: [],
        message:
          'Faça upgrade para ver quem está procurando e falar direto com essas pessoas.',
      };
    }

    const page = Math.max(filters.page ?? 1, 1);
    const limit = Math.min(Math.max(filters.limit ?? 20, 1), 50);

    const data = await this.prisma.wantedItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { user: { select: buyerSelect } },
    });

    return { locked: false, total, page, limit, data };
  }

  /** Procuras que casam com os anúncios ativos do vendedor. */
  async matchingMyListings(userId: string) {
    const listings = await this.prisma.listing.findMany({
      where: { sellerId: userId, status: 'active' },
      select: { category: true, brand: true, price: true },
    });

    if (listings.length === 0) {
      return { total: 0, byCategory: [] };
    }

    const categories = [...new Set(listings.map((listing) => listing.category))];
    const { plan } = await this.plansService.getEntitlements(userId);

    const grouped = await this.prisma.wantedItem.groupBy({
      by: ['category'],
      where: {
        status: 'active',
        userId: { not: userId },
        category: { in: categories },
      },
      _count: { _all: true },
    });

    return {
      total: grouped.reduce((sum, row) => sum + row._count._all, 0),
      byCategory: grouped.map((row) => ({
        category: row.category,
        count: row._count._all,
      })),
      canSeeList: plan.seesWantedList,
    };
  }

  /** Anúncios novos que casaram com as procuras do comprador. */
  async myMatches(userId: string) {
    const matches = await this.prisma.wantedMatch.findMany({
      where: { wantedItem: { userId, status: 'active' } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        listing: { select: listingSelect },
        wantedItem: { select: { id: true, title: true, category: true } },
      },
    });

    await this.prisma.wantedMatch.updateMany({
      where: { wantedItem: { userId }, buyerNotified: false },
      data: { buyerNotified: true },
    });

    return matches;
  }

  /**
   * Cruza um anúncio recém-publicado com as procuras abertas.
   * Chamado quando o anúncio entra no ar.
   */
  async matchWantedFor(listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        category: true,
        brand: true,
        price: true,
        condition: true,
        state: true,
        sellerId: true,
        status: true,
      },
    });

    if (!listing || listing.status !== 'active') return 0;

    const candidates = await this.prisma.wantedItem.findMany({
      where: {
        status: 'active',
        category: listing.category,
        userId: { not: listing.sellerId },
        ...(listing.brand
          ? { OR: [{ brand: null }, { brand: { equals: listing.brand, mode: 'insensitive' } }] }
          : {}),
        ...(listing.price !== null
          ? { OR: [{ maxPrice: null }, { maxPrice: { gte: listing.price } }] }
          : {}),
      },
      select: { id: true, state: true, condition: true },
    });

    const matched = candidates.filter(
      (wanted) =>
        (!wanted.state || wanted.state === listing.state) &&
        (!wanted.condition || wanted.condition === listing.condition),
    );

    if (matched.length === 0) return 0;

    const result = await this.prisma.wantedMatch.createMany({
      data: matched.map((wanted) => ({
        wantedItemId: wanted.id,
        listingId: listing.id,
      })),
      skipDuplicates: true,
    });

    return result.count;
  }

  /** Cruza uma procura recém-criada com os anúncios que já estão no ar. */
  private async matchListingsFor(wantedItemId: string) {
    const wanted = await this.prisma.wantedItem.findUnique({
      where: { id: wantedItemId },
    });

    if (!wanted || wanted.status !== 'active') return 0;

    const listings = await this.prisma.listing.findMany({
      where: {
        status: 'active',
        category: wanted.category,
        sellerId: { not: wanted.userId },
        ...(wanted.brand
          ? { brand: { equals: wanted.brand, mode: 'insensitive' } }
          : {}),
        ...(wanted.maxPrice ? { price: { lte: wanted.maxPrice } } : {}),
        ...(wanted.state ? { state: wanted.state } : {}),
        ...(wanted.condition ? { condition: wanted.condition } : {}),
      },
      select: { id: true },
      take: 100,
    });

    if (listings.length === 0) return 0;

    const result = await this.prisma.wantedMatch.createMany({
      data: listings.map((listing) => ({
        wantedItemId: wanted.id,
        listingId: listing.id,
      })),
      skipDuplicates: true,
    });

    return result.count;
  }
}
