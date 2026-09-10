import { describe, expect, it, vi } from 'vitest';

import type { AuthPrincipal } from '../src/auth/auth.types.js';
import type { PrismaService } from '../src/database/prisma.service.js';
import { RecommendationsService } from '../src/recommendations/recommendations.service.js';

const principal: AuthPrincipal = {
  subject: 'auth-user-1',
  email: 'viewer@example.test',
  sessionId: 'session-1',
  expiresAt: null,
  displayName: 'Viewer',
  assuranceLevel: 'aal1',
};

describe('RecommendationsService', () => {
  it('returns an explicit low-confidence cold-start taste profile', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn(() =>
          Promise.resolve({ id: 'user-1', deletedAt: null, recommendationOptIn: true }),
        ),
      },
      userPreferences: {
        findUnique: vi.fn(() =>
          Promise.resolve({
            preferredLanguages: ['en'],
            preferredDecades: [2020],
            preferredRuntimeMin: 80,
            preferredRuntimeMax: 150,
            mainstreamPreferencePercent: 50,
          }),
        ),
      },
      userGenrePreference: { findMany: vi.fn(() => Promise.resolve([])) },
      userFavoriteMedia: { findMany: vi.fn(() => Promise.resolve([])) },
      rating: { findMany: vi.fn(() => Promise.resolve([])) },
      watchHistory: { findMany: vi.fn(() => Promise.resolve([])) },
      recommendationFeedback: { findMany: vi.fn(() => Promise.resolve([])) },
    } as unknown as PrismaService;

    const result = await new RecommendationsService(prisma).tasteProfile(principal);

    expect(result).toMatchObject({
      confidence: 'LOW',
      topGenres: [],
      preferredLanguages: ['en'],
      modelVersion: 'deterministic-v1',
    });
  });

  it('enforces recommendation opt-out before reading behavioral signals', async () => {
    const findPreferences = vi.fn();
    const prisma = {
      user: {
        findUnique: vi.fn(() =>
          Promise.resolve({ id: 'user-1', deletedAt: null, recommendationOptIn: false }),
        ),
      },
      userPreferences: { findUnique: findPreferences },
    } as unknown as PrismaService;

    await expect(new RecommendationsService(prisma).tasteProfile(principal)).rejects.toMatchObject({
      code: 'RECOMMENDATIONS_DISABLED',
    });
    expect(findPreferences).not.toHaveBeenCalled();
  });

  it('does not allow feedback on another member’s recommendation', async () => {
    const transaction = vi.fn();
    const prisma = {
      user: {
        findUnique: vi.fn(() =>
          Promise.resolve({ id: 'user-1', deletedAt: null, recommendationOptIn: true }),
        ),
      },
      recommendation: { findFirst: vi.fn(() => Promise.resolve(null)) },
      $transaction: transaction,
    } as unknown as PrismaService;

    await expect(
      new RecommendationsService(prisma).feedback(
        principal,
        '4d54ff6c-3601-4fa5-8463-b2ad2e55da60',
        'SAVED',
      ),
    ).rejects.toMatchObject({ code: 'RECOMMENDATION_NOT_FOUND' });
    expect(transaction).not.toHaveBeenCalled();
  });
});
