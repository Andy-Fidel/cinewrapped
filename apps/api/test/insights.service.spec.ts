import { describe, expect, it, vi } from 'vitest';

import type { AuthPrincipal } from '../src/auth/auth.types.js';
import type { PrismaService } from '../src/database/prisma.service.js';
import { InsightsService } from '../src/insights/insights.service.js';

const principal: AuthPrincipal = {
  subject: 'auth-viewer',
  email: 'viewer@example.test',
  sessionId: 'session-1',
  expiresAt: null,
  displayName: 'Viewer',
  assuranceLevel: 'aal1',
};
const user = { id: '10000000-0000-4000-8000-000000000000', deletedAt: null };
const period = {
  periodStart: new Date('2026-08-01T00:00:00.000Z'),
  periodEnd: new Date('2026-09-01T00:00:00.000Z'),
  timezone: 'Africa/Accra',
};
const drama = { id: 'genre-drama', name: 'Drama' };
const viewings = [
  {
    id: 'viewing-1',
    userId: user.id,
    mediaId: 'media-1',
    watchedAt: new Date('2026-08-02T20:00:00.000Z'),
    durationWatchedMin: 120,
    isRewatch: false,
    media: {
      id: 'media-1',
      title: 'First Film',
      posterUrl: null,
      runtimeMinutes: 125,
      mediaType: 'MOVIE',
      originalLanguage: 'en',
      releaseYear: 2024,
      genres: [{ genre: drama }],
    },
  },
  {
    id: 'viewing-2',
    userId: user.id,
    mediaId: 'media-1',
    watchedAt: new Date('2026-08-03T20:00:00.000Z'),
    durationWatchedMin: null,
    isRewatch: true,
    media: {
      id: 'media-1',
      title: 'First Film',
      posterUrl: null,
      runtimeMinutes: 125,
      mediaType: 'MOVIE',
      originalLanguage: 'en',
      releaseYear: 2024,
      genres: [{ genre: drama }],
    },
  },
];

describe('InsightsService', () => {
  it('derives statistics from owned viewing and rating records', async () => {
    const prisma = {
      user: { findUnique: vi.fn(() => Promise.resolve(user)) },
      viewing: { findMany: vi.fn(() => Promise.resolve(viewings)) },
      rating: { findMany: vi.fn(() => Promise.resolve([{ normalizedScore: 80 }])) },
    } as unknown as PrismaService;

    const result = await new InsightsService(prisma).summary(principal, period);

    expect(result).toMatchObject({
      uniqueTitles: 1,
      viewingCount: 2,
      totalMinutes: 245,
      totalHours: 4.1,
      rewatchCount: 1,
      averageRatingPercent: 80,
      activeDays: 2,
      longestStreakDays: 2,
      topGenres: [{ id: drama.id, label: 'Drama', count: 2 }],
    });
    expect(result.topTitles[0]).toMatchObject({ viewingCount: 2, minutesWatched: 245 });
  });

  it('rejects invalid IANA timezones before querying activity', async () => {
    const findMany = vi.fn();
    const prisma = {
      user: { findUnique: vi.fn(() => Promise.resolve(user)) },
      viewing: { findMany },
    } as unknown as PrismaService;

    await expect(
      new InsightsService(prisma).summary(principal, { ...period, timezone: 'Not/A_Zone' }),
    ).rejects.toMatchObject({ code: 'TIMEZONE_INVALID' });
    expect(findMany).not.toHaveBeenCalled();
  });

  it('returns an existing completed wrap without regenerating it', async () => {
    const existing = {
      id: 'wrap-1',
      userId: user.id,
      wrapType: 'MONTHLY',
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      timezone: period.timezone,
      status: 'COMPLETED',
      inputVersion: 1,
      statisticsJson: null,
      highlightsJson: { headline: 'Existing wrap' },
      storySlidesJson: null,
      shareImageUrl: null,
      failureCode: null,
      generatedAt: new Date('2026-09-01T01:00:00.000Z'),
      deletedAt: null,
    };
    const upsert = vi.fn();
    const prisma = {
      user: { findUnique: vi.fn(() => Promise.resolve(user)) },
      wrap: { findUnique: vi.fn(() => Promise.resolve(existing)), upsert },
    } as unknown as PrismaService;

    const result = await new InsightsService(prisma).createWrap(principal, {
      type: 'MONTHLY',
      timezone: period.timezone,
      inputVersion: 1,
      periodStart: period.periodStart.toISOString(),
      periodEnd: period.periodEnd.toISOString(),
    });

    expect(result.headline).toBe('Existing wrap');
    expect(upsert).not.toHaveBeenCalled();
  });

  it('renders a completed wrap story from calculated facts', async () => {
    const update = vi.fn(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({
        id: 'wrap-2',
        userId: user.id,
        wrapType: 'MONTHLY',
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        timezone: period.timezone,
        inputVersion: 1,
        shareImageUrl: null,
        deletedAt: null,
        ...data,
      }),
    );
    const prisma = {
      user: { findUnique: vi.fn(() => Promise.resolve(user)) },
      wrap: {
        findUnique: vi.fn(() => Promise.resolve(null)),
        upsert: vi.fn(() =>
          Promise.resolve({
            id: 'wrap-2',
            userId: user.id,
            wrapType: 'MONTHLY',
            periodStart: period.periodStart,
            periodEnd: period.periodEnd,
            timezone: period.timezone,
            status: 'GENERATING',
            inputVersion: 1,
          }),
        ),
        update,
      },
      viewing: { findMany: vi.fn(() => Promise.resolve(viewings)) },
      rating: { findMany: vi.fn(() => Promise.resolve([{ normalizedScore: 80 }])) },
    } as unknown as PrismaService;

    const result = await new InsightsService(prisma).createWrap(principal, {
      type: 'MONTHLY',
      timezone: period.timezone,
      inputVersion: 1,
      periodStart: period.periodStart.toISOString(),
      periodEnd: period.periodEnd.toISOString(),
    });

    expect(result.status).toBe('COMPLETED');
    expect(result.storySlides?.map((slide) => slide.kind)).toEqual([
      'INTRO',
      'TOTALS',
      'FAVORITE_GENRE',
      'TOP_TITLE',
      'RATINGS',
      'OUTRO',
    ]);
    expect(result.storySlides?.find((slide) => slide.kind === 'TOP_TITLE')?.title).toBe(
      'First Film',
    );
  });

  it('conceals wraps that do not belong to the authenticated member', async () => {
    const prisma = {
      user: { findUnique: vi.fn(() => Promise.resolve(user)) },
      wrap: { findFirst: vi.fn(() => Promise.resolve(null)) },
    } as unknown as PrismaService;

    await expect(new InsightsService(prisma).wrap(principal, 'wrap-foreign')).rejects.toMatchObject(
      {
        code: 'WRAP_NOT_FOUND',
      },
    );
  });
});
