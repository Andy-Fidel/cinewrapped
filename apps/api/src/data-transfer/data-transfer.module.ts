import { Module } from '@nestjs/common';
import { MediaProviderModule } from '../media-provider/media-provider.module.js';
import { AccountExportService } from './account-export.service.js';
import { DataTransferController } from './data-transfer.controller.js';
import { DataTransferService } from './data-transfer.service.js';
@Module({
  imports: [MediaProviderModule],
  controllers: [DataTransferController],
  providers: [DataTransferService, AccountExportService],
  exports: [DataTransferService],
})
export class DataTransferModule {}
