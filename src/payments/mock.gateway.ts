import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  Balance,
  ChargeInput,
  ChargeResult,
  PaymentGateway,
  RecipientInput,
  RecipientResult,
} from './payment-gateway.interface';

/**
 * Adapter de desenvolvimento. Permite rodar checkout/split localmente
 * sem chave nem custo. Ativado com PAYMENTS_MODE=mock.
 */
@Injectable()
export class MockGateway implements PaymentGateway {
  createRecipient(input: RecipientInput): Promise<RecipientResult> {
    return Promise.resolve({
      id: `mock_re_${randomUUID()}`,
      // Em mock o vendedor já nasce ativo para destravar o fluxo local.
      status: 'active',
      kycUrl: null,
    });
  }

  getRecipient(recipientId: string): Promise<RecipientResult> {
    return Promise.resolve({ id: recipientId, status: 'active', kycUrl: null });
  }

  getBalance(): Promise<Balance> {
    return Promise.resolve({ available: 0, waitingFunds: 0, transferred: 0 });
  }

  createCharge(input: ChargeInput): Promise<ChargeResult> {
    return Promise.resolve({
      gatewayOrderId: `mock_order_${randomUUID()}`,
      checkoutUrl: null,
      status: 'pending',
    });
  }
}
