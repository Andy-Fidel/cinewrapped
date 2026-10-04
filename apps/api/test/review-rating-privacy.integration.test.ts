import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@cinewrapped/database';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SocialService } from '../src/social/social.service.js';
import { InsightsService } from '../src/insights/insights.service.js';
import { LibraryService } from '../src/library/library.service.js';
import type { PrismaService } from '../src/database/prisma.service.js';
import type { AuthPrincipal } from '../src/auth/auth.types.js';
import type { MediaProvider } from '../src/media-provider/media-provider.types.js';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (databaseUrl) {
  const url = new URL(databaseUrl);
  if (!['localhost', '127.0.0.1', '::1'].includes(url.hostname) || !url.pathname.endsWith('_test'))
    throw new Error('Privacy tests require an isolated local database ending in _test.');
}
describe.runIf(databaseUrl !== undefined)('public review rating privacy', () => {
  const db = new PrismaClient({
    datasourceUrl: databaseUrl ?? 'postgresql://unused:unused@localhost/unused_test',
  });
  const ids = Array.from({ length: 10 }, () => randomUUID());
  const [
    viewer,
    publicAuthor,
    privateAuthor,
    friend,
    stranger,
    pending,
    blocked,
    blocker,
    missing,
    liked,
  ] = ids as [string, string, string, string, string, string, string, string, string, string];
  const mediaId = randomUUID();
  const service = new LibraryService(db as unknown as PrismaService, {} as MediaProvider);
  const principal = { subject: `card-${viewer}` } as AuthPrincipal;
  beforeAll(async () => {
    for (const id of ids) {
      await db.user.create({
        data: {
          id,
          authSubject: `card-${id}`,
          email: `${id}@example.test`,
          emailNormalized: `${id}@example.test`,
          username: id.slice(0, 20),
          usernameNormalized: id.slice(0, 20),
          displayName: 'Card test',
          countryCode: 'GH',
          preferredLanguage: 'en-US',
          timezone: 'Africa/Accra',
          ...(id === missing
            ? {}
            : {
                privacySettings: {
                  create: {
                    ratingsVisibility:
                      id === viewer || id === privateAuthor
                        ? 'PRIVATE'
                        : [friend, stranger, pending].includes(id)
                          ? 'FRIENDS'
                          : 'PUBLIC',
                  },
                },
              }),
        },
      });
    }
    await db.media.create({
      data: {
        id: mediaId,
        externalProvider: 'TMDB',
        externalId: mediaId,
        mediaType: 'MOVIE',
        title: 'Privacy fixture',
        originalTitle: 'Privacy fixture',
      },
    });
    for (const id of ids) {
      await db.review.create({
        data: {
          userId: id,
          mediaId,
          body: 'Public review',
          status: 'PUBLISHED',
          visibility: 'PUBLIC',
        },
      });
      await db.rating.create({
        data: {
          userId: id,
          mediaId,
          ratingValue: id === liked ? null : 9,
          ratingScale: id === liked ? null : 10,
          liked: true,
        },
      });
    }
    for (const [id, status] of [
      [friend, 'ACCEPTED'],
      [pending, 'PENDING'],
    ] as const)
      await db.friendship.create({
        data: { userAId: viewer, userBId: id, requesterId: viewer, addresseeId: id, status },
      });
    await db.userBlock.createMany({
      data: [
        { blockerId: viewer, blockedId: blocked },
        { blockerId: blocker, blockedId: viewer },
      ],
    });
  });
  afterAll(async () => {
    await db.user.deleteMany({ where: { id: { in: ids } } });
    await db.media.deleteMany({ where: { id: mediaId } });
    await db.$disconnect();
  });
  it('returns public and accepted-friend ratings on their original scale and allows the owner', async () => {
    const reviews = await service.listMediaReviews(principal, mediaId, 50);
    for (const id of [viewer, publicAuthor, friend])
      expect(reviews.find((review) => review.user.id === id)).toMatchObject({
        ratingValue: 9,
        ratingScale: 10,
      });
    for (const id of [privateAuthor, stranger, pending, missing, liked])
      expect(reviews.find((review) => review.user.id === id)).toMatchObject({
        ratingValue: null,
        ratingScale: null,
      });
    for (const id of [blocked, blocker])
      expect(reviews.find((review) => review.user.id === id)).toBeUndefined();
  });
  it('immediately respects a privacy change and a revoked friendship', async () => {
    await db.privacySettings.update({
      where: { userId: publicAuthor },
      data: { ratingsVisibility: 'PRIVATE' },
    });
    await db.friendship.updateMany({
      where: { userAId: viewer, userBId: friend },
      data: { status: 'DECLINED' },
    });
    const reviews = await service.listMediaReviews(principal, mediaId, 50);
    for (const id of [publicAuthor, friend])
      expect(reviews.find((review) => review.user.id === id)).toMatchObject({
        ratingValue: null,
        ratingScale: null,
      });
  });
  it('publishes without changing sharing preferences, restoring old activities, or constructing placeholder links', async () => {
    const before = await db.privacySettings.findUniqueOrThrow({ where: { userId: viewer } });
    const review = await db.review.findFirstOrThrow({ where: { userId: viewer, mediaId } });
    await service.updateReview(principal, review.id, {
      body: 'Published update',
      status: 'PUBLISHED',
      expectedVersion: review.version,
    });
    const social = new SocialService(db as unknown as PrismaService);
    const receipt = await social.shareMedia(principal, mediaId);
    expect(receipt.webUrl).toBe(`https://cinewrapped.vercel.app/media/${mediaId}`);
    expect(
      (await db.privacySettings.findUniqueOrThrow({ where: { userId: viewer } }))
        .shareReviewActivity,
    ).toBe(before.shareReviewActivity);
    const feed = await social.feed(principal, 50);
    expect(
      feed.items.some(
        (item) => item.actor.id === viewer && item.activityType === 'USER_REVIEWED_MEDIA',
      ),
    ).toBe(false);
  });
  it('keeps wraps owner-only and does not advertise fake expiring public links', async () => {
    const wrap = await db.wrap.create({
      data: {
        userId: viewer,
        wrapType: 'MONTHLY',
        periodStart: new Date('2026-01-01T00:00:00Z'),
        periodEnd: new Date('2026-02-01T00:00:00Z'),
        timezone: 'UTC',
        status: 'COMPLETED',
        statisticsJson: { viewingCount: 3 },
        storySlidesJson: [
          { id: 'slide-1', title: 'Cinema', body: 'Summary', eyebrow: 'Stats', accent: 'TEAL' },
        ],
      },
    });
    const insights = new InsightsService(db as unknown as PrismaService);
    await expect(
      insights.shareCard(principal, wrap.id, { slideIndex: 0, expiresInMinutes: 60 }),
    ).rejects.toMatchObject({ code: 'PUBLIC_WRAP_LINKS_UNAVAILABLE' });
    await expect(
      insights.shareCard(principal, wrap.id, { slideIndex: 8, expiresInMinutes: 60 }),
    ).rejects.toMatchObject({ code: 'WRAP_SLIDE_INVALID' });
    await expect(
      insights.shareCard({ ...principal, subject: `card-${publicAuthor}` }, wrap.id, {
        slideIndex: 0,
        expiresInMinutes: 60,
      }),
    ).rejects.toMatchObject({ code: 'WRAP_NOT_FOUND' });
  });
});
