import { Module, forwardRef } from "@nestjs/common";
import { OrdersModule } from "../orders/orders.module";
import { UsersModule } from "../users/users.module";
import { AsaasClient } from "./asaas.client";
import { AsaasGateway } from "./asaas.gateway";
import { MockGateway } from "./mock.gateway";
import { PagarmeClient } from "./pagarme.client";
import { PagarmeGateway } from "./pagarme.gateway";
import { PAYMENT_GATEWAY } from "./payment-gateway.interface";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { WebhookController } from "./webhook.controller";

@Module({
  imports: [forwardRef(() => OrdersModule), UsersModule],
  controllers: [PaymentsController, WebhookController],
  providers: [
    PaymentsService,
    AsaasClient,
    AsaasGateway,
    PagarmeClient,
    PagarmeGateway,
    MockGateway,
    {
      // Troca de gateway acontece SÓ aqui. PAYMENTS_MODE=mock usa o adapter
      // local; PAYMENTS_GATEWAY=pagarme mantém o legado, default real é Asaas.
      provide: PAYMENT_GATEWAY,
      inject: [AsaasGateway, PagarmeGateway, MockGateway],
      useFactory: (
        asaas: AsaasGateway,
        pagarme: PagarmeGateway,
        mock: MockGateway,
      ) => {
        if (process.env.PAYMENTS_MODE === "mock") return mock;
        if (process.env.PAYMENTS_GATEWAY === "pagarme") return pagarme;
        return asaas;
      },
    },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
