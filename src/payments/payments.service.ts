import { Injectable } from '@nestjs/common';
import { Listing, User } from '@prisma/client';
import { PagarmeClient } from './pagarme.client';

type CreateRecipientData = {
  name: string;
  email: string;
  document: string;
  bankCode: string;
  agency: string;
  account: string;
  accountType: string;
};

type CreateOrderData = {
  listing: Listing;
  buyer: Omit<User, 'password'>;
  sellerRecipientId: string;
};

@Injectable()
export class PaymentsService {
  constructor(private readonly pagarmeClient: PagarmeClient) {}

  createRecipient(data: CreateRecipientData) {
    return this.pagarmeClient.post('/recipients', {
      name: data.name,
      email: data.email,
      document: data.document,
      type: 'individual',
      default_bank_account: {
        holder_name: data.name,
        holder_type: 'individual',
        holder_document: data.document,
        bank: data.bankCode,
        branch_number: data.agency,
        account_number: data.account,
        type: data.accountType,
      },
    });
  }

  async createOrder(data: CreateOrderData) {
    const amount = data.listing.price;
    const commission = Math.round(amount * 0.05);
    const sellerAmount = amount - commission;
    const platformRecipientId = process.env.PAGARME_PLATFORM_RECIPIENT_ID;

    const order = await this.pagarmeClient.post('/orders', {
      customer: {
        name: data.buyer.name,
        email: data.buyer.email,
        type: 'individual',
      },
      items: [
        {
          amount,
          description: data.listing.title,
          quantity: 1,
          code: data.listing.id,
        },
      ],
      payments: [
        {
          payment_method: 'checkout',
          checkout: {
            expires_in: 60 * 60 * 24,
            billing_address_editable: true,
            customer_editable: true,
            accepted_payment_methods: ['credit_card', 'pix', 'boleto'],
            success_url: process.env.FRONTEND_URL,
          },
          split: [
            {
              amount: sellerAmount,
              recipient_id: data.sellerRecipientId,
              type: 'flat',
              options: {
                charge_processing_fee: false,
                charge_remainder_fee: false,
                liable: false,
              },
            },
            {
              amount: commission,
              recipient_id: platformRecipientId,
              type: 'flat',
              options: {
                charge_processing_fee: true,
                charge_remainder_fee: true,
                liable: true,
              },
            },
          ],
        },
      ],
    });

    return {
      pagarmeOrderId: order.id,
      checkoutUrl:
        order.checkouts?.[0]?.payment_url ??
        order.checkout_url ??
        order.url ??
        null,
      commission,
      sellerAmount,
    };
  }
}
