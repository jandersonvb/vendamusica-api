import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WantedService } from '../wanted/wanted.service';
import { CreateReportDto } from './dto/create-report.dto';
import { RejectListingDto } from './dto/reject-listing.dto';

@Injectable()
export class ModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wantedService: WantedService,
  ) {}

  /** Fila de aprovação. Anúncio só entra na vitrine depois de passar por aqui. */
  async pendingListings(page = 1, limit = 20) {
    const take = Math.min(Math.max(limit, 1), 100);
    const skip = (Math.max(page, 1) - 1) * take;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.listing.findMany({
        where: { status: 'pending_review' },
        orderBy: { updatedAt: 'asc' },
        skip,
        take,
        include: {
          seller: {
            select: {
              id: true,
              name: true,
              email: true,
              accountType: true,
              storeName: true,
              isVerified: true,
              createdAt: true,
            },
          },
        },
      }),
      this.prisma.listing.count({ where: { status: 'pending_review' } }),
    ]);

    return { data, total, page, limit: take };
  }

  async approve(listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new HttpException('Anúncio não encontrado', HttpStatus.NOT_FOUND);
    }

    const approved = await this.prisma.listing.update({
      where: { id: listingId },
      data: {
        status: 'active',
        publishedAt: listing.publishedAt ?? new Date(),
        rejectionReason: null,
      },
    });

    // Anúncio no ar: cruza com quem está procurando por ele.
    await this.wantedService.matchWantedFor(listingId);

    return approved;
  }

  async reject(listingId: string, dto: RejectListingDto) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true },
    });

    if (!listing) {
      throw new HttpException('Anúncio não encontrado', HttpStatus.NOT_FOUND);
    }

    return this.prisma.listing.update({
      where: { id: listingId },
      data: { status: 'rejected', rejectionReason: dto.reason },
    });
  }

  async verifySeller(sellerId: string, verified: boolean) {
    const seller = await this.prisma.user.findUnique({
      where: { id: sellerId },
      select: { id: true },
    });

    if (!seller) {
      throw new HttpException('Vendedor não encontrado', HttpStatus.NOT_FOUND);
    }

    return this.prisma.user.update({
      where: { id: sellerId },
      data: { isVerified: verified },
      select: { id: true, name: true, storeName: true, isVerified: true },
    });
  }

  async report(listingId: string, reporterId: string | undefined, dto: CreateReportDto) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true },
    });

    if (!listing) {
      throw new HttpException('Anúncio não encontrado', HttpStatus.NOT_FOUND);
    }

    await this.prisma.report.create({
      data: {
        listingId,
        reporterId: reporterId ?? null,
        reason: dto.reason,
        details: dto.details ?? null,
      },
    });

    return { reported: true };
  }

  listReports(status = 'open') {
    return this.prisma.report.findMany({
      where: { status },
      orderBy: { createdAt: 'asc' },
      include: {
        listing: {
          select: { id: true, title: true, images: true, status: true, sellerId: true },
        },
        reporter: { select: { id: true, name: true, email: true } },
      },
    });
  }

  /** `removeListing` tira o anúncio do ar junto com a resolução da denúncia. */
  async resolveReport(reportId: string, removeListing: boolean) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new HttpException('Denúncia não encontrada', HttpStatus.NOT_FOUND);
    }

    const resolved = await this.prisma.report.update({
      where: { id: reportId },
      data: {
        status: removeListing ? 'removed' : 'reviewed',
        reviewedAt: new Date(),
      },
    });

    if (removeListing) {
      await this.prisma.listing.update({
        where: { id: report.listingId },
        data: { status: 'paused', rejectionReason: 'Removido após denúncia' },
      });
    }

    return resolved;
  }
}
