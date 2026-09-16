import { Injectable } from '@nestjs/common';
import { LeadsService } from '../leads/leads.service';
import { PlansService } from '../plans/plans.service';
import { PrismaService } from '../prisma/prisma.service';
import { WantedService } from '../wanted/wanted.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leadsService: LeadsService,
    private readonly plansService: PlansService,
    private readonly wantedService: WantedService,
  ) {}

  /**
   * Painel da vitrine: o vendedor precisa ver o retorno do plano em contatos,
   * não em vendas — a venda acontece fora da plataforma.
   */
  async getOverview(sellerId: string) {
    const [statusGroups, viewsAgg, conversations, leads, entitlements, demand] =
      await Promise.all([
        this.prisma.listing.groupBy({
          by: ['status'],
          where: { sellerId },
          _count: { _all: true },
        }),
        this.prisma.listing.aggregate({
          where: { sellerId, status: { not: 'deleted' } },
          _sum: { views: true },
        }),
        this.prisma.conversation.findMany({
          where: { sellerId },
          include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
        }),
        this.leadsService.summary(sellerId, 30),
        this.plansService.getEntitlements(sellerId),
        this.wantedService.matchingMyListings(sellerId),
      ]);

    const byStatus = {
      active: 0,
      draft: 0,
      pending_review: 0,
      rejected: 0,
      paused: 0,
      sold: 0,
    };
    for (const group of statusGroups) {
      if (group.status in byStatus) {
        byStatus[group.status as keyof typeof byStatus] = group._count._all;
      }
    }

    const totalListings = Object.values(byStatus).reduce(
      (sum, count) => sum + count,
      0,
    );

    const pendingMessages = conversations.filter(
      (conversation) =>
        conversation.messages[0] &&
        conversation.messages[0].senderId !== sellerId,
    ).length;

    const totalViews = viewsAgg._sum.views ?? 0;
    // Quantos visitantes viraram contato. É o número que a loja acompanha.
    const conversionPercent =
      totalViews === 0
        ? 0
        : Math.round((leads.total / totalViews) * 1000) / 10;

    return {
      listings: { total: totalListings, ...byStatus },
      statusDistribution: byStatus,
      views: { total: totalViews },
      leads: {
        last30Days: leads.total,
        previous30Days: leads.previousTotal,
        changePercent: leads.changePercent,
        byChannel: leads.byChannel,
        conversionPercent,
      },
      series: leads.series,
      topListings: leads.topListings,
      pendingMessages,
      plan: entitlements.plan,
      subscription: entitlements.subscription,
      usage: entitlements.usage,
      // "X pessoas estão procurando o que você vende"
      demand,
    };
  }

  /** Últimos contatos recebidos, para a aba "Contatos" do painel. */
  recentLeads(sellerId: string, limit?: number) {
    return this.leadsService.findRecent(sellerId, limit);
  }
}
