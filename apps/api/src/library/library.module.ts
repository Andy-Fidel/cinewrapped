import { Module } from '@nestjs/common';

import { MediaProviderModule } from '../media-provider/media-provider.module.js';
import { LibraryController } from './library.controller.js';
import { LibraryService } from './library.service.js';

@Module({
  imports: [MediaProviderModule],
  controllers: [LibraryController],
  providers: [LibraryService],
})
export class LibraryModule {}
