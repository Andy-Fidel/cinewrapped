import { Module } from '@nestjs/common';

import { WorkerService } from './worker.service.js';

@Module({
  providers: [WorkerService],
  exports: [WorkerService],
})
export class WorkerModule {}
