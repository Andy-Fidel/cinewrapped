import { describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '../src/database/prisma.service.js';
import { MediaCatalogService } from '../src/media-provider/media-catalog.service.js';
import type { MediaProvider } from '../src/media-provider/media-provider.types.js';

describe('MediaCatalogService', () => {
  it('persists normalized provider search results and applies API filters', async () => {
    const provider = {
      searchMedia: vi.fn(() =>
        Promise.resolve([
          {
            externalId: '100',
            mediaType: 'MOVIE' as const,
            title: 'Filtered Film',
            originalTitle: 'Filtered Film',
            overview: 'A normalized result.',
            releaseDate: '2025-02-01',
            releaseYear: 2025,
            originalLanguage: 'en',
            posterUrl: 'https://image.example/poster.jpg',
            backdropUrl: null,
            genreExternalIds: ['18'],
            providerPopularity: 10,
            averageProviderRating: 7.2,
          },
        ]),
      ),
    } as unknown as MediaProvider;
    const transaction = {
      genre: { findMany: vi.fn(() => Promise.resolve([{ id: 'genre-id' }])) },
      media: {
        upsert: vi.fn(() =>
          Promise.resolve({
            id: 'media-id',
            externalProvider: 'TMDB',
            externalId: '100',
            mediaType: 'MOVIE',
            title: 'Filtered Film',
            releaseYear: 2025,
            runtimeMinutes: null,
            posterUrl: 'https://image.example/poster.jpg',
            backdropUrl: null,
            overview: 'A normalized result.',
            averageProviderRating: 7.2,
            genres: [],
          }),
        ),
      },
      mediaGenre: {
        deleteMany: vi.fn(() => Promise.resolve({ count: 0 })),
        createMany: vi.fn(() => Promise.resolve({ count: 1 })),
      },
    };
    const prisma = {
      $transaction: (work: (client: typeof transaction) => Promise<unknown>) => work(transaction),
    } as unknown as PrismaService;

    const results = await new MediaCatalogService(prisma, provider).search(
      'filtered',
      'en-US',
      { mediaType: 'MOVIE', releaseYear: 2025, genreIds: ['genre-id'], limit: 10 },
      1,
    );

    expect(results).toEqual([
      expect.objectContaining({ id: 'media-id', genreIds: ['genre-id'], mediaType: 'MOVIE' }),
    ]);
    expect(transaction.mediaGenre.createMany).toHaveBeenCalledOnce();
  });

  it('does not request an external identifier for an unknown internal media ID', async () => {
    const prisma = {
      media: { findUnique: vi.fn(() => Promise.resolve(null)) },
    } as unknown as PrismaService;
    const getMediaDetails = vi.fn();
    const provider = { getMediaDetails } as unknown as MediaProvider;

    await expect(
      new MediaCatalogService(prisma, provider).details(
        '4d54ff6c-3601-4fa5-8463-b2ad2e55da60',
        'en-US',
        'GH',
      ),
    ).rejects.toMatchObject({ code: 'MEDIA_NOT_FOUND' });
    expect(getMediaDetails).not.toHaveBeenCalled();
  });
});
