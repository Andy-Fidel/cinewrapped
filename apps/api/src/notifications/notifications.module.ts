import { Module } from '@nestjs/common';

import { TokenCryptoService } from '../common/token-crypto.service.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, TokenCryptoService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
