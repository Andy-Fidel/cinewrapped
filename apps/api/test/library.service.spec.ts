import type { MediaTrackingState } from '@cinewrapped/shared-types';
import { describe, expect, it, vi } from 'vitest';

import type { AuthPrincipal } from '../src/auth/auth.types.js';
import type { PrismaService } from '../src/database/prisma.service.js';
import { LibraryService } from '../src/library/library.service.js';
import type { MediaProvider } from '../src/media-provider/media-provider.types.js';

const principal: AuthPrincipal = {
  subject: 'auth-user-1',
  email: 'viewer@example.test',
  sessionId: 'session-1',
  expiresAt: null,
  displayName: 'Viewer',
};
const user = { id: 'user-1', deletedAt: null };
const media = { id: 'media-1', mediaType: 'MOVIE' };

describe('LibraryService', () => {
  it('creates an initial personal-library status without accepting a forged user ID', async () => {
    const create = vi.fn(() => Promise.resolve({}));
    const prisma = {
      user: { findUnique: vi.fn(() => Promise.resolve(user)) },
      media: { findUnique: vi.fn(() => Promise.resolve(media)) },
      watchHistory: {
        findUnique: vi.fn(() => Promise.resolve(null)),
        create,
      },
    } as unknown as PrismaService;
    const service = new LibraryService(prisma, {} as MediaProvider);
    const expectedState = {
      library: { status: 'PLANNED', version: 1 },
      watchlists: [],
      rating: null,
      latestReview: null,
    } as unknown as MediaTrackingState;
    vi.spyOn(service, 'trackingState').mockResolvedValue(expectedState);

    await service.updateStatus(principal, 'media-1', { status: 'PLANNED' });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'user-1' }) }),
    );
  });

  it('rejects stale optimistic versions before changing watch history', async () => {
    const updateMany = vi.fn();
    const prisma = {
      user: { findUnique: vi.fn(() => Promise.resolve(user)) },
      media: { findUnique: vi.fn(() => Promise.resolve(media)) },
      watchHistory: {
        findUnique: vi.fn(() => Promise.resolve({ id: 'history-1', version: 3 })),
        updateMany,
      },
    } as unknown as PrismaService;

    await expect(
      new LibraryService(prisma, {} as MediaProvider).updateStatus(principal, 'media-1', {
        status: 'WATCHING',
        expectedVersion: 2,
      }),
    ).rejects.toMatchObject({ code: 'LIBRARY_VERSION_CONFLICT' });
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('returns an existing viewing for a repeated client operation ID', async () => {
    const duplicate = {
      id: 'viewing-1',
      mediaId: 'media-1',
      watchedAt: new Date('2026-08-02T12:00:00.000Z'),
      completedAt: new Date('2026-08-02T12:00:00.000Z'),
      durationWatchedMin: 120,
      viewingPlatform: null,
      notes: null,
      isRewatch: false,
      createdAt: new Date('2026-08-02T12:00:00.000Z'),
    };
    const transaction = vi.fn();
    const prisma = {
      user: { findUnique: vi.fn(() => Promise.resolve(user)) },
      media: { findUnique: vi.fn(() => Promise.resolve(media)) },
      viewing: { findUnique: vi.fn(() => Promise.resolve(duplicate)) },
      $transaction: transaction,
    } as unknown as PrismaService;

    const result = await new LibraryService(prisma, {} as MediaProvider).logViewing(
      principal,
      'media-1',
      {
        clientOperationId: '4d54ff6c-3601-4fa5-8463-b2ad2e55da60',
        watchedAt: '2026-08-02T12:00:00.000Z',
        completed: true,
      },
    );

    expect(result.id).toBe('viewing-1');
    expect(transaction).not.toHaveBeenCalled();
  });
});
