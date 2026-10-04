import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DataTransferService } from '../src/data-transfer/data-transfer.service.js';
import { ScheduledJobsController } from '../src/scheduled-jobs.controller.js';

describe('scheduled jobs authorization', () => {
  afterEach(() => vi.unstubAllEnvs());
  it.each([undefined, 'Bearer wrong', 'Bearer ' + 'a'.repeat(32)])(
    'rejects an unauthorized invocation (%s)',
    async (authorization) => {
      vi.stubEnv('CRON_SECRET', 'b'.repeat(32));
      await expect(
        new ScheduledJobsController({} as DataTransferService).run(authorization),
      ).rejects.toMatchObject({
        status: 401,
      });
    },
  );
  it('fails closed when no secret is configured', async () => {
    vi.stubEnv('CRON_SECRET', '');
    await expect(
      new ScheduledJobsController({} as DataTransferService).run('Bearer '),
    ).rejects.toMatchObject({
      status: 401,
    });
  });
});
