import { Module } from '@nestjs/common';
import { LeadsModule } from '../leads/leads.module';
import { PlansModule } from '../plans/plans.module';
import { WantedModule } from '../wanted/wanted.module';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';

@Module({
  imports: [PlansModule, WantedModule, LeadsModule],
  controllers: [ListingsController],
  providers: [ListingsService],
  exports: [ListingsService],
})
export class ListingsModule {}
