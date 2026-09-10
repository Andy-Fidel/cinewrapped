import { describe, expect, it, vi } from 'vitest';

import type { AuthPrincipal } from '../src/auth/auth.types.js';
import type { PrismaService } from '../src/database/prisma.service.js';
import { SocialService } from '../src/social/social.service.js';

const principal: AuthPrincipal = {
  subject: 'auth-viewer',
  email: 'viewer@example.test',
  sessionId: 'session-1',
  expiresAt: null,
  displayName: 'Viewer',
  assuranceLevel: 'aal1',
};

const viewer = {
  id: '20000000-0000-4000-8000-000000000000',
  authSubject: principal.subject,
  username: 'viewer',
  usernameNormalized: 'viewer',
  displayName: 'Viewer',
  avatarUrl: null,
  bio: null,
  profileVisibility: 'PUBLIC',
  createdAt: new Date('2026-08-01T12:00:00.000Z'),
  deletedAt: null,
};

const friend = {
  ...viewer,
  id: '10000000-0000-4000-8000-000000000000',
  authSubject: 'auth-friend',
  username: 'friend',
  usernameNormalized: 'friend',
  displayName: 'Friend',
};

describe('SocialService', () => {
  it('stores a friend request under a canonical user pair', async () => {
    const upsert = vi.fn(() =>
      Promise.resolve({
        id: 'friendship-1',
        status: 'PENDING',
        addresseeId: friend.id,
        createdAt: new Date('2026-08-02T10:00:00.000Z'),
        updatedAt: new Date('2026-08-02T10:00:00.000Z'),
      }),
    );
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValueOnce(viewer).mockResolvedValueOnce(friend),
      },
      userBlock: { findFirst: vi.fn(() => Promise.resolve(null)) },
      friendship: { upsert },
    } as unknown as PrismaService;

    const result = await new SocialService(prisma).createFriendship(principal, friend.id);

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userAId_userBId: { userAId: friend.id, userBId: viewer.id } },
        create: expect.objectContaining({ requesterId: viewer.id, addresseeId: friend.id }),
      }),
    );
    expect(result.direction).toBe('OUTGOING');
  });

  it('rejects a friend request to the authenticated user', async () => {
    const upsert = vi.fn();
    const prisma = {
      user: { findUnique: vi.fn(() => Promise.resolve(viewer)) },
      friendship: { upsert },
    } as unknown as PrismaService;

    await expect(
      new SocialService(prisma).createFriendship(principal, viewer.id),
    ).rejects.toMatchObject({ code: 'SELF_RELATIONSHIP_INVALID' });
    expect(upsert).not.toHaveBeenCalled();
  });

  it('allows only the addressee to respond to a pending request', async () => {
    const update = vi.fn();
    const prisma = {
      user: { findUnique: vi.fn(() => Promise.resolve(viewer)) },
      friendship: {
        findFirst: vi.fn(() => Promise.resolve(null)),
        update,
      },
    } as unknown as PrismaService;

    await expect(
      new SocialService(prisma).respondFriendship(principal, 'friendship-1', 'ACCEPT'),
    ).rejects.toMatchObject({ code: 'FRIENDSHIP_NOT_FOUND' });
    expect(update).not.toHaveBeenCalled();
  });

  it('conceals a profile when either member has blocked the other', async () => {
    const count = vi.fn();
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValueOnce(viewer).mockResolvedValueOnce(friend),
      },
      userBlock: { findFirst: vi.fn(() => Promise.resolve({ blockerId: friend.id })) },
      follow: { count },
      friendship: { count },
      review: { count },
    } as unknown as PrismaService;

    await expect(
      new SocialService(prisma).profile(principal, friend.username),
    ).rejects.toMatchObject({ code: 'PROFILE_NOT_FOUND' });
    expect(count).not.toHaveBeenCalled();
  });

  it('checks target visibility before removing a reaction', async () => {
    const deleteMany = vi.fn();
    const prisma = {
      user: { findUnique: vi.fn(() => Promise.resolve(viewer)) },
      review: { findFirst: vi.fn(() => Promise.resolve(null)) },
      reaction: { deleteMany },
    } as unknown as PrismaService;

    await expect(
      new SocialService(prisma).deleteReaction(
        principal,
        'REVIEW',
        '30000000-0000-4000-8000-000000000000',
        'LIKE',
      ),
    ).rejects.toMatchObject({ code: 'SOCIAL_TARGET_NOT_FOUND' });
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it('retracts projected activity after its sharing toggle is disabled', async () => {
    const updateMany = vi.fn((input: unknown) => input);
    const transaction = vi.fn(() => Promise.resolve([]));
    const prisma = {
      user: { findUnique: vi.fn(() => Promise.resolve(viewer)) },
      follow: { findMany: vi.fn(() => Promise.resolve([])) },
      friendship: { findMany: vi.fn(() => Promise.resolve([])) },
      userBlock: { findMany: vi.fn(() => Promise.resolve([])) },
      userMute: { findMany: vi.fn(() => Promise.resolve([])) },
      privacySettings: {
        findMany: vi.fn(() =>
          Promise.resolve([
            {
              userId: viewer.id,
              watchHistoryVisibility: 'FRIENDS',
              ratingsVisibility: 'FRIENDS',
              reviewsVisibility: 'PUBLIC',
              listsVisibility: 'FRIENDS',
              shareWatchActivity: false,
              shareRatingActivity: false,
              shareReviewActivity: false,
              shareListActivity: false,
            },
          ]),
        ),
      },
      viewing: { findMany: vi.fn(() => Promise.resolve([])) },
      rating: { findMany: vi.fn(() => Promise.resolve([])) },
      review: { findMany: vi.fn(() => Promise.resolve([])) },
      watchlist: { findMany: vi.fn(() => Promise.resolve([])) },
      comment: { groupBy: vi.fn(() => Promise.resolve([])) },
      feedActivity: {
        updateMany,
        findMany: vi.fn(() => Promise.resolve([])),
      },
      $transaction: transaction,
    } as unknown as PrismaService;

    const result = await new SocialService(prisma).feed(principal, 20);

    expect(result.items).toEqual([]);
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          actorUserId: { in: [viewer.id] },
          activityType: 'USER_WATCHED_MEDIA',
        },
        data: { deletedAt: expect.any(Date) },
      }),
    );
    expect(transaction).toHaveBeenCalledOnce();
  });
});
