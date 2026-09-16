import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { LeadsService } from '../leads/leads.service';
import { PlansService, QUOTA_STATUSES } from '../plans/plans.service';
import { PrismaService } from '../prisma/prisma.service';
import { WantedService } from '../wanted/wanted.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { FilterListingDto } from './dto/filter-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';

/**
 * Dados do vendedor expostos publicamente. E-mail, telefone e documento ficam
 * de fora de propósito: o contato sai por `GET /listings/:id/contact`, que
 * registra o lead e permite medir o valor entregue ao vendedor.
 */
const publicSellerSelect = {
  id: true,
  name: true,
  avatar: true,
  city: true,
  state: true,
  bio: true,
  accountType: true,
  storeName: true,
  storeSlug: true,
  isVerified: true,
  ratingAverage: true,
  ratingCount: true,
  followersCount: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

const sortOptions: Record<string, Prisma.ListingOrderByWithRelationInput> = {
  recent: { publishedAt: 'desc' },
  price_asc: { price: 'asc' },
  price_desc: { price: 'desc' },
  views: { views: 'desc' },
};

@Injectable()
export class ListingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly plansService: PlansService,
    private readonly wantedService: WantedService,
    private readonly leadsService: LeadsService,
  ) {}

  /**
   * Cria o anúncio. `status: 'active'` no DTO significa "quero publicar":
   * vendedor verificado entra direto, os demais passam pela curadoria.
   */
  async create(sellerId: string, dto: CreateListingDto) {
    const wantsToPublish = dto.status !== 'draft';

    await this.plansService.assertListingAllowed(
      sellerId,
      { images: dto.images, videoUrl: dto.videoUrl },
      { countsAgainstQuota: wantsToPublish },
    );

    const status = wantsToPublish
      ? await this.resolvePublishStatus(sellerId)
      : 'draft';

    const listing = await this.prisma.listing.create({
      data: {
        ...dto,
        sellerId,
        status,
        publishedAt: status === 'active' ? new Date() : null,
      } as Prisma.ListingUncheckedCreateInput,
    });

    if (status === 'active') {
      await this.wantedService.matchWantedFor(listing.id);
    }

    return listing;
  }

  async findAll(filters: FilterListingDto) {
    await this.expireFeatured();

    const page = Math.max(filters.page ?? 1, 1);
    const limit = Math.min(Math.max(filters.limit ?? 20, 1), 60);
    const where: Prisma.ListingWhereInput = { status: 'active' };

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { brand: { contains: filters.search, mode: 'insensitive' } },
        { model: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.category) where.category = filters.category;
    if (filters.condition) where.condition = filters.condition;
    if (filters.sellerId) where.sellerId = filters.sellerId;
    if (filters.city) where.city = filters.city;
    if (filters.state) where.state = filters.state;
    if (filters.tag) where.tags = { has: filters.tag };

    if (filters.brand) {
      where.brand = { equals: filters.brand, mode: 'insensitive' };
    }

    if (typeof filters.acceptsTrade === 'boolean') {
      where.acceptsTrade = filters.acceptsTrade;
    }

    // Filtros que recaem sobre o vendedor entram todos no mesmo objeto.
    const sellerFilter: Prisma.UserWhereInput = {};

    if (filters.accountType) sellerFilter.accountType = filters.accountType;
    if (filters.verifiedOnly) sellerFilter.isVerified = true;

    if (filters.sellerMinRating) {
      sellerFilter.ratingAverage = { gte: filters.sellerMinRating };
      sellerFilter.ratingCount = { gt: 0 };
    }

    if (Object.keys(sellerFilter).length > 0) {
      where.seller = sellerFilter;
    }

    if (filters.minPrice || filters.maxPrice) {
      where.price = {
        ...(filters.minPrice ? { gte: filters.minPrice } : {}),
        ...(filters.maxPrice ? { lte: filters.maxPrice } : {}),
      };
    }

    // Ordem da vitrine: destaque pago > peso do plano > critério escolhido.
    const orderBy: Prisma.ListingOrderByWithRelationInput[] = [
      { isFeatured: 'desc' },
      { seller: { searchPriority: 'desc' } },
      sortOptions[filters.sort ?? 'recent'] ?? sortOptions.recent,
    ];

    const [data, total] = await this.prisma.$transaction([
      this.prisma.listing.findMany({
        where,
        include: { seller: { select: publicSellerSelect } },
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

    const [data, total, entitlements] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { leads: true, favoritedBy: true } } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.listing.count({ where }),
      this.plansService.getEntitlements(userId),
    ]);

    return { data, total, page, limit, plan: entitlements.plan, usage: entitlements.usage };
  }

  async findOne(id: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: { seller: { select: publicSellerSelect } },
    });

    if (!listing) {
      throw new HttpException('Anúncio não encontrado', HttpStatus.NOT_FOUND);
    }

    await this.prisma.listing.update({
      where: { id },
      data: { views: { increment: 1 } },
    });

    const contactChannels = await this.prisma.user.findUnique({
      where: { id: listing.sellerId },
      select: { whatsapp: true, publicPhone: true },
    });

    return {
      ...listing,
      views: listing.views + 1,
      // Quais botões de contato mostrar. O número em si vem do /contact.
      contact: {
        whatsapp: Boolean(contactChannels?.whatsapp),
        phone: Boolean(contactChannels?.publicPhone),
        chat: true,
      },
    };
  }

  /**
   * Devolve o contato do vendedor e registra o lead. É a única porta para o
   * telefone/WhatsApp — por isso todo contato que vem da vitrine é contado.
   */
  async getContact(id: string, channel: string, visitorId?: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        sellerId: true,
        title: true,
        seller: {
          select: { whatsapp: true, publicPhone: true, name: true, storeName: true },
        },
      },
    });

    if (!listing || listing.status !== 'active') {
      throw new HttpException('Anúncio não encontrado', HttpStatus.NOT_FOUND);
    }

    await this.leadsService.register(
      { listingId: id, channel, source: 'listing_page' },
      visitorId,
    );

    return {
      sellerName: listing.seller.storeName ?? listing.seller.name,
      whatsapp: channel === 'whatsapp' ? listing.seller.whatsapp : null,
      phone: channel === 'phone' ? listing.seller.publicPhone : null,
      // Mensagem pronta para abrir o WhatsApp já com o assunto.
      suggestedMessage: `Olá! Tenho interesse no anúncio "${listing.title}" que vi no VendaMúsica.`,
    };
  }

  async findRelated(id: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      select: { category: true },
    });

    if (!listing) {
      throw new HttpException('Anúncio não encontrado', HttpStatus.NOT_FOUND);
    }

    return this.prisma.listing.findMany({
      where: { id: { not: id }, status: 'active', category: listing.category },
      include: { seller: { select: publicSellerSelect } },
      orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }],
      take: 8,
    });
  }

  async update(id: string, userId: string, dto: UpdateListingDto) {
    const listing = await this.assertOwnership(id, userId);

    if (dto.images || dto.videoUrl) {
      await this.plansService.assertListingAllowed(
        userId,
        { images: dto.images, videoUrl: dto.videoUrl },
        { countsAgainstQuota: false },
      );
    }

    return this.prisma.listing.update({
      where: { id },
      data: dto as Prisma.ListingUncheckedUpdateInput,
    });
  }

  /** Rascunho ou anúncio recusado indo para a vitrine (passa pela curadoria). */
  async publish(id: string, userId: string) {
    const listing = await this.assertOwnership(id, userId);

    if (QUOTA_STATUSES.includes(listing.status)) {
      throw new HttpException('Anúncio já está publicado', HttpStatus.BAD_REQUEST);
    }

    await this.plansService.assertListingAllowed(
      userId,
      { images: listing.images, videoUrl: listing.videoUrl },
      { countsAgainstQuota: true, ignoreListingId: id },
    );

    const status = await this.resolvePublishStatus(userId);
    const published = await this.prisma.listing.update({
      where: { id },
      data: {
        status,
        rejectionReason: null,
        publishedAt: status === 'active' ? new Date() : null,
      },
    });

    if (status === 'active') {
      await this.wantedService.matchWantedFor(id);
    }

    return published;
  }

  /** Tira da vitrine sem gastar cota (volta como rascunho). */
  async unpublish(id: string, userId: string) {
    await this.assertOwnership(id, userId);

    return this.prisma.listing.update({
      where: { id },
      data: { status: 'draft' },
    });
  }

  /**
   * "Vendi este instrumento". Sem checkout, é a única forma de saber que a
   * vitrine funcionou — e alimenta o histórico de preços mais adiante.
   */
  async markAsSold(id: string, userId: string) {
    await this.assertOwnership(id, userId);

    return this.prisma.listing.update({
      where: { id },
      data: {
        status: 'sold',
        soldAt: new Date(),
        isFeatured: false,
        featuredUntil: null,
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.assertOwnership(id, userId);

    return this.prisma.listing.update({
      where: { id },
      data: { status: 'deleted', isFeatured: false, featuredUntil: null },
    });
  }

  private async assertOwnership(id: string, userId: string) {
    const listing = await this.prisma.listing.findUnique({ where: { id } });

    if (!listing) {
      throw new HttpException('Anúncio não encontrado', HttpStatus.NOT_FOUND);
    }

    if (listing.sellerId !== userId) {
      throw new HttpException('Sem permissão', HttpStatus.FORBIDDEN);
    }

    return listing;
  }

  /** Vendedor verificado publica direto; os demais entram na fila. */
  private async resolvePublishStatus(sellerId: string) {
    const seller = await this.prisma.user.findUnique({
      where: { id: sellerId },
      select: { isVerified: true },
    });

    return seller?.isVerified ? 'active' : 'pending_review';
  }

  /** Destaque pago vencido deixa de ranquear na próxima busca. */
  private expireFeatured() {
    return this.prisma.listing.updateMany({
      where: { isFeatured: true, featuredUntil: { lt: new Date() } },
      data: { isFeatured: false },
    });
  }
}
