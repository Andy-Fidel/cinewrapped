import { Module } from '@nestjs/common';

import { FeatureFlagsModule } from '../feature-flags/feature-flags.module.js';
import { JournalController } from './journal.controller.js';
import { JournalService } from './journal.service.js';

@Module({
  imports: [FeatureFlagsModule],
  controllers: [JournalController],
  providers: [JournalService],
})
export class JournalModule {}
