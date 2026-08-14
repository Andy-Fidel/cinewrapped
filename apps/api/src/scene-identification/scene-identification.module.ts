import { Module } from '@nestjs/common';

import { CacheService } from '../cache/cache.service.js';
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module.js';
import { MediaProviderModule } from '../media-provider/media-provider.module.js';
import { OpenAiSceneProvider } from './openai-scene.provider.js';
import { SceneIdentificationController } from './scene-identification.controller.js';
import { SceneIdentificationService } from './scene-identification.service.js';

@Module({
  imports: [FeatureFlagsModule, MediaProviderModule],
  controllers: [SceneIdentificationController],
  providers: [CacheService, OpenAiSceneProvider, SceneIdentificationService],
})
export class SceneIdentificationModule {}
