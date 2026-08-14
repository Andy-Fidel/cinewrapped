import { Module } from '@nestjs/common';

import { CacheService } from '../cache/cache.service.js';
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module.js';
import { AppleSoundtrackProvider } from './apple-soundtrack.provider.js';
import { SoundtracksController } from './soundtracks.controller.js';
import { SoundtracksService } from './soundtracks.service.js';

@Module({
  imports: [FeatureFlagsModule],
  controllers: [SoundtracksController],
  providers: [CacheService, AppleSoundtrackProvider, SoundtracksService],
})
export class SoundtracksModule {}
