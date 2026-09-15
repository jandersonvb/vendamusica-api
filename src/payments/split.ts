import { SplitPart } from './payment-gateway.interface';

/**
 * Comissão da plataforma (fração). Configurável via env sem deploy.
 * Default 10% — competitivo para marketplace de nicho.
 */
export function platformCommissionRate(): number {
  // Cuidado: Number('') === 0, então string vazia precisa cair no default
  // (senão a comissão viraria 0% e a plataforma não receberia nada).
  const raw = process.env.PLATFORM_COMMISSION_RATE;
  if (!raw || raw.trim() === '') return 0.1;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 && value < 1 ? value : 0.1;
}

export type SplitBreakdown = {
  itemPrice: number;
  shippingCost: number;
  serviceFee: number;
  buyerProtectionFee: number;
  pixDiscount: number;
  couponDiscount: number;
  /** Total efetivamente cobrado do comprador (centavos). */
  total: number;
};

export type SplitResult = {
  commission: number;
  sellerAmount: number;
  platformAmount: number;
};

/**
 * Regra de split (padrão de marketplace):
 *  - Vendedor recebe: preço do item − comissão + frete (ele que despacha).
 *  - Plataforma recebe: comissão + taxas de serviço/proteção − descontos
 *    (Pix/cupom são incentivos da plataforma, saem da margem dela).
 *  - Plataforma absorve a tarifa do gateway e é liable por chargeback.
 *
 * As duas partes SEMPRE somam `total` (exigência do gateway). Se os
 * descontos excederem a margem da plataforma, ela vai a zero e o vendedor
 * absorve o excedente — nunca enviamos valor negativo ao gateway.
 */
export function computeSplit(b: SplitBreakdown): SplitResult {
  const commission = Math.round(b.itemPrice * platformCommissionRate());

  let platformAmount =
    commission +
    b.serviceFee +
    b.buyerProtectionFee -
    b.pixDiscount -
    b.couponDiscount;
  if (platformAmount < 0) platformAmount = 0;

  const sellerAmount = b.total - platformAmount;

  return { commission, sellerAmount, platformAmount };
}

/**
 * Converte o resultado do split nas partes que o gateway entende.
 * Filtra partes de valor zero (gateways rejeitam split com amount 0).
 * O vendedor recebe líquido; a plataforma paga a tarifa e é liable.
 */
export function buildSplitParts(
  sellerRecipientId: string,
  platformRecipientId: string,
  split: SplitResult,
): SplitPart[] {
  const parts: SplitPart[] = [];

  if (split.platformAmount > 0) {
    parts.push({
      recipientId: platformRecipientId,
      amount: split.platformAmount,
      liable: true,
      chargeProcessingFee: true,
    });
  }

  if (split.sellerAmount > 0) {
    parts.push({
      recipientId: sellerRecipientId,
      amount: split.sellerAmount,
      // Se a plataforma ficou de fora (amount 0), o vendedor assume a tarifa.
      liable: split.platformAmount <= 0,
      chargeProcessingFee: split.platformAmount <= 0,
    });
  }

  return parts;
}
