import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { PAYMENT_GATEWAY } from "./payment-gateway.interface";
import type {
  Balance,
  PaymentGateway,
  RecipientInput,
  RecipientResult,
} from "./payment-gateway.interface";
import { SplitBreakdown, buildSplitParts, computeSplit } from "./split";

type CreateChargeParams = {
  orderCode: string;
  description: string;
  buyer: { name: string; email: string; document?: string };
  paymentMethod: string;
  installments?: number;
  sellerRecipientId: string;
  breakdown: SplitBreakdown;
  successUrl?: string;
};

export type CreateChargeResult = {
  gatewayOrderId: string;
  checkoutUrl: string | null;
  status: string;
  commission: number;
  sellerAmount: number;
  platformAmount: number;
};

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
  ) {}

  createRecipient(data: RecipientInput): Promise<RecipientResult> {
    return this.gateway.createRecipient(data);
  }

  getRecipient(recipientId: string): Promise<RecipientResult> {
    return this.gateway.getRecipient(recipientId);
  }

  getBalance(recipientId: string): Promise<Balance> {
    return this.gateway.getBalance(recipientId);
  }

  /**
   * Calcula o split e cria a cobrança no gateway. Fonte única da regra
   * de divisão — usada tanto pelo checkout quanto pelo fluxo legado.
   */
  async createCharge(params: CreateChargeParams): Promise<CreateChargeResult> {
    // Em mock o recebedor da plataforma é fictício (o MockGateway ignora).
    // Em live ele é obrigatório — sem ele o split não tem para onde mandar a comissão.
    const isMock = process.env.PAYMENTS_MODE === "mock";
    // `||` (não `??`) porque a env costuma vir como string vazia, não undefined.
    const platformRecipientId =
      process.env.ASAAS_PLATFORM_WALLET_ID ||
      process.env.PAGARME_PLATFORM_RECIPIENT_ID ||
      (isMock ? "mock_platform_recipient" : undefined);
    if (!platformRecipientId) {
      throw new HttpException(
        "ASAAS_PLATFORM_WALLET_ID not configured",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const split = computeSplit(params.breakdown);
    const parts = buildSplitParts(
      params.sellerRecipientId,
      platformRecipientId,
      split,
    );

    const charge = await this.gateway.createCharge({
      orderCode: params.orderCode,
      description: params.description,
      amount: params.breakdown.total,
      buyer: params.buyer,
      paymentMethod: params.paymentMethod,
      installments: params.installments,
      split: parts,
      successUrl: params.successUrl,
    });

    return {
      gatewayOrderId: charge.gatewayOrderId,
      checkoutUrl: charge.checkoutUrl,
      status: charge.status,
      commission: split.commission,
      sellerAmount: split.sellerAmount,
      platformAmount: split.platformAmount,
    };
  }
}
