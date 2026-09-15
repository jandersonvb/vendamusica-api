import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => PaymentsService))
    private readonly paymentsService: PaymentsService,
  ) {}

  async create(buyerId: string, listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        seller: true,
      },
    });

    if (!listing) {
      throw new HttpException('Listing not found', HttpStatus.NOT_FOUND);
    }

    if (listing.status !== 'active') {
      throw new HttpException(
        'Listing is not available for purchase',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (listing.sellerId === buyerId) {
      throw new HttpException(
        'Buyer cannot purchase own listing',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (
      !listing.seller.bankDataCompleted ||
      !listing.seller.asaasWalletId
    ) {
      throw new HttpException(
        'Seller must complete bank data before receiving orders',
        HttpStatus.BAD_REQUEST,
      );
    }

    const buyer = await this.prisma.user.findUnique({
      where: { id: buyerId },
    });

    if (!buyer) {
      throw new HttpException('Buyer not found', HttpStatus.NOT_FOUND);
    }

    const payment = await this.paymentsService.createCharge({
      orderCode: listing.id,
      description: listing.title,
      buyer: { name: buyer.name, email: buyer.email },
      paymentMethod: 'checkout',
      sellerRecipientId: listing.seller.asaasWalletId,
      breakdown: {
        itemPrice: listing.price,
        shippingCost: 0,
        serviceFee: 0,
        buyerProtectionFee: 0,
        pixDiscount: 0,
        couponDiscount: 0,
        total: listing.price,
      },
    });

    return this.prisma.order.create({
      data: {
        listingId,
        buyerId,
        sellerId: listing.sellerId,
        amount: listing.price,
        total: listing.price,
        commission: payment.commission,
        sellerAmount: payment.sellerAmount,
        gatewayPaymentId: payment.gatewayOrderId,
        checkoutUrl: payment.checkoutUrl,
        status: 'pending',
      },
    });
  }

  async findOne(userId: string, id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        listing: true,
        buyer: { select: { id: true, name: true, email: true, avatar: true } },
        seller: { select: { id: true, name: true, email: true, avatar: true } },
      },
    });

    if (!order || (order.buyerId !== userId && order.sellerId !== userId)) {
      throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
    }

    return order;
  }

  async payMock(userId: string, id: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });

    if (!order || order.buyerId !== userId) {
      throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
    }

    if (order.status !== 'pending') {
      throw new HttpException(
        'Order is not pending payment',
        HttpStatus.BAD_REQUEST,
      );
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id },
        data: { status: 'paid', paidAt: new Date() },
      }),
      this.prisma.listing.update({
        where: { id: order.listingId },
        data: { status: 'sold' },
      }),
    ]);

    return updated;
  }

  async confirmPayment(gatewayPaymentId: string) {
    const order = await this.prisma.order.findUnique({
      where: { gatewayPaymentId },
    });

    if (!order) {
      throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
    }

    return this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: order.id },
        data: { status: 'paid', paidAt: new Date() },
      }),
      this.prisma.listing.update({
        where: { id: order.listingId },
        data: { status: 'sold' },
      }),
    ]);
  }

  async failPayment(gatewayPaymentId: string) {
    const order = await this.prisma.order.findUnique({
      where: { gatewayPaymentId },
    });

    if (!order) {
      throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
    }

    return this.prisma.order.update({
      where: { id: order.id },
      data: { status: 'failed' },
    });
  }

  /** Estorno/chargeback: devolve o anúncio ao mercado e marca o pedido. */
  async refundPayment(gatewayPaymentId: string) {
    const order = await this.prisma.order.findUnique({
      where: { gatewayPaymentId },
    });

    if (!order) {
      return null;
    }

    return this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: order.id },
        data: { status: 'refunded' },
      }),
      this.prisma.listing.update({
        where: { id: order.listingId },
        data: { status: 'active' },
      }),
    ]);
  }

  findByUser(userId: string) {
    return this.prisma.order.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      include: {
        listing: true,
        buyer: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        seller: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
