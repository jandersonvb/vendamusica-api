import {
  buildSplitParts,
  computeSplit,
  platformCommissionRate,
  SplitBreakdown,
} from './split';

describe('platformCommissionRate', () => {
  const original = process.env.PLATFORM_COMMISSION_RATE;

  afterEach(() => {
    if (original === undefined) delete process.env.PLATFORM_COMMISSION_RATE;
    else process.env.PLATFORM_COMMISSION_RATE = original;
  });

  it('usa 10% por padrão quando a env não está setada', () => {
    delete process.env.PLATFORM_COMMISSION_RATE;
    expect(platformCommissionRate()).toBe(0.1);
  });

  it('lê o valor da env quando válido', () => {
    process.env.PLATFORM_COMMISSION_RATE = '0.15';
    expect(platformCommissionRate()).toBe(0.15);
  });

  it('cai no default com valores inválidos (vazio, negativo, >= 1, NaN)', () => {
    for (const bad of ['', '-0.1', '1', '1.5', 'abc']) {
      process.env.PLATFORM_COMMISSION_RATE = bad;
      expect(platformCommissionRate()).toBe(0.1);
    }
  });
});

describe('computeSplit', () => {
  beforeEach(() => {
    delete process.env.PLATFORM_COMMISSION_RATE; // garante 10%
  });

  it('divide certo no caso normal (mesmos números do teste manual)', () => {
    const breakdown: SplitBreakdown = {
      itemPrice: 74000,
      shippingCost: 3990,
      serviceFee: 1480,
      buyerProtectionFee: 370,
      pixDiscount: 3700,
      couponDiscount: 0,
      total: 76140,
    };

    const split = computeSplit(breakdown);

    expect(split.commission).toBe(7400); // 10% de 74000
    expect(split.sellerAmount).toBe(70590); // item - comissão + frete
    expect(split.platformAmount).toBe(5550); // comissão + taxas - desconto
  });

  it('vendedor + plataforma SEMPRE somam o total (invariante do gateway)', () => {
    const breakdown: SplitBreakdown = {
      itemPrice: 50000,
      shippingCost: 2500,
      serviceFee: 1000,
      buyerProtectionFee: 250,
      pixDiscount: 0,
      couponDiscount: 1000,
      total: 52750,
    };

    const split = computeSplit(breakdown);

    expect(split.sellerAmount + split.platformAmount).toBe(breakdown.total);
  });

  it('vendedor recebe item - comissão + frete no caso normal', () => {
    const breakdown: SplitBreakdown = {
      itemPrice: 100000,
      shippingCost: 5000,
      serviceFee: 2000,
      buyerProtectionFee: 500,
      pixDiscount: 0,
      couponDiscount: 0,
      total: 107500,
    };

    const split = computeSplit(breakdown);

    expect(split.sellerAmount).toBe(100000 - 10000 + 5000); // 95000
  });

  it('quando o desconto excede a margem, plataforma vai a zero e nunca fica negativa', () => {
    const breakdown: SplitBreakdown = {
      itemPrice: 10000,
      shippingCost: 0,
      serviceFee: 200,
      buyerProtectionFee: 50,
      pixDiscount: 500,
      couponDiscount: 5000, // cupom gigante
      total: 4750,
    };

    const split = computeSplit(breakdown);

    expect(split.platformAmount).toBe(0);
    expect(split.platformAmount).toBeGreaterThanOrEqual(0);
    expect(split.sellerAmount).toBe(4750); // vendedor absorve o excedente
    expect(split.sellerAmount + split.platformAmount).toBe(breakdown.total);
  });

  it('respeita comissão configurável via env', () => {
    process.env.PLATFORM_COMMISSION_RATE = '0.2';
    const breakdown: SplitBreakdown = {
      itemPrice: 100000,
      shippingCost: 0,
      serviceFee: 0,
      buyerProtectionFee: 0,
      pixDiscount: 0,
      couponDiscount: 0,
      total: 100000,
    };

    const split = computeSplit(breakdown);

    expect(split.commission).toBe(20000); // 20%
  });
});

describe('buildSplitParts', () => {
  it('gera duas partes: plataforma (liable, paga tarifa) e vendedor (líquido)', () => {
    const parts = buildSplitParts('re_seller', 're_platform', {
      commission: 7400,
      sellerAmount: 70590,
      platformAmount: 5550,
    });

    expect(parts).toHaveLength(2);

    const platform = parts.find((p) => p.recipientId === 're_platform');
    const seller = parts.find((p) => p.recipientId === 're_seller');

    expect(platform).toMatchObject({
      amount: 5550,
      liable: true,
      chargeProcessingFee: true,
    });
    expect(seller).toMatchObject({
      amount: 70590,
      liable: false,
      chargeProcessingFee: false,
    });
  });

  it('filtra partes de valor zero (gateway rejeita amount 0)', () => {
    const parts = buildSplitParts('re_seller', 're_platform', {
      commission: 0,
      sellerAmount: 4750,
      platformAmount: 0,
    });

    expect(parts).toHaveLength(1);
    expect(parts[0].recipientId).toBe('re_seller');
  });

  it('se a plataforma fica de fora, o vendedor assume a tarifa e o chargeback', () => {
    const parts = buildSplitParts('re_seller', 're_platform', {
      commission: 0,
      sellerAmount: 4750,
      platformAmount: 0,
    });

    expect(parts[0]).toMatchObject({
      liable: true,
      chargeProcessingFee: true,
    });
  });
});
