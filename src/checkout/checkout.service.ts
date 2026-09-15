import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AddressesService } from '../addresses/addresses.service';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { CheckoutDto, CheckoutPreviewDto } from './dto/checkout.dto';

type ShippingOption = {
  method: string;
  label: string;
  cost: number;
  eta: string;
};

const SHIPPING_OPTIONS: Record<string, ShippingOption> = {
  standard: {
    method: 'standard',
    label: 'Envio Padrão',
    cost: 3990,
    eta: '3 a 6 dias úteis',
  },
  express: {
    method: 'express',
    label: 'Envio Expresso',
    cost: 5990,
    eta: '1 a 2 dias úteis',
  },
  pickup: {
    method: 'pickup',
    label: 'Retirada em mãos',
    cost: 0,
    eta: 'Combinar com o vendedor',
  },
};

const SERVICE_FEE_RATE = 0.02;
const BUYER_PROTECTION_RATE = 0.005;
const PIX_DISCOUNT_RATE = 0.05;
const PIX_METHODS = ['pix', 'pix_installments'];

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly addressesService: AddressesService,
    private readonly paymentsService: PaymentsService,
  ) {}

  getShippingOptions(allowsPickup: boolean) {
    return Object.values(SHIPPING_OPTIONS).map((option) => ({
      ...option,
      available: option.method === 'pickup' ? allowsPickup : true,
    }));
  }

  async shippingOptionsForListing(listingId?: string) {
    let allowsPickup = true;
    if (listingId) {
      const listing = await this.prisma.listing.findUnique({
        where: { id: listingId },
        select: { allowsPickup: true },
      });
      allowsPickup = listing?.allowsPickup ?? true;
    }
    return this.getShippingOptions(allowsPickup);
  }

  async resolveItemPrice(listingId: string, buyerId: string, listingPrice: number) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { listingId_buyerId: { listingId, buyerId } },
      select: { id: true },
    });

    if (conversation) {
      const offer = await this.prisma.offer.findFirst({
        where: { conversationId: conversation.id, status: 'accepted' },
        orderBy: { createdAt: 'desc' },
      });

      if (offer) {
        return { price: offer.amount, offerId: offer.id, negotiated: true };
      }
    }

    return { price: listingPrice, offerId: null, negotiated: false };
  }

  async validateCoupon(code: string, amount: number) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon || !coupon.active) {
      return { valid: false as const, reason: 'Cupom inválido' };
    }
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return { valid: false as const, reason: 'Cupom expirado' };
    }
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      return { valid: false as const, reason: 'Cupom esgotado' };
    }
    if (coupon.minAmount && amount < coupon.minAmount) {
      return {
        valid: false as const,
        reason: `Pedido mínimo de R$ ${(coupon.minAmount / 100).toFixed(2)}`,
      };
    }

    let discount =
      coupon.type === 'percent'
        ? Math.round((amount * coupon.value) / 100)
        : coupon.value;
    if (coupon.type === 'percent' && coupon.maxDiscount) {
      discount = Math.min(discount, coupon.maxDiscount);
    }
    discount = Math.min(discount, amount);

    return {
      valid: true as const,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      discount,
    };
  }

  async validateCouponForListing(
    buyerId: string,
    code: string,
    listingId: string,
  ) {
    const listing = await this.loadActiveListing(listingId);
    const { price } = await this.resolveItemPrice(
      listingId,
      buyerId,
      listing.price,
    );
    return this.validateCoupon(code, price);
  }

  private async buildSummary(
    itemPrice: number,
    opts: {
      shippingMethod?: string;
      paymentMethod?: string;
      couponCode?: string;
      maxInstallments: number;
      negotiated: boolean;
      offerId: string | null;
    },
  ) {
    const shipping =
      SHIPPING_OPTIONS[opts.shippingMethod ?? 'standard'] ??
      SHIPPING_OPTIONS.standard;
    const shippingCost = shipping.cost;

    const pixDiscount = PIX_METHODS.includes(opts.paymentMethod ?? '')
      ? Math.round(itemPrice * PIX_DISCOUNT_RATE)
      : 0;

    let coupon: { code: string; type: string; value: number } | null = null;
    let couponDiscount = 0;
    let couponError: string | null = null;
    if (opts.couponCode) {
      const result = await this.validateCoupon(opts.couponCode, itemPrice);
      if (result.valid) {
        coupon = { code: result.code, type: result.type, value: result.value };
        couponDiscount = result.discount;
      } else {
        couponError = result.reason;
      }
    }

    const serviceFee = Math.round(itemPrice * SERVICE_FEE_RATE);
    const buyerProtectionFee = Math.round(itemPrice * BUYER_PROTECTION_RATE);
    const total =
      itemPrice -
      pixDiscount -
      couponDiscount +
      shippingCost +
      serviceFee +
      buyerProtectionFee;

    const installmentOptions =
      opts.paymentMethod === 'credit_card'
        ? this.buildInstallments(total, opts.maxInstallments)
        : [];

    return {
      itemPrice,
      negotiated: opts.negotiated,
      offerId: opts.offerId,
      shipping: { ...shipping, cost: shippingCost },
      pixDiscount,
      coupon,
      couponDiscount,
      couponError,
      serviceFee,
      buyerProtectionFee,
      discount: couponDiscount,
      total,
      installmentOptions,
    };
  }

  private buildInstallments(total: number, max: number) {
    const count = Math.max(1, Math.min(max, 24));
    return Array.from({ length: count }, (_, i) => {
      const number = i + 1;
      const value = Math.round(total / number);
      return { number, value };
    });
  }

  async preview(buyerId: string, dto: CheckoutPreviewDto) {
    const listing = await this.loadActiveListing(dto.listingId);
    const { price, offerId, negotiated } = await this.resolveItemPrice(
      dto.listingId,
      buyerId,
      listing.price,
    );

    const summary = await this.buildSummary(price, {
      shippingMethod: dto.shippingMethod,
      paymentMethod: dto.paymentMethod,
      couponCode: dto.couponCode,
      maxInstallments: listing.installments ?? 12,
      negotiated,
      offerId,
    });

    return {
      listing: {
        id: listing.id,
        title: listing.title,
        images: listing.images,
        price: listing.price,
        sellerId: listing.sellerId,
      },
      ...summary,
    };
  }

  async checkout(buyerId: string, dto: CheckoutDto) {
    const listing = await this.loadActiveListing(dto.listingId, true);

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
    if (dto.shippingMethod === 'pickup' && !listing.allowsPickup) {
      throw new HttpException(
        'Pickup not available for this listing',
        HttpStatus.BAD_REQUEST,
      );
    }

    const buyer = await this.prisma.user.findUnique({
      where: { id: buyerId },
      select: { name: true, email: true },
    });
    if (!buyer) {
      throw new HttpException('Buyer not found', HttpStatus.NOT_FOUND);
    }

    const address = await this.addressesService.getOwned(buyerId, dto.addressId);
    const addressSnapshot: Prisma.InputJsonValue = {
      label: address.label ?? null,
      recipientName: address.recipientName,
      zipCode: address.zipCode,
      street: address.street,
      number: address.number,
      complement: address.complement ?? null,
      district: address.district,
      city: address.city,
      state: address.state,
      phone: address.phone ?? null,
    };

    const { price, offerId, negotiated } = await this.resolveItemPrice(
      dto.listingId,
      buyerId,
      listing.price,
    );

    const summary = await this.buildSummary(price, {
      shippingMethod: dto.shippingMethod,
      paymentMethod: dto.paymentMethod,
      couponCode: dto.couponCode,
      maxInstallments: listing.installments ?? 12,
      negotiated,
      offerId,
    });

    const installments =
      dto.paymentMethod === 'credit_card' ? dto.installments ?? 1 : 1;

    // Cria a cobrança real com split no gateway (vendedor + plataforma).
    const charge = await this.paymentsService.createCharge({
      orderCode: listing.id,
      description: listing.title,
      buyer: { name: buyer.name, email: buyer.email },
      paymentMethod: dto.paymentMethod,
      installments,
      sellerRecipientId: listing.seller.asaasWalletId,
      breakdown: {
        itemPrice: price,
        shippingCost: summary.shipping.cost,
        serviceFee: summary.serviceFee,
        buyerProtectionFee: summary.buyerProtectionFee,
        pixDiscount: summary.pixDiscount,
        couponDiscount: summary.couponDiscount,
        total: summary.total,
      },
    });

    const order = await this.prisma.order.create({
      data: {
        listingId: listing.id,
        buyerId,
        sellerId: listing.sellerId,
        amount: price,
        commission: charge.commission,
        sellerAmount: charge.sellerAmount,
        shippingMethod: dto.shippingMethod,
        shippingCost: summary.shipping.cost,
        couponCode: summary.coupon?.code ?? null,
        discount: summary.couponDiscount,
        pixDiscount: summary.pixDiscount,
        serviceFee: summary.serviceFee,
        buyerProtectionFee: summary.buyerProtectionFee,
        total: summary.total,
        paymentMethod: dto.paymentMethod,
        installments,
        shippingAddress: addressSnapshot,
        offerId: summary.offerId,
        gatewayPaymentId: charge.gatewayOrderId,
        checkoutUrl: charge.checkoutUrl,
        status: 'pending',
      },
    });

    if (summary.coupon) {
      await this.prisma.coupon.update({
        where: { code: summary.coupon.code },
        data: { usedCount: { increment: 1 } },
      });
    }

    return order;
  }

  private async loadActiveListing(listingId: string, withSeller = false) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: withSeller ? { seller: true } : undefined,
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

    return listing as typeof listing & {
      seller: Prisma.UserGetPayload<object>;
    };
  }
}
