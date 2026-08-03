import { describe, expect, it, vi } from 'vitest';

import { AuthService } from '../src/auth/auth.service.js';
import type { AuthPrincipal } from '../src/auth/auth.types.js';
import type { PrismaService } from '../src/database/prisma.service.js';

const principal: AuthPrincipal = {
  subject: 'supabase-user-1',
  email: 'Movie.Lover@example.com',
  displayName: 'Movie Lover',
  sessionId: 'session-1',
  expiresAt: new Date('2026-09-01T00:00:00.000Z'),
};

describe('AuthService', () => {
  it('bootstraps the application profile and session in one transaction', async () => {
    const user = {
      id: 'user-1',
      username: 'user_placeholder',
      displayName: 'Movie Lover',
      avatarUrl: null,
      bio: null,
      countryCode: 'GH',
      preferredLanguage: 'en-GH',
      timezone: 'Africa/Accra',
      profileVisibility: 'PRIVATE',
      onboardingCompleted: false,
      recommendationOptIn: true,
      analyticsOptIn: false,
      version: 1,
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
      updatedAt: new Date('2026-08-01T00:00:00.000Z'),
    };
    const upsertUser = vi.fn(() => Promise.resolve(user));
    const upsertSession = vi.fn(() => Promise.resolve({}));
    const prisma = {
      $transaction: (work: (transaction: unknown) => Promise<unknown>) =>
        work({ user: { upsert: upsertUser }, authSession: { upsert: upsertSession } }),
    } as unknown as PrismaService;

    const result = await new AuthService(prisma).bootstrap(principal, {
      timezone: 'Africa/Accra',
      locale: 'en-GH',
      platform: 'IOS',
      installationId: 'install-1',
    });

    expect(result.countryCode).toBe('GH');
    expect(upsertUser).toHaveBeenCalledWith(
      expect.objectContaining({ where: { authSubject: principal.subject } }),
    );
    expect(upsertSession).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: principal.sessionId } }),
    );
  });
});
