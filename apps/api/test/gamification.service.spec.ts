import { describe, expect, it, vi } from 'vitest';

import type { AuthPrincipal } from '../src/auth/auth.types.js';
import type { PrismaService } from '../src/database/prisma.service.js';
import { GamificationService } from '../src/gamification/gamification.service.js';

const principal: AuthPrincipal = {
  subject: 'auth-user-1',
  email: 'viewer@example.test',
  sessionId: 'session-1',
  expiresAt: null,
  displayName: 'Viewer',
  assuranceLevel: 'aal1',
};

const user = {
  id: 'user-1',
  authSubject: principal.subject,
  username: 'viewer',
  displayName: 'Viewer',
  avatarUrl: null,
  bio: null,
  timezone: 'UTC',
  deletedAt: null,
};

describe('GamificationService', () => {
  it('projects achievement progress, streaks, and passport stamps from viewing activity', async () => {
    const watchedAt = new Date();
    const viewing = {
      userId: user.id,
      mediaId: 'media-1',
      watchedAt,
      durationWatchedMin: 121,
      isRewatch: false,
      media: {
        runtimeMinutes: 121,
        countryCodes: ['GH', 'US'],
        originalLanguage: 'en',
        releaseYear: 2024,
      },
    };
    const prisma = {
      user: { findUnique: vi.fn(() => Promise.resolve(user)) },
      achievement: {
        findMany: vi.fn(() =>
          Promise.resolve([
            {
              id: 'achievement-1',
              code: 'first-watch',
              name: 'Opening Scene',
              description: 'Log your first viewing.',
              category: 'WATCHING',
              tier: 'BRONZE',
              points: 10,
              criteriaJson: { metric: 'VIEWINGS', target: 1 },
              users: [],
            },
          ]),
        ),
      },
      userAchievement: { upsert: vi.fn(() => Promise.resolve({})) },
      privacySettings: { findUnique: vi.fn(() => Promise.resolve(null)) },
      challenge: { findMany: vi.fn(() => Promise.resolve([])) },
      viewing: { findMany: vi.fn(() => Promise.resolve([viewing])) },
      rating: { count: vi.fn(() => Promise.resolve(0)) },
      review: { count: vi.fn(() => Promise.resolve(0)) },
      $transaction: vi.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
    } as unknown as PrismaService;

    const result = await new GamificationService(prisma).dashboard(principal);

    expect(result).toMatchObject({
      totalPoints: 10,
      unlockedCount: 1,
      streak: { currentDays: 1, longestDays: 1, timezone: 'UTC' },
      passport: { countriesVisited: 2, languagesExplored: 1, decadesExplored: 1 },
    });
    expect(result.achievements[0]).toMatchObject({ progress: 1, target: 1 });
    expect(result.achievements[0]?.unlockedAt).not.toBeNull();
    expect(result.passport.stamps.map((stamp) => stamp.countryCode).sort()).toEqual(['GH', 'US']);
  });

  it('rejects joining a challenge outside its active window', async () => {
    const prisma = {
      user: { findUnique: vi.fn(() => Promise.resolve(user)) },
      challenge: { findFirst: vi.fn(() => Promise.resolve(null)) },
      userChallenge: { upsert: vi.fn() },
    } as unknown as PrismaService;

    await expect(
      new GamificationService(prisma).joinChallenge(
        principal,
        '4d54ff6c-3601-4fa5-8463-b2ad2e55da60',
      ),
    ).rejects.toMatchObject({ code: 'CHALLENGE_NOT_FOUND' });
  });

  it('asks the database only for public, permitted-friend, and viewer leaderboard rows', async () => {
    const findManySettings = vi.fn(() => Promise.resolve([{ userId: user.id, user }]));
    const prisma = {
      user: { findUnique: vi.fn(() => Promise.resolve(user)) },
      friendship: { findMany: vi.fn(() => Promise.resolve([])) },
      userBlock: { findMany: vi.fn(() => Promise.resolve([])) },
      privacySettings: { findMany: findManySettings },
      userAchievement: { findMany: vi.fn(() => Promise.resolve([])) },
      userChallenge: { findMany: vi.fn(() => Promise.resolve([])) },
    } as unknown as PrismaService;

    const result = await new GamificationService(prisma).leaderboard(principal, 'POINTS', 25);

    expect(result.entries).toEqual([
      expect.objectContaining({ rank: 1, score: 0, isViewer: true }),
    ]);
    expect(findManySettings).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { userId: user.id },
            { leaderboardVisibility: 'PUBLIC' },
            { userId: { in: [] }, leaderboardVisibility: 'FRIENDS' },
          ],
        }),
      }),
    );
  });
});
