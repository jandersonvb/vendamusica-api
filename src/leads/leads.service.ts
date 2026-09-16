import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';

const DAY_MS = 86_400_000;

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra um contato. O visitante pode estar deslogado (clique no WhatsApp
   * de um anúncio público), por isso `visitorId` é opcional.
   */
  async register(dto: CreateLeadDto, visitorId?: string) {
    let sellerId = dto.sellerId;

    if (dto.listingId) {
      const listing = await this.prisma.listing.findUnique({
        where: { id: dto.listingId },
        select: { sellerId: true },
      });

      if (!listing) {
        throw new HttpException('Anúncio não encontrado', HttpStatus.NOT_FOUND);
      }

      sellerId = listing.sellerId;
    }

    if (!sellerId) {
      throw new HttpException(
        'Informe listingId ou sellerId',
        HttpStatus.BAD_REQUEST,
      );
    }

    // O próprio vendedor clicando no seu anúncio não vira lead.
    if (visitorId && visitorId === sellerId) {
      return { registered: false };
    }

    await this.prisma.lead.create({
      data: {
        sellerId,
        listingId: dto.listingId ?? null,
        visitorId: visitorId ?? null,
        channel: dto.channel,
        source: dto.source ?? null,
      },
    });

    return { registered: true };
  }

  /** Números do painel do vendedor: total, por canal, série e top anúncios. */
  async summary(sellerId: string, days = 30) {
    const period = Math.min(Math.max(days, 1), 180);
    const now = new Date();
    const start = new Date(now.getTime() - (period - 1) * DAY_MS);
    start.setHours(0, 0, 0, 0);
    const previousStart = new Date(start.getTime() - period * DAY_MS);

    const [current, previousCount, byChannel, topListings] = await Promise.all([
      this.prisma.lead.findMany({
        where: { sellerId, createdAt: { gte: start } },
        select: { createdAt: true, channel: true },
      }),
      this.prisma.lead.count({
        where: { sellerId, createdAt: { gte: previousStart, lt: start } },
      }),
      this.prisma.lead.groupBy({
        by: ['channel'],
        where: { sellerId, createdAt: { gte: start } },
        _count: { _all: true },
      }),
      this.prisma.lead.groupBy({
        by: ['listingId'],
        where: { sellerId, createdAt: { gte: start }, listingId: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { listingId: 'desc' } },
        take: 5,
      }),
    ]);

    const listings = await this.prisma.listing.findMany({
      where: { id: { in: topListings.map((row) => row.listingId as string) } },
      select: { id: true, title: true, images: true, views: true },
    });

    const changePercent =
      previousCount === 0
        ? null
        : Math.round(
            ((current.length - previousCount) / previousCount) * 1000,
          ) / 10;

    return {
      period,
      total: current.length,
      previousTotal: previousCount,
      changePercent,
      byChannel: byChannel.map((row) => ({
        channel: row.channel,
        count: row._count._all,
      })),
      series: this.buildSeries(start, period, current),
      topListings: topListings.map((row) => {
        const listing = listings.find((item) => item.id === row.listingId);
        return {
          listingId: row.listingId,
          title: listing?.title ?? null,
          image: listing?.images[0] ?? null,
          views: listing?.views ?? 0,
          leads: row._count._all,
        };
      }),
    };
  }

  /** Últimos contatos recebidos, com quem entrou em contato quando logado. */
  findRecent(sellerId: string, limit = 30) {
    return this.prisma.lead.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
      include: {
        listing: { select: { id: true, title: true, images: true } },
        visitor: {
          select: { id: true, name: true, avatar: true, city: true, state: true },
        },
      },
    });
  }

  private buildSeries(
    start: Date,
    days: number,
    leads: { createdAt: Date; channel: string }[],
  ) {
    const buckets = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const day = new Date(start.getTime() + i * DAY_MS);
      buckets.set(day.toISOString().slice(0, 10), 0);
    }

    for (const lead of leads) {
      const key = lead.createdAt.toISOString().slice(0, 10);
      if (buckets.has(key)) {
        buckets.set(key, (buckets.get(key) ?? 0) + 1);
      }
    }

    return Array.from(buckets.entries()).map(([date, leads]) => ({
      date,
      leads,
    }));
  }

  /** Total de leads de um vendedor — usado no perfil público da loja. */
  countForSeller(sellerId: string, where: Prisma.LeadWhereInput = {}) {
    return this.prisma.lead.count({ where: { sellerId, ...where } });
  }
}
