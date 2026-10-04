import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../src/database/prisma.service.js';
import type { AuthPrincipal } from '../src/auth/auth.types.js';
import type { MediaCatalogService } from '../src/media-provider/media-catalog.service.js';
import {
  DataTransferService,
  importOperationId,
  importWatchedAt,
  importSchema,
} from '../src/data-transfer/data-transfer.service.js';
import { AccountExportService } from '../src/data-transfer/account-export.service.js';
const principal = { subject: 'subject' } as AuthPrincipal;
function fixture(matches: unknown[] = [{ id: 'media', title: 'Arrival' }]) {
  const db = {
    user: { findFirst: vi.fn().mockResolvedValue({ id: 'owner' }) },
    outboxEvent: {
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn().mockResolvedValue(null),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    watchHistory: {
      upsert: vi.fn().mockResolvedValue({ id: 'history', lastWatchedAt: null }),
      update: vi.fn(),
    },
    viewing: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn() },
    rating: { upsert: vi.fn() },
    review: { upsert: vi.fn() },
  };
  const prisma = {
    ...db,
    $transaction: async (run: (tx: typeof db) => Promise<unknown>) => run(db),
  } as unknown as PrismaService;
  const search = vi.fn().mockResolvedValue(matches);
  const service = new DataTransferService(prisma, { search } as unknown as MediaCatalogService);
  return { db, prisma, service, search };
}
const event = () => ({
  id: 'job',
  aggregateId: 'owner',
  payloadJson: {
    entries: [
      {
        title: 'Arrival',
        releaseYear: 2016,
        isRewatch: false,
        watchedDate: '2026-09-01',
        rating: 4,
        review: 'Excellent.',
      },
    ],
    nextIndex: 0,
    results: [],
  },
});
describe('data transfer', () => {
  it('preserves diary calendar dates in zones on either side of the date line and DST', () => {
    for (const zone of ['Pacific/Kiritimati', 'Pacific/Honolulu', 'America/New_York']) {
      const date = importWatchedAt('2026-03-08', zone);
      expect(
        new Intl.DateTimeFormat('en-CA', {
          timeZone: zone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(date),
      ).toBe('2026-03-08');
    }
  });
  it('validates input and creates stable UUID operation identifiers', () => {
    expect(
      importSchema.safeParse({ entries: [{ title: 'Arrival', isRewatch: false, rating: 6 }] })
        .success,
    ).toBe(false);
    expect(importOperationId('source', 0)).toMatch(
      /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-8[a-f0-9]{3}-[a-f0-9]{12}$/,
    );
    expect(importOperationId('source', 0)).not.toBe(importOperationId('source', 1));
  });
  it('checkpoints saved records, preserves ratings and keeps reviews private', async () => {
    const f = fixture();
    expect(await f.service.processImport(event())).toBe(false);
    expect(f.db.review.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: {},
        create: expect.objectContaining({ visibility: 'PRIVATE', userId: 'owner' }),
      }),
    );
    expect(f.db.rating.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: {} }));
    expect(f.db.outboxEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { payloadJson: expect.objectContaining({ nextIndex: 1 }) } }),
    );
  });
  it('reports ambiguous titles without writing library data', async () => {
    const f = fixture([
      { id: 'first', title: 'Arrival' },
      { id: 'second', title: 'Arrival' },
    ]);
    const job = event();
    await f.service.processImport(job);
    expect(f.db.watchHistory.upsert).not.toHaveBeenCalled();
    expect(job.payloadJson.results).toEqual([{ title: 'Arrival', status: 'ambiguous' }]);
  });
  it('does not advance a failed row and can resume at the saved checkpoint', async () => {
    const f = fixture();
    f.db.rating.upsert.mockRejectedValueOnce(new Error('database unavailable'));
    const job = event();
    await expect(f.service.processImport(job)).rejects.toThrow('database unavailable');
    expect(job.payloadJson.nextIndex).toBe(0);
    expect(f.db.outboxEvent.update).not.toHaveBeenCalled();
  });
  it('scopes status and cancellation to the authenticated owner', async () => {
    const f = fixture();
    await f.service.imports(principal);
    expect(f.db.outboxEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { aggregateType: 'data-import', aggregateId: 'owner' } }),
    );
    await expect(f.service.cancelImport(principal, 'foreign-job')).rejects.toMatchObject({
      code: 'IMPORT_NOT_CANCELLABLE',
    });
    expect(f.db.outboxEvent.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ aggregateId: 'owner' }) }),
    );
  });
  it('scopes export pages and provides a cursor without truncating silently', async () => {
    const f = fixture();
    const findMany = vi
      .fn()
      .mockResolvedValue(Array.from({ length: 101 }, (_, index) => ({ id: `row-${index}` })));
    const service = new AccountExportService({
      ...f.prisma,
      rating: { findMany },
    } as unknown as PrismaService);
    const page = await service.page(principal, { collection: 'ratings' });
    expect(page.records).toHaveLength(100);
    expect(page.nextCursor).toBe('row-99');
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'owner' }), take: 101 }),
    );
  });
});
