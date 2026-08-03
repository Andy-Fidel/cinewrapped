import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module.js';
import { GamificationController } from './gamification.controller.js';
import { GamificationService } from './gamification.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [GamificationController],
  providers: [GamificationService],
})
export class GamificationModule {}
