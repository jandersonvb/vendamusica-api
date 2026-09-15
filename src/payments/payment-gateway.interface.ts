/**
 * Porta (port) de pagamento. O resto do app depende SÓ desta interface,
 * nunca do Pagar.me direto. Trocar de gateway = escrever outro adapter
 * e mudar uma linha no módulo, sem tocar em checkout/orders.
 */
export const PAYMENT_GATEWAY = Symbol("PAYMENT_GATEWAY");

export type RecipientInput = {
  name: string;
  email: string;
  document: string;
  phone?: string;
  mobilePhone?: string;
  birthDate?: string;
  companyType?: string;
  incomeValue?: number;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  postalCode?: string;
  bankCode: string;
  agency: string;
  account: string;
  accountType: string;
};

/**
 * Status do recebedor no gateway (KYC). Normalizado para não vazar
 * vocabulário específico do Pagar.me para o resto do app.
 */
export type RecipientStatus =
  | "pending" // em análise / cadastro / afiliação
  | "active" // aprovado, pode receber
  | "refused" // recusado no KYC
  | "suspended" // suspenso/bloqueado
  | "unknown";

export type RecipientResult = {
  id: string;
  status: RecipientStatus;
  /** Link de KYC quando o gateway exige ação do vendedor. */
  kycUrl?: string | null;
};

export type Balance = {
  /** Disponível para saque (centavos). */
  available: number;
  /** Aguardando liquidação (centavos). */
  waitingFunds: number;
  /** Já transferido para o banco (centavos). */
  transferred: number;
};

/** Uma parte do split: quanto vai para cada recebedor. */
export type SplitPart = {
  recipientId: string;
  /** Valor em centavos. */
  amount: number;
  /** Responsável por chargeback. */
  liable: boolean;
  /** Quem paga a tarifa do gateway. */
  chargeProcessingFee: boolean;
};

export type ChargeInput = {
  /** Código interno (id do pedido/anúncio) para rastrear no gateway. */
  orderCode: string;
  description: string;
  /** Total cobrado do comprador (centavos). Deve ser a soma do split. */
  amount: number;
  buyer: { name: string; email: string; document?: string };
  paymentMethod: string; // pix | credit_card | boleto | pix_installments
  installments?: number;
  split: SplitPart[];
  successUrl?: string;
};

export type ChargeResult = {
  gatewayOrderId: string;
  checkoutUrl: string | null;
  status: string;
};

export interface PaymentGateway {
  createRecipient(input: RecipientInput): Promise<RecipientResult>;
  getRecipient(recipientId: string): Promise<RecipientResult>;
  getBalance(recipientId: string): Promise<Balance>;
  createCharge(input: ChargeInput): Promise<ChargeResult>;
}
