import { Module } from '@nestjs/common';

import { SocialModule } from '../social/social.module.js';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';

@Module({ imports: [SocialModule], controllers: [ReportsController], providers: [ReportsService] })
export class ReportsModule {}
