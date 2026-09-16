import { Module } from '@nestjs/common';
import { PlansModule } from '../plans/plans.module';
import { WantedController } from './wanted.controller';
import { WantedService } from './wanted.service';

@Module({
  imports: [PlansModule],
  controllers: [WantedController],
  providers: [WantedService],
  exports: [WantedService],
})
export class WantedModule {}
