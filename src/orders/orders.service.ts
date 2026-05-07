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
      !listing.seller.pagarmeRecipientId
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

    const { password: _password, ...buyerWithoutPassword } = buyer;
    const payment = await this.paymentsService.createOrder({
      listing,
      buyer: buyerWithoutPassword,
      sellerRecipientId: listing.seller.pagarmeRecipientId,
    });

    return this.prisma.order.create({
      data: {
        listingId,
        buyerId,
        sellerId: listing.sellerId,
        amount: listing.price,
        commission: payment.commission,
        sellerAmount: payment.sellerAmount,
        pagarmeOrderId: payment.pagarmeOrderId,
        checkoutUrl: payment.checkoutUrl,
        status: 'pending',
      },
    });
  }

  async confirmPayment(pagarmeOrderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { pagarmeOrderId },
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

  async failPayment(pagarmeOrderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { pagarmeOrderId },
    });

    if (!order) {
      throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
    }

    return this.prisma.order.update({
      where: { id: order.id },
      data: { status: 'failed' },
    });
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
