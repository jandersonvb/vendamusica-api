import { Module } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { WantedModule } from '../wanted/wanted.module';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';

@Module({
  imports: [WantedModule],
  controllers: [ModerationController],
  providers: [ModerationService, AdminGuard],
  exports: [ModerationService],
})
export class ModerationModule {}
