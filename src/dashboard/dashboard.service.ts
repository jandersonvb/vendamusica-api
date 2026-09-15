import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const PAID_STATUSES = ['paid', 'shipped', 'delivered'];

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(sellerId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const start30Days = new Date(now);
    start30Days.setDate(start30Days.getDate() - 29);
    start30Days.setHours(0, 0, 0, 0);

    const [statusGroups, viewsAgg, monthOrders, prevMonthOrders, conversations] =
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
        this.prisma.order.findMany({
          where: {
            sellerId,
            status: { in: PAID_STATUSES },
            paidAt: { gte: startOfMonth },
          },
          select: { amount: true },
        }),
        this.prisma.order.findMany({
          where: {
            sellerId,
            status: { in: PAID_STATUSES },
            paidAt: { gte: startOfPrevMonth, lt: startOfMonth },
          },
          select: { amount: true },
        }),
        this.prisma.conversation.findMany({
          where: { sellerId },
          include: {
            messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        }),
      ]);

    const byStatus = { active: 0, draft: 0, paused: 0, sold: 0 };
    for (const group of statusGroups) {
      if (group.status in byStatus) {
        byStatus[group.status as keyof typeof byStatus] = group._count._all;
      }
    }
    const totalListings =
      byStatus.active + byStatus.draft + byStatus.paused + byStatus.sold;

    const monthRevenue = monthOrders.reduce((sum, o) => sum + o.amount, 0);
    const monthCount = monthOrders.length;
    const ticketAverage = monthCount === 0 ? 0 : Math.round(monthRevenue / monthCount);
    const prevRevenue = prevMonthOrders.reduce((sum, o) => sum + o.amount, 0);
    const revenueChangePercent =
      prevRevenue === 0
        ? null
        : Math.round(((monthRevenue - prevRevenue) / prevRevenue) * 1000) / 10;

    const pendingMessages = conversations.filter(
      (c) => c.messages[0] && c.messages[0].senderId !== sellerId,
    ).length;

    const recentSales = await this.prisma.order.findMany({
      where: { sellerId, status: { in: PAID_STATUSES } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        listing: { select: { id: true, title: true, images: true } },
        buyer: { select: { id: true, name: true, avatar: true } },
      },
    });

    const seriesOrders = await this.prisma.order.findMany({
      where: {
        sellerId,
        status: { in: PAID_STATUSES },
        paidAt: { gte: start30Days },
      },
      select: { amount: true, paidAt: true },
    });

    const series = this.buildSeries(start30Days, seriesOrders);

    return {
      listings: { total: totalListings, ...byStatus },
      statusDistribution: byStatus,
      sales: {
        monthRevenue,
        monthCount,
        ticketAverage,
        revenueChangePercent,
      },
      views: { total: viewsAgg._sum.views ?? 0 },
      pendingMessages,
      recentSales,
      series,
    };
  }

  private buildSeries(
    start: Date,
    orders: { amount: number; paidAt: Date | null }[],
  ) {
    const buckets = new Map<string, { sales: number; revenue: number }>();
    for (let i = 0; i < 30; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      buckets.set(day.toISOString().slice(0, 10), { sales: 0, revenue: 0 });
    }

    for (const order of orders) {
      if (!order.paidAt) continue;
      const key = order.paidAt.toISOString().slice(0, 10);
      const bucket = buckets.get(key);
      if (bucket) {
        bucket.sales += 1;
        bucket.revenue += order.amount;
      }
    }

    return Array.from(buckets.entries()).map(([date, value]) => ({
      date,
      ...value,
    }));
  }
}
