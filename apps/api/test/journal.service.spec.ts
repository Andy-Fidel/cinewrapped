import type { AuthPrincipal } from '../src/auth/auth.types.js';
import type { ApiEnvironment } from '@cinewrapped/config';
import type { PrismaService } from '../src/database/prisma.service.js';
import type { FeatureFlagsService } from '../src/feature-flags/feature-flags.service.js';
import { JournalService } from '../src/journal/journal.service.js';
import { describe, expect, it, vi } from 'vitest';

const principal: AuthPrincipal = {
  subject: '10000000-0000-4000-8000-000000000000',
  email: 'viewer@example.test',
  sessionId: 'session-1',
  expiresAt: null,
  displayName: 'Viewer',
};
const user = { id: '20000000-0000-4000-8000-000000000000', authSubject: principal.subject };
const flags = { assertEnabled: vi.fn(() => Promise.resolve()) } as unknown as FeatureFlagsService;
const environment = {
  SUPABASE_URL: 'https://example.supabase.co',
} as ApiEnvironment;

function record() {
  return {
    id: '30000000-0000-4000-8000-000000000000',
    userId: user.id,
    mediaId: '40000000-0000-4000-8000-000000000000',
    viewingId: null,
    status: 'DRAFT' as const,
    title: null,
    notes: 'Private memory',
    viewingLocation: null,
    companionNames: [],
    memorableQuotes: [],
    moodBefore: null,
    moodAfter: null,
    watchedAt: null,
    version: 1,
    createdAt: new Date('2026-08-13T10:00:00.000Z'),
    updatedAt: new Date('2026-08-13T10:00:00.000Z'),
    deletedAt: null,
    attachments: [],
    media: {
      id: '40000000-0000-4000-8000-000000000000',
      externalProvider: 'TMDB' as const,
      externalId: '100',
      mediaType: 'MOVIE' as const,
      title: 'Private Film',
      releaseYear: 2026,
      runtimeMinutes: 110,
      posterUrl: null,
      backdropUrl: null,
      overview: null,
      averageProviderRating: null,
      genres: [],
    },
  };
}

describe('JournalService', () => {
  it('creates an owner-only draft without emitting feed activity', async () => {
    const create = vi.fn(() => Promise.resolve(record()));
    const prisma = {
      user: { findUnique: vi.fn(() => Promise.resolve(user)) },
      media: { count: vi.fn(() => Promise.resolve(1)) },
      journalEntry: { create },
      feedActivity: { create: vi.fn() },
    } as unknown as PrismaService;

    await new JournalService(prisma, flags, environment).create(principal, {
      mediaId: record().mediaId,
      status: 'DRAFT',
      companionNames: [],
      memorableQuotes: [],
      notes: 'Private memory',
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: user.id, status: 'DRAFT' }),
      }),
    );
    expect(
      (prisma as unknown as { feedActivity: { create: ReturnType<typeof vi.fn> } }).feedActivity
        .create,
    ).not.toHaveBeenCalled();
  });

  it('does not reveal another account journal entry', async () => {
    const prisma = {
      journalEntry: { findFirst: vi.fn(() => Promise.resolve(null)) },
    } as unknown as PrismaService;

    await expect(
      new JournalService(prisma, flags, environment).get(principal, record().id),
    ).rejects.toMatchObject({
      code: 'JOURNAL_ENTRY_NOT_FOUND',
    });
  });

  it('rejects an attachment path outside the authenticated Supabase folder', async () => {
    const prisma = {
      journalEntry: { findFirst: vi.fn(() => Promise.resolve(record())) },
      journalAttachment: { create: vi.fn() },
    } as unknown as PrismaService;

    await expect(
      new JournalService(prisma, flags, environment).addAttachment(principal, record().id, {
        attachmentType: 'PERSONAL_PHOTO',
        storagePath:
          '90000000-0000-4000-8000-000000000000/80000000-0000-4000-8000-000000000000.jpg',
        signedUrl:
          'https://example.supabase.co/storage/v1/object/sign/journal-attachments/file?token=1234567890123456',
        fileName: 'photo.jpg',
        mimeType: 'image/jpeg',
        byteSize: 1_024,
      }),
    ).rejects.toMatchObject({ code: 'STORAGE_PATH_FORBIDDEN' });
  });

  it('rejects an optimistic update when the version is stale', async () => {
    const prisma = {
      journalEntry: {
        findFirst: vi.fn(() => Promise.resolve(record())),
        updateMany: vi.fn(() => Promise.resolve({ count: 0 })),
      },
    } as unknown as PrismaService;

    await expect(
      new JournalService(prisma, flags, environment).update(principal, record().id, {
        expectedVersion: 1,
        notes: 'Changed elsewhere',
      }),
    ).rejects.toMatchObject({ code: 'JOURNAL_VERSION_CONFLICT' });
  });
});
