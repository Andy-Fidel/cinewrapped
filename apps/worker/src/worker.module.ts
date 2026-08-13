import { parseWorkerEnvironment, type WorkerEnvironment } from '@cinewrapped/config';
import { Module } from '@nestjs/common';

import { WORKER_ENVIRONMENT } from './worker-environment.js';
import { WorkerService } from './worker.service.js';

@Module({
  providers: [
    {
      provide: WORKER_ENVIRONMENT,
      useFactory: (): WorkerEnvironment => parseWorkerEnvironment(process.env),
    },
    WorkerService,
  ],
  exports: [WorkerService],
})
export class WorkerModule {}
