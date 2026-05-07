import { Module, forwardRef } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { UsersModule } from '../users/users.module';
import { PagarmeClient } from './pagarme.client';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { WebhookController } from './webhook.controller';

@Module({
  imports: [forwardRef(() => OrdersModule), UsersModule],
  controllers: [PaymentsController, WebhookController],
  providers: [PaymentsService, PagarmeClient],
  exports: [PaymentsService],
})
export class PaymentsModule {}
