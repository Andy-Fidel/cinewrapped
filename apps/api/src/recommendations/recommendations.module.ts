import { Module } from '@nestjs/common';

import { CacheService } from '../cache/cache.service.js';
import { RecommendationsController } from './recommendations.controller.js';
import { RecommendationsService } from './recommendations.service.js';

@Module({
  controllers: [RecommendationsController],
  providers: [CacheService, RecommendationsService],
})
export class RecommendationsModule {}
