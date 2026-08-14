import { Module } from '@nestjs/common';

import { FeatureFlagsModule } from '../feature-flags/feature-flags.module.js';
import { CalendarController } from './calendar.controller.js';
import { CalendarService } from './calendar.service.js';

@Module({
  imports: [FeatureFlagsModule],
  controllers: [CalendarController],
  providers: [CalendarService],
})
export class CalendarModule {}
