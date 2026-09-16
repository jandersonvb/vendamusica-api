import { Module } from '@nestjs/common';
import { LeadsModule } from '../leads/leads.module';
import { SellersController } from './sellers.controller';
import { SellersService } from './sellers.service';

@Module({
  imports: [LeadsModule],
  controllers: [SellersController],
  providers: [SellersService],
})
export class SellersModule {}
