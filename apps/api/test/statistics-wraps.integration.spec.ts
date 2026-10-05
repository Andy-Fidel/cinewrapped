import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { PrismaClient } from '@cinewrapped/database';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { InsightsService } from '../src/insights/insights.service.js';
import { LibraryService } from '../src/library/library.service.js';
import type { PrismaService } from '../src/database/prisma.service.js';
import type { AuthPrincipal } from '../src/auth/auth.types.js';
import type { MediaProvider } from '../src/media-provider/media-provider.types.js';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (databaseUrl) {
  const url = new URL(databaseUrl);
  if (!['localhost', '127.0.0.1'].includes(url.hostname) || !url.pathname.endsWith('_test'))
    throw new Error('Audit requires isolated local _test database');
}
const period = {
  periodStart: new Date('2026-07-01T00:00:00Z'),
  periodEnd: new Date('2026-08-01T00:00:00Z'),
  timezone: 'UTC',
};
// Never run against a remote or non-test database.
describe.runIf(!!databaseUrl)('statistics and wraps real-database regression coverage', () => {
  const db = new PrismaClient({
    datasourceUrl: databaseUrl ?? 'postgresql://unused:unused@localhost/unused_test',
  });
  const userId = randomUUID(),
    secondId = randomUUID(),
    movieId = randomUUID(),
    tvId = randomUUID(),
    episodeId = randomUUID();
  const principal = { subject: `audit-${userId}` } as AuthPrincipal;
  const other = { subject: `audit-${secondId}` } as AuthPrincipal;
  const insights = new InsightsService(db as unknown as PrismaService);
  const library = new LibraryService(db as unknown as PrismaService, {} as MediaProvider);
  beforeAll(async () => {
    for (const id of [userId, secondId])
      await db.user.create({
        data: {
          id,
          authSubject: `audit-${id}`,
          email: `${id}@example.test`,
          emailNormalized: `${id}@example.test`,
          username: id.slice(0, 20),
          usernameNormalized: id.slice(0, 20),
          displayName: 'Audit fixture',
          countryCode: 'GH',
          preferredLanguage: 'en-US',
          timezone: 'UTC',
        },
      });
    await db.media.create({
      data: {
        id: movieId,
        externalProvider: 'TMDB',
        externalId: movieId,
        mediaType: 'MOVIE',
        title: 'Audit film',
        originalTitle: 'Audit film',
        runtimeMinutes: 120,
      },
    });
    await db.media.create({
      data: {
        id: tvId,
        externalProvider: 'TMDB',
        externalId: tvId,
        mediaType: 'TV',
        title: 'Audit series',
        originalTitle: 'Audit series',
        runtimeMinutes: 45,
        seasons: {
          create: {
            externalProvider: 'TMDB',
            externalId: randomUUID(),
            seasonNumber: 1,
            name: 'Season 1',
            episodeCount: 1,
            episodes: {
              create: {
                id: episodeId,
                externalProvider: 'TMDB',
                externalId: randomUUID(),
                episodeNumber: 1,
                name: 'Episode 1',
                runtimeMinutes: 45,
              },
            },
          },
        },
      },
    });
    for (const watchedAt of ['2026-07-01T04:30:00Z', '2026-07-01T05:30:00Z'])
      await library.logViewing(principal, movieId, {
        clientOperationId: randomUUID(),
        watchedAt,
        completed: true,
      });
    await library.upsertRating(principal, movieId, {
      ratingValue: 4,
      ratingScale: 5,
      emotionalTags: [],
    });
  });
  afterAll(async () => {
    await db.user.deleteMany({ where: { id: { in: [userId, secondId] } } });
    await db.media.deleteMany({ where: { id: { in: [movieId, tvId] } } });
    await db.$disconnect();
  });
  it('confirms live arithmetic and cross-user isolation', async () => {
    expect(await insights.summary(principal, period)).toMatchObject({
      viewingCount: 2,
      uniqueTitles: 1,
      totalMinutes: 240,
      averageRatingPercent: 80,
      rewatchCount: 1,
    });
    expect(await insights.summary(other, period)).toMatchObject({
      viewingCount: 0,
      totalMinutes: 0,
    });
    const wrap = await insights.createWrap(principal, {
      type: 'MONTHLY',
      timezone: 'UTC',
      inputVersion: 1,
      periodStart: period.periodStart.toISOString(),
      periodEnd: period.periodEnd.toISOString(),
    });
    await expect(insights.wrap(other, wrap.id)).rejects.toMatchObject({ code: 'WRAP_NOT_FOUND' });
    await expect(insights.deleteWrap(other, wrap.id)).rejects.toMatchObject({
      code: 'WRAP_NOT_FOUND',
    });
  });
  it('preserves saved snapshots and creates fresh revisions after new activity', async () => {
    const input = {
      type: 'MONTHLY' as const,
      timezone: 'UTC',
      inputVersion: 1,
      periodStart: period.periodStart.toISOString(),
      periodEnd: period.periodEnd.toISOString(),
    };
    const before = await insights.createWrap(principal, input);
    await library.logViewing(principal, movieId, {
      clientOperationId: randomUUID(),
      watchedAt: '2026-07-02T12:00:00Z',
      completed: true,
    });
    const live = await insights.summary(principal, period);
    const after = await insights.createWrap(principal, input);
    expect(live.viewingCount).toBe(3);
    expect(after.id).toBe(before.id);
    expect(after.statistics?.viewingCount).toBe(2);
    const fresh = await insights.createWrap(principal, { ...input, refresh: true });
    expect(fresh.id).not.toBe(before.id);
    expect(fresh.revision).toBe(before.revision + 1);
    expect(fresh.statistics?.viewingCount).toBe(3);
    expect((await insights.wrap(principal, before.id)).statistics?.viewingCount).toBe(2);
  });
  it('keeps equal-boundary snapshots distinct by time zone', async () => {
    const input = {
      type: 'YEARLY' as const,
      inputVersion: 1,
      periodStart: '2026-01-01T05:00:00.000Z',
      periodEnd: '2027-01-01T05:00:00.000Z',
    };
    const first = await insights.createWrap(principal, { ...input, timezone: 'America/New_York' });
    const second = await insights.createWrap(principal, { ...input, timezone: 'America/Lima' });
    const live = await insights.summary(principal, {
      periodStart: new Date(input.periodStart),
      periodEnd: new Date(input.periodEnd),
      timezone: 'America/Lima',
    });
    expect(first.statistics?.activeDays).toBe(2);
    expect(live.activeDays).toBe(3);
    expect(second.id).not.toBe(first.id);
    expect(second.timezone).toBe('America/Lima');
    expect(second.statistics?.activeDays).toBe(3);
  });
  it('counts episode completion and handles replay, date editing, undo and recompletion', async () => {
    const operation = randomUUID();
    const result = await library.updateEpisodeProgress(other, episodeId, {
      completed: true,
      watchedAt: '2026-07-03T12:00:00Z',
      clientOperationId: operation,
    });
    await library.updateEpisodeProgress(other, episodeId, {
      completed: true,
      watchedAt: '2026-07-03T12:00:00Z',
      clientOperationId: operation,
    });
    expect(result.completed).toBe(true);
    const stats = await insights.summary(other, period);
    expect(stats).toMatchObject({ viewingCount: 1, tvViewings: 1, totalMinutes: 45 });
    const edited = await library.updateEpisodeProgress(other, episodeId, {
      completed: true,
      watchedAt: '2026-07-03T14:00:00Z',
      expectedVersion: result.version!,
    });
    expect((await insights.summary(other, period)).totalMinutes).toBe(45);
    const undone = await library.updateEpisodeProgress(other, episodeId, {
      completed: false,
      expectedVersion: edited.version!,
    });
    expect((await insights.summary(other, period)).totalMinutes).toBe(0);
    await library.updateEpisodeProgress(other, episodeId, {
      completed: true,
      watchedAt: '2026-07-03T15:00:00Z',
      expectedVersion: undone.version!,
    });
    await library.logViewing(other, tvId, {
      clientOperationId: randomUUID(),
      watchedAt: '2026-07-03T16:00:00Z',
      completed: true,
    });
    expect(await insights.summary(other, period)).toMatchObject({
      tvViewings: 1,
      totalMinutes: 45,
    });
  });
  it('scopes longest streak to the selected year', async () => {
    const map = await insights.activityHeatmap(principal, 2025, 'UTC');
    expect(map.totalViewings).toBe(0);
    expect(map.longestStreakDays).toBe(0);
  });
  it('confirms cursor pagination works beyond the 30 records loaded by the UI', async () => {
    await db.wrap.createMany({
      data: Array.from({ length: 31 }, (_, i) => ({
        userId,
        wrapType: 'WEEKLY' as const,
        timezone: 'UTC',
        status: 'COMPLETED' as const,
        inputVersion: 1,
        periodStart: new Date(Date.UTC(2024, 0, 1 + i * 7)),
        periodEnd: new Date(Date.UTC(2024, 0, 8 + i * 7)),
      })),
    });
    const first = await insights.wraps(principal, { limit: 30 });
    expect(first.items).toHaveLength(30);
    expect(first.nextCursor).not.toBeNull();
    const next = await insights.wraps(principal, { limit: 30, cursor: first.nextCursor! });
    expect(next.items.length).toBeGreaterThan(0);
    expect(next.items.some((item) => first.items.some((previous) => previous.id === item.id))).toBe(
      false,
    );
  });
  it('does not invent minutes for incomplete viewings', async () => {
    await library.logViewing(other, movieId, {
      clientOperationId: randomUUID(),
      watchedAt: '2026-07-04T12:00:00Z',
      completed: false,
    });
    const stats = await insights.summary(other, period);
    expect(stats.totalMinutes).toBe(45);
  });
  it('counts local calendar days across the New York spring DST transition', async () => {
    const history = await db.watchHistory.findUniqueOrThrow({
      where: { userId_mediaId: { userId, mediaId: movieId } },
    });
    await db.viewing.createMany({
      data: ['2026-03-08T16:00:00Z', '2026-03-09T04:15:00Z'].map((date) => ({
        userId,
        mediaId: movieId,
        watchHistoryId: history.id,
        watchedAt: new Date(date),
        durationWatchedMin: 10,
      })),
    });
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-03-09T04:30:00Z'));
    try {
      expect(
        (await insights.activityHeatmap(principal, 2026, 'America/New_York')).currentStreakDays,
      ).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });
  it('retries historical failures and takes over expired generation attempts', async () => {
    const row = await db.wrap.create({
      data: {
        userId,
        wrapType: 'MONTHLY',
        timezone: 'UTC',
        periodStart: new Date('2023-01-01Z'),
        periodEnd: new Date('2023-02-01Z'),
        status: 'FAILED',
      },
    });
    await expect(insights.regenerateWrap(other, row.id, false)).rejects.toMatchObject({
      code: 'WRAP_NOT_FOUND',
    });
    const result = await insights.regenerateWrap(principal, row.id, false);
    expect(result).toMatchObject({
      id: row.id,
      status: 'COMPLETED',
      periodStart: row.periodStart.toISOString(),
    });
    await db.wrap.update({
      where: { id: row.id },
      data: {
        status: 'GENERATING',
        generationStartedAt: new Date(Date.now() - 360_000),
        generationAttemptId: randomUUID(),
      },
    });
    expect((await insights.wrap(principal, row.id)).canRetry).toBe(true);
    expect((await insights.regenerateWrap(principal, row.id, false)).status).toBe('COMPLETED');
  });
  it('observes active attempts and prevents a late failure overwriting a replacement success', async () => {
    let rejectFirst!: (error: Error) => void;
    let announceStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      announceStarted = resolve;
    });
    const interrupted = new Promise<never>((_resolve, reject) => {
      rejectFirst = reject;
    });
    const transaction = vi.spyOn(db, '$transaction').mockImplementationOnce(() => {
      announceStarted();
      return interrupted;
    });
    const input = {
      type: 'MONTHLY' as const,
      timezone: 'UTC',
      inputVersion: 1,
      periodStart: '2022-01-01T00:00:00Z',
      periodEnd: '2022-02-01T00:00:00Z',
    };
    const first = insights.createWrap(principal, input);
    await started;
    try {
      const active = await insights.createWrap(principal, input);
      expect(active.status).toBe('GENERATING');
      await db.wrap.update({
        where: { id: active.id },
        data: { generationStartedAt: new Date(Date.now() - 360_000) },
      });
      const replacement = await insights.createWrap(principal, input);
      expect(replacement.status).toBe('COMPLETED');
      rejectFirst(new Error('Earlier request failed'));
      expect((await first).status).toBe('COMPLETED');
      expect((await insights.wrap(principal, replacement.id)).status).toBe('COMPLETED');
    } finally {
      rejectFirst(new Error('Cleanup'));
      transaction.mockRestore();
    }
  });
  it('counts calendar days across the autumn DST transition, including the repeated hour', async () => {
    const history = await db.watchHistory.findUniqueOrThrow({
      where: { userId_mediaId: { userId, mediaId: movieId } },
    });
    await db.viewing.createMany({
      data: ['2026-11-01T05:30:00Z', '2026-11-01T06:30:00Z', '2026-11-02T05:15:00Z'].map(
        (date) => ({
          userId,
          mediaId: movieId,
          watchHistoryId: history.id,
          watchedAt: new Date(date),
          durationWatchedMin: 10,
        }),
      ),
    });
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-02T05:30:00Z'));
    try {
      expect(
        (await insights.activityHeatmap(principal, 2026, 'America/New_York')).currentStreakDays,
      ).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });
  it('backfills only the one dated legacy episode occurrence and remains idempotent', async () => {
    await db.watchHistory.create({ data: { userId, mediaId: tvId, status: 'COMPLETED' } });
    await db.episodeWatchHistory.create({
      data: {
        userId,
        episodeId,
        completed: true,
        watchedAt: new Date('2026-08-04T12:00:00Z'),
        watchCount: 3,
      },
    });
    const migration = readFileSync(
      new URL(
        '../../../packages/database/prisma/migrations/20261004211641_statistics_wrap_fixes/migration.sql',
        import.meta.url,
      ),
      'utf8',
    );
    const backfill = migration.slice(migration.indexOf('INSERT INTO'));
    await db.$executeRawUnsafe(backfill);
    await db.$executeRawUnsafe(backfill);
    expect(await db.viewing.count({ where: { userId, episodeId, deletedAt: null } })).toBe(1);
    expect(
      (
        await insights.summary(principal, {
          ...period,
          periodStart: new Date('2026-08-01Z'),
          periodEnd: new Date('2026-09-01Z'),
        })
      ).totalMinutes,
    ).toBe(45);
  });
});
