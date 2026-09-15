import { Injectable } from '@nestjs/common';
import { PagarmeClient } from './pagarme.client';
import {
  Balance,
  ChargeInput,
  ChargeResult,
  PaymentGateway,
  RecipientInput,
  RecipientResult,
  RecipientStatus,
} from './payment-gateway.interface';

type PagarmeRecipient = {
  id: string;
  status?: string;
  kyc_link?: string | null;
};

type PagarmeBalance = {
  available_amount?: number;
  waiting_funds_amount?: number;
  transferred_amount?: number;
};

type PagarmeOrder = {
  id: string;
  status?: string;
  checkouts?: Array<{ payment_url?: string }>;
  checkout_url?: string;
  url?: string;
};

const ACCEPTED_METHODS: Record<string, string[]> = {
  pix: ['pix'],
  pix_installments: ['pix'],
  credit_card: ['credit_card'],
  boleto: ['boleto'],
};

/** Adapter Pagar.me v5 (https://api.pagar.me/core/v5). */
@Injectable()
export class PagarmeGateway implements PaymentGateway {
  constructor(private readonly client: PagarmeClient) {}

  async createRecipient(input: RecipientInput): Promise<RecipientResult> {
    const recipient = (await this.client.post('/recipients', {
      name: input.name,
      email: input.email,
      document: input.document,
      type: input.document.replace(/\D/g, '').length > 11 ? 'company' : 'individual',
      default_bank_account: {
        holder_name: input.name,
        holder_type:
          input.document.replace(/\D/g, '').length > 11
            ? 'company'
            : 'individual',
        holder_document: input.document,
        bank: input.bankCode,
        branch_number: input.agency,
        account_number: input.account,
        type: input.accountType,
      },
    })) as PagarmeRecipient;

    return this.toRecipientResult(recipient);
  }

  async getRecipient(recipientId: string): Promise<RecipientResult> {
    const recipient = (await this.client.get(
      `/recipients/${recipientId}`,
    )) as PagarmeRecipient;
    return this.toRecipientResult(recipient);
  }

  async getBalance(recipientId: string): Promise<Balance> {
    const balance = (await this.client.get(
      `/recipients/${recipientId}/balance`,
    )) as PagarmeBalance;

    return {
      available: balance.available_amount ?? 0,
      waitingFunds: balance.waiting_funds_amount ?? 0,
      transferred: balance.transferred_amount ?? 0,
    };
  }

  async createCharge(input: ChargeInput): Promise<ChargeResult> {
    const order = (await this.client.post('/orders', {
      customer: {
        name: input.buyer.name,
        email: input.buyer.email,
        type: 'individual',
        ...(input.buyer.document
          ? { document: input.buyer.document }
          : {}),
      },
      items: [
        {
          amount: input.amount,
          description: input.description,
          quantity: 1,
          code: input.orderCode,
        },
      ],
      payments: [
        {
          payment_method: 'checkout',
          checkout: {
            expires_in: 60 * 60 * 24,
            billing_address_editable: true,
            customer_editable: true,
            accepted_payment_methods:
              ACCEPTED_METHODS[input.paymentMethod] ?? [
                'credit_card',
                'pix',
                'boleto',
              ],
            ...(input.paymentMethod === 'credit_card' && input.installments
              ? {
                  credit_card: {
                    installments: [
                      {
                        number: input.installments,
                        total: input.amount,
                      },
                    ],
                  },
                }
              : {}),
            success_url: input.successUrl ?? process.env.FRONTEND_URL,
          },
          split: input.split.map((part) => ({
            amount: part.amount,
            recipient_id: part.recipientId,
            type: 'flat',
            options: {
              charge_processing_fee: part.chargeProcessingFee,
              charge_remainder_fee: part.chargeProcessingFee,
              liable: part.liable,
            },
          })),
        },
      ],
    })) as PagarmeOrder;

    return {
      gatewayOrderId: order.id,
      checkoutUrl:
        order.checkouts?.[0]?.payment_url ??
        order.checkout_url ??
        order.url ??
        null,
      status: order.status ?? 'pending',
    };
  }

  private toRecipientResult(recipient: PagarmeRecipient): RecipientResult {
    return {
      id: recipient.id,
      status: this.normalizeStatus(recipient.status),
      kycUrl: recipient.kyc_link ?? null,
    };
  }

  private normalizeStatus(status?: string): RecipientStatus {
    switch (status) {
      case 'active':
        return 'active';
      case 'refused':
        return 'refused';
      case 'suspended':
      case 'blocked':
      case 'inactive':
        return 'suspended';
      case 'registration':
      case 'affiliation':
        return 'pending';
      default:
        return status ? 'unknown' : 'pending';
    }
  }
}
