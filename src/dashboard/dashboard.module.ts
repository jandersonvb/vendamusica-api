import { Module } from '@nestjs/common';
import { LeadsModule } from '../leads/leads.module';
import { PlansModule } from '../plans/plans.module';
import { WantedModule } from '../wanted/wanted.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [LeadsModule, PlansModule, WantedModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
