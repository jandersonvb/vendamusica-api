import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { AsaasClient } from "./asaas.client";
import {
  Balance,
  ChargeInput,
  ChargeResult,
  PaymentGateway,
  RecipientInput,
  RecipientResult,
  RecipientStatus,
  SplitPart,
} from "./payment-gateway.interface";

type AsaasAccount = {
  id?: string;
  walletId: string;
  status?: string;
  accountStatus?: string;
};

type AsaasList<T> = {
  data?: T[];
};

type AsaasCheckout = {
  id: string;
  status?: string;
  link?: string | null;
};

type AsaasCustomer = {
  id: string;
};

type AsaasPayment = {
  id: string;
  status?: string;
  invoiceUrl?: string | null;
  bankSlipUrl?: string | null;
};

type AsaasBalance = {
  balance?: number;
};

const BILLING_TYPES: Record<string, string[]> = {
  pix: ["PIX"],
  pix_installments: ["PIX"],
  credit_card: ["CREDIT_CARD"],
  checkout: ["PIX", "CREDIT_CARD"],
};

@Injectable()
export class AsaasGateway implements PaymentGateway {
  constructor(private readonly client: AsaasClient) {}

  async createRecipient(input: RecipientInput): Promise<RecipientResult> {
    this.validateSubaccountInput(input);

    const account = await this.client.post<AsaasAccount>("/accounts", {
      name: input.name,
      email: input.email,
      cpfCnpj: input.document,
      birthDate: input.birthDate,
      companyType: input.companyType,
      phone: input.phone,
      mobilePhone: input.mobilePhone,
      incomeValue: input.incomeValue,
      address: input.address,
      addressNumber: input.addressNumber,
      complement: input.complement,
      province: input.province,
      postalCode: input.postalCode,
    });

    return {
      id: account.walletId,
      status: this.normalizeStatus(account.status ?? account.accountStatus),
      kycUrl: null,
    };
  }

  async getRecipient(recipientId: string): Promise<RecipientResult> {
    const accounts = await this.client.get<AsaasList<AsaasAccount>>(
      "/accounts",
      { walletId: recipientId, limit: 1 },
    );
    const account = accounts.data?.[0];

    return {
      id: recipientId,
      status: account
        ? this.normalizeStatus(account.status ?? account.accountStatus)
        : "unknown",
      kycUrl: null,
    };
  }

  async getBalance(recipientId: string): Promise<Balance> {
    if (recipientId !== this.platformWalletId()) {
      return { available: 0, waitingFunds: 0, transferred: 0 };
    }

    const balance = await this.client.get<AsaasBalance>("/finance/balance");
    return {
      available: this.toCents(balance.balance ?? 0),
      waitingFunds: 0,
      transferred: 0,
    };
  }

  async createCharge(input: ChargeInput): Promise<ChargeResult> {
    if (input.paymentMethod === "boleto") {
      return this.createPayment(input, "BOLETO");
    }

    const checkout = await this.client.post<AsaasCheckout>("/checkouts", {
      billingTypes: BILLING_TYPES[input.paymentMethod] ?? [
        "PIX",
        "CREDIT_CARD",
      ],
      chargeTypes:
        input.paymentMethod === "credit_card" && (input.installments ?? 1) > 1
          ? ["INSTALLMENT"]
          : ["DETACHED"],
      minutesToExpire: 60 * 24,
      externalReference: input.orderCode,
      callback: this.callback(input.successUrl),
      items: [
        {
          name: input.description,
          description: input.description,
          quantity: 1,
          value: this.toReais(input.amount),
        },
      ],
      ...(input.paymentMethod === "credit_card" && (input.installments ?? 1) > 1
        ? { installment: { maxInstallmentCount: input.installments } }
        : {}),
      customerData: {
        name: input.buyer.name,
        email: input.buyer.email,
        ...(input.buyer.document ? { cpfCnpj: input.buyer.document } : {}),
      },
      splits: this.toAsaasSplits(input.split),
    });

    return {
      gatewayOrderId: checkout.id,
      checkoutUrl: checkout.link ?? this.checkoutUrl(checkout.id),
      status: checkout.status ?? "pending",
    };
  }

  private async createPayment(
    input: ChargeInput,
    billingType: string,
  ): Promise<ChargeResult> {
    const customer = await this.client.post<AsaasCustomer>("/customers", {
      name: input.buyer.name,
      email: input.buyer.email,
      cpfCnpj: input.buyer.document,
      externalReference: input.orderCode,
      notificationDisabled: false,
    });
    const payment = await this.client.post<AsaasPayment>("/payments", {
      customer: customer.id,
      billingType,
      value: this.toReais(input.amount),
      dueDate: this.dueDate(),
      description: input.description,
      externalReference: input.orderCode,
      callback: this.callback(input.successUrl),
      split: this.toAsaasSplits(input.split),
    });

    return {
      gatewayOrderId: payment.id,
      checkoutUrl: payment.invoiceUrl ?? payment.bankSlipUrl ?? null,
      status: payment.status ?? "pending",
    };
  }

  private toAsaasSplits(parts: SplitPart[]) {
    const platformWalletId = this.platformWalletId();

    return parts
      .filter((part) => part.recipientId !== platformWalletId)
      .map((part) => ({
        walletId: part.recipientId,
        fixedValue: this.toReais(part.amount),
      }));
  }

  private callback(successUrl?: string) {
    const url = successUrl ?? process.env.FRONTEND_URL;
    return {
      successUrl: url,
      cancelUrl: url,
      expiredUrl: url,
    };
  }

  private checkoutUrl(id: string) {
    const base =
      process.env.ASAAS_CHECKOUT_URL ??
      (this.isSandbox()
        ? "https://sandbox.asaas.com/checkoutSession/show"
        : "https://www.asaas.com/checkoutSession/show");
    return `${base}?id=${encodeURIComponent(id)}`;
  }

  private isSandbox() {
    return (process.env.ASAAS_BASE_URL ?? "").includes("sandbox");
  }

  private dueDate() {
    const date = new Date();
    date.setDate(date.getDate() + 3);
    return date.toISOString().slice(0, 10);
  }

  private toReais(cents: number) {
    return Number((cents / 100).toFixed(2));
  }

  private toCents(value: number) {
    return Math.round(value * 100);
  }

  private platformWalletId() {
    return process.env.ASAAS_PLATFORM_WALLET_ID ?? "asaas_platform_wallet";
  }

  private validateSubaccountInput(input: RecipientInput) {
    const required = [
      ["mobilePhone", input.mobilePhone],
      ["incomeValue", input.incomeValue],
      ["address", input.address],
      ["addressNumber", input.addressNumber],
      ["province", input.province],
      ["postalCode", input.postalCode],
    ];
    const missing = required
      .filter(
        ([, value]) => value === undefined || value === null || value === "",
      )
      .map(([field]) => field);

    if (missing.length > 0) {
      throw new HttpException(
        `Missing Asaas subaccount fields: ${missing.join(", ")}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private normalizeStatus(status?: string): RecipientStatus {
    switch (status) {
      case "ACTIVE":
      case "APPROVED":
      case "active":
        return "active";
      case "REJECTED":
      case "REFUSED":
      case "refused":
        return "refused";
      case "DISABLED":
      case "SUSPENDED":
      case "suspended":
        return "suspended";
      case "PENDING":
      case "AWAITING_APPROVAL":
      case "pending":
      case undefined:
        return "pending";
      default:
        return "unknown";
    }
  }
}
