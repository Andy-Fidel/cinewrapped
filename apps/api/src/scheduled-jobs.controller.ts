import { parseWorkerEnvironment } from '@cinewrapped/config';
import { WorkerService } from '@cinewrapped/worker';
import { Controller, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { timingSafeEqual } from 'node:crypto';

import { DataTransferService } from './data-transfer/data-transfer.service.js';

import { Public } from './auth/public.decorator.js';

@ApiExcludeController()
@Public()
@Controller('internal/jobs')
export class ScheduledJobsController {
  constructor(private readonly transfer: DataTransferService) {}
  @Post('run')
  public async run(
    @Headers('authorization') authorization?: string,
  ): Promise<{ processed: number; failed: number }> {
    const secret = process.env.CRON_SECRET;
    const expected = Buffer.from(`Bearer ${secret ?? ''}`);
    const supplied = Buffer.from(authorization ?? '');
    if (
      !secret ||
      secret.length < 32 ||
      expected.length !== supplied.length ||
      !timingSafeEqual(expected, supplied)
    ) {
      throw new UnauthorizedException();
    }
    const worker = new WorkerService(
      parseWorkerEnvironment({ ...process.env, OUTBOX_BATCH_SIZE: '1' }),
    );
    return worker.runScheduledBatch({
      'data.import': (event) => this.transfer.processImport(event),
    });
  }
}
