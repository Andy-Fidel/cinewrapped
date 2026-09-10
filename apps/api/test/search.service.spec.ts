import { unifiedSearchSchema } from '@cinewrapped/validation';
import { describe, expect, it, vi } from 'vitest';

import type { AuthPrincipal } from '../src/auth/auth.types.js';
import type { PrismaService } from '../src/database/prisma.service.js';
import type { MediaCatalogService } from '../src/media-provider/media-catalog.service.js';
import { SearchService } from '../src/search/search.service.js';

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
  deletedAt: null,
};

describe('SearchService', () => {
  it('combines catalog search with social filters and records private history', async () => {
    const findMedia = vi.fn(() =>
      Promise.resolve([
        {
          id: '30000000-0000-4000-8000-000000000000',
          externalProvider: 'TMDB',
          externalId: '329865',
          mediaType: 'MOVIE',
          title: 'Arrival',
          releaseYear: 2016,
          runtimeMinutes: 116,
          posterUrl: null,
          backdropUrl: null,
          overview: 'A linguist meets visitors.',
          averageProviderRating: 7.6,
          genres: [],
        },
      ]),
    );
    const upsertHistory = vi.fn(() => Promise.resolve({ id: 'history-1' }));
    const prisma = {
      user: { findUnique: vi.fn(() => Promise.resolve(viewer)) },
      friendship: {
        findMany: vi.fn(() =>
          Promise.resolve([
            {
              userAId: viewer.id,
              userBId: '40000000-0000-4000-8000-000000000000',
            },
          ]),
        ),
      },
      genre: { findMany: vi.fn(() => Promise.resolve([])) },
      streamingProvider: { findMany: vi.fn(() => Promise.resolve([])) },
      media: { findMany: findMedia },
      searchHistory: { upsert: upsertHistory },
    } as unknown as PrismaService;
    const catalog = {
      search: vi.fn(() =>
        Promise.resolve([
          {
            id: '30000000-0000-4000-8000-000000000000',
            provider: 'TMDB' as const,
            externalId: '329865',
            mediaType: 'MOVIE' as const,
            title: 'Arrival',
            releaseYear: 2016,
            runtimeMinutes: 116,
            posterUrl: null,
            backdropUrl: null,
            overview: 'A linguist meets visitors.',
            genreIds: [],
            averageProviderRating: 7.6,
          },
        ]),
      ),
    } as unknown as MediaCatalogService;
    const service = new SearchService(prisma, catalog);

    const result = await service.search(
      principal,
      unifiedSearchSchema.parse({
        q: 'Arrival',
        categories: 'MEDIA',
        friendsWatched: 'true',
        unwatchedOnly: 'true',
      }),
    );

    expect(result.media).toEqual([expect.objectContaining({ title: 'Arrival' })]);
    expect(findMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            {
              viewings: {
                some: {
                  userId: { in: ['40000000-0000-4000-8000-000000000000'] },
                  deletedAt: null,
                },
              },
            },
            { viewings: { none: { userId: viewer.id, deletedAt: null } } },
          ]),
        }),
      }),
    );
    expect(upsertHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_normalizedQuery: { userId: viewer.id, normalizedQuery: 'arrival' } },
      }),
    );
  });

  it('only exposes aggregated trending queries shared by multiple users', async () => {
    const prisma = {
      searchHistory: {
        findMany: vi.fn(() =>
          Promise.resolve([
            { normalizedQuery: 'arrival', query: 'Arrival', searchCount: 3, userId: 'user-1' },
            { normalizedQuery: 'arrival', query: 'Arrival', searchCount: 2, userId: 'user-2' },
            {
              normalizedQuery: 'private query',
              query: 'Private query',
              searchCount: 20,
              userId: 'user-1',
            },
          ]),
        ),
      },
    } as unknown as PrismaService;
    const service = new SearchService(prisma, {} as MediaCatalogService);

    await expect(service.trending()).resolves.toEqual([{ query: 'Arrival', searchCount: 5 }]);
  });
});
