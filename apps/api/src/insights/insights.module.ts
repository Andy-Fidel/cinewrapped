import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module.js';
import { InsightsController } from './insights.controller.js';
import { InsightsService } from './insights.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [InsightsController],
  providers: [InsightsService],
})
export class InsightsModule {}
