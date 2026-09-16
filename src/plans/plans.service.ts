import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Plan, Subscription } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/// Status de anúncio que ocupa cota do plano (rascunho e vendido não ocupam).
export const QUOTA_STATUSES = ['pending_review', 'active', 'paused'];

/**
 * Plano usado quando o vendedor não assinou nada (ou a assinatura venceu).
 * Existe também como registro no banco (slug `free`); esta cópia é só o
 * fallback para a API não quebrar caso o seed não tenha rodado.
 */
const FREE_FALLBACK = {
  slug: 'free',
  name: 'Grátis',
  priceCents: 0,
  listingLimit: 5,
  photoLimit: 8,
  allowsVideo: false,
  highlightHome: false,
  seesWantedList: false,
  searchPriority: 0,
} as const;

export type Entitlements = {
  plan: {
    slug: string;
    name: string;
    priceCents: number;
    listingLimit: number | null;
    photoLimit: number;
    allowsVideo: boolean;
    highlightHome: boolean;
    seesWantedList: boolean;
    searchPriority: number;
  };
  subscription: {
    status: string;
    trialEndsAt: Date | null;
    currentPeriodEnd: Date | null;
    trialDaysLeft: number | null;
  } | null;
  usage: { listings: number; listingLimit: number | null };
};

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  listPlans(audience?: string) {
    return this.prisma.plan.findMany({
      where: {
        active: true,
        ...(audience ? { audience: { in: [audience, 'both'] } } : {}),
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /** Assinatura válida hoje, ou null se nunca assinou / venceu / cancelou. */
  private async activeSubscription(
    userId: string,
  ): Promise<(Subscription & { plan: Plan }) | null> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });

    if (!subscription) return null;
    if (subscription.status === 'canceled' || subscription.status === 'expired') {
      return null;
    }

    const now = new Date();
    const deadline =
      subscription.status === 'trialing'
        ? subscription.trialEndsAt
        : subscription.currentPeriodEnd;

    if (deadline && deadline < now) {
      // Venceu: marca como expirado e devolve o vendedor para o plano grátis.
      await this.prisma.subscription.update({
        where: { userId },
        data: { status: 'expired' },
      });
      await this.prisma.user.update({
        where: { id: userId },
        data: { searchPriority: 0 },
      });
      return null;
    }

    return subscription;
  }

  async getEntitlements(userId: string): Promise<Entitlements> {
    const subscription = await this.activeSubscription(userId);
    const plan =
      subscription?.plan ??
      (await this.prisma.plan.findUnique({ where: { slug: 'free' } }));

    const resolved = plan ?? FREE_FALLBACK;
    const usedListings = await this.prisma.listing.count({
      where: { sellerId: userId, status: { in: QUOTA_STATUSES } },
    });

    const trialDaysLeft =
      subscription?.status === 'trialing' && subscription.trialEndsAt
        ? Math.max(
            0,
            Math.ceil(
              (subscription.trialEndsAt.getTime() - Date.now()) / 86_400_000,
            ),
          )
        : null;

    return {
      plan: {
        slug: resolved.slug,
        name: resolved.name,
        priceCents: resolved.priceCents,
        listingLimit: resolved.listingLimit ?? null,
        photoLimit: resolved.photoLimit,
        allowsVideo: resolved.allowsVideo,
        highlightHome: resolved.highlightHome,
        seesWantedList: resolved.seesWantedList,
        searchPriority: resolved.searchPriority,
      },
      subscription: subscription
        ? {
            status: subscription.status,
            trialEndsAt: subscription.trialEndsAt,
            currentPeriodEnd: subscription.currentPeriodEnd,
            trialDaysLeft,
          }
        : null,
      usage: {
        listings: usedListings,
        listingLimit: resolved.listingLimit ?? null,
      },
    };
  }

  /**
   * Valida o anúncio contra o plano. `ignoreListingId` pula a checagem de cota
   * para um anúncio que já está publicado (edição não consome nova vaga).
   */
  async assertListingAllowed(
    userId: string,
    input: { images?: string[]; videoUrl?: string | null },
    options: { countsAgainstQuota: boolean; ignoreListingId?: string } = {
      countsAgainstQuota: true,
    },
  ) {
    const { plan } = await this.getEntitlements(userId);

    if (input.images && input.images.length > plan.photoLimit) {
      throw new HttpException(
        `Seu plano (${plan.name}) permite até ${plan.photoLimit} fotos por anúncio`,
        HttpStatus.FORBIDDEN,
      );
    }

    if (input.videoUrl && !plan.allowsVideo) {
      throw new HttpException(
        `Vídeo no anúncio está disponível a partir do plano Pro`,
        HttpStatus.FORBIDDEN,
      );
    }

    if (options.countsAgainstQuota && plan.listingLimit !== null) {
      const used = await this.prisma.listing.count({
        where: {
          sellerId: userId,
          status: { in: QUOTA_STATUSES },
          ...(options.ignoreListingId ? { id: { not: options.ignoreListingId } } : {}),
        },
      });

      if (used >= plan.listingLimit) {
        throw new HttpException(
          `Seu plano (${plan.name}) permite ${plan.listingLimit} anúncios publicados. Faça upgrade para publicar mais.`,
          HttpStatus.FORBIDDEN,
        );
      }
    }

    return plan;
  }

  /**
   * Assina um plano. Ainda sem cobrança: o trial começa na hora e a renovação
   * é registrada manualmente enquanto o preço não está validado com as lojas.
   */
  async subscribe(userId: string, planSlug: string) {
    const plan = await this.prisma.plan.findUnique({ where: { slug: planSlug } });

    if (!plan || !plan.active) {
      throw new HttpException('Plano não encontrado', HttpStatus.NOT_FOUND);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { accountType: true },
    });

    if (!user) {
      throw new HttpException('Usuário não encontrado', HttpStatus.NOT_FOUND);
    }

    if (plan.audience !== 'both' && plan.audience !== user.accountType) {
      throw new HttpException(
        'Esse plano não está disponível para o seu tipo de conta',
        HttpStatus.BAD_REQUEST,
      );
    }

    const existing = await this.prisma.subscription.findUnique({
      where: { userId },
    });
    // Trial só na primeira assinatura — troca de plano não reinicia o período.
    const usesTrial = !existing && plan.trialDays > 0;
    const now = new Date();
    const periodDays = plan.billingPeriod === 'yearly' ? 365 : plan.billingPeriod === 'quarterly' ? 90 : 30;

    const data = {
      planId: plan.id,
      status: usesTrial ? 'trialing' : 'active',
      trialEndsAt: usesTrial ? this.addDays(now, plan.trialDays) : null,
      currentPeriodEnd: usesTrial ? null : this.addDays(now, periodDays),
      startedAt: now,
      canceledAt: null,
    };

    const [subscription] = await this.prisma.$transaction([
      this.prisma.subscription.upsert({
        where: { userId },
        create: { userId, ...data },
        update: data,
        include: { plan: true },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { searchPriority: plan.searchPriority },
      }),
    ]);

    return subscription;
  }

  async cancel(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      throw new HttpException('Assinatura não encontrada', HttpStatus.NOT_FOUND);
    }

    const [canceled] = await this.prisma.$transaction([
      this.prisma.subscription.update({
        where: { userId },
        data: { status: 'canceled', canceledAt: new Date() },
        include: { plan: true },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { searchPriority: 0 },
      }),
    ]);

    return canceled;
  }

  private addDays(date: Date, days: number) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
}
