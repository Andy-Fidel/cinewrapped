import { Module } from '@nestjs/common';

import { CacheService } from '../cache/cache.service.js';
import { MediaProviderModule } from '../media-provider/media-provider.module.js';
import { SearchController } from './search.controller.js';
import { SearchService } from './search.service.js';

@Module({
  imports: [MediaProviderModule],
  controllers: [SearchController],
  providers: [SearchService, CacheService],
})
export class SearchModule {}
