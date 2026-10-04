import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkerEnvironment } from '@cinewrapped/config';

const db = vi.hoisted(() => ({
  $connect: vi.fn(),
  $disconnect: vi.fn(),
  $executeRaw: vi.fn(),
  outboxEvent: { updateMany: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
  $queryRaw: vi.fn(),
}));
vi.mock('@cinewrapped/database', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  return {
    ...original,
    PrismaClient: class {
      constructor() {
        return { ...db, $transaction: async (run: (tx: typeof db) => Promise<unknown>) => run(db) };
      }
    },
  };
});
import { WorkerService } from '../src/worker.service.js';

describe('scheduled worker', () => {
  beforeEach(() => vi.resetAllMocks());
  const env = {
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SECRET_KEY: 'test-server-secret-key',
    OUTBOX_MAX_ATTEMPTS: 10,
    OUTBOX_BATCH_SIZE: 1,
  } as WorkerEnvironment;
  const event = {
    id: 'event-1',
    eventType: 'system.healthcheck',
    aggregateId: 'aggregate-1',
    createdAt: new Date(),
  };

  it('acknowledges a completed job and releases connections', async () => {
    db.$queryRaw.mockResolvedValue([event]);
    expect(await new WorkerService(env).runScheduledBatch()).toEqual({ processed: 1, failed: 0 });
    expect(db.outboxEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'PUBLISHED', lockedAt: null }),
      }),
    );
    expect(db.$disconnect).toHaveBeenCalledOnce();
  });
  it('persists retry state for unsupported jobs instead of acknowledging them', async () => {
    db.$queryRaw.mockResolvedValue([{ ...event, eventType: 'unknown' }]);
    db.outboxEvent.findUnique.mockResolvedValue({ attemptCount: 1 });
    expect(await new WorkerService(env).runScheduledBatch()).toEqual({ processed: 0, failed: 1 });
    expect(db.outboxEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'FAILED',
          lockedAt: null,
          availableAt: expect.any(Date),
        }),
      }),
    );
    expect(db.$disconnect).toHaveBeenCalledOnce();
  });
  it('releases connections when claiming jobs fails', async () => {
    db.$queryRaw.mockRejectedValue(new Error('database failure'));
    await expect(new WorkerService(env).runScheduledBatch()).rejects.toThrow('database failure');
    expect(db.$disconnect).toHaveBeenCalledOnce();
  });
});
