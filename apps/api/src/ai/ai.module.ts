import { Module } from '@nestjs/common';

import { CacheService } from '../cache/cache.service.js';
import { MediaProviderModule } from '../media-provider/media-provider.module.js';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';
import { AI_PROVIDER, GroundedAiProvider } from './grounded-ai.provider.js';

@Module({
  imports: [MediaProviderModule],
  controllers: [AiController],
  providers: [
    AiService,
    CacheService,
    GroundedAiProvider,
    { provide: AI_PROVIDER, useExisting: GroundedAiProvider },
  ],
})
export class AiModule {}
