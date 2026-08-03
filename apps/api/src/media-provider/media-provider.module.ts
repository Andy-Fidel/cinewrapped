import { Module } from '@nestjs/common';

import { CacheService } from '../cache/cache.service.js';
import { MediaCatalogController } from './media-catalog.controller.js';
import { MediaCatalogService } from './media-catalog.service.js';
import { MEDIA_PROVIDER } from './media-provider.types.js';
import { TmdbMediaProvider } from './tmdb-media.provider.js';

@Module({
  controllers: [MediaCatalogController],
  providers: [
    CacheService,
    MediaCatalogService,
    TmdbMediaProvider,
    { provide: MEDIA_PROVIDER, useExisting: TmdbMediaProvider },
  ],
  exports: [MediaCatalogService, MEDIA_PROVIDER],
})
export class MediaProviderModule {}
