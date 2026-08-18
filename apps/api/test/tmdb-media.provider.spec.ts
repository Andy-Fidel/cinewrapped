import type { ApiEnvironment } from '@cinewrapped/config';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TmdbMediaProvider } from '../src/media-provider/tmdb-media.provider.js';
import type { CacheService } from '../src/cache/cache.service.js';

const environment = { TMDB_API_TOKEN: 'test-token-that-is-long-enough' } as ApiEnvironment;
const cache = {
  remember: async <T>(_key: string, _ttl: number, load: () => Promise<T>) => load(),
} as CacheService;

describe('TmdbMediaProvider', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('normalizes movie and television results while excluding people', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              results: [
                {
                  id: 1,
                  media_type: 'movie',
                  title: 'Arrival',
                  original_title: 'Arrival',
                  release_date: '2016-11-11',
                  genre_ids: [18],
                  poster_path: '/arrival.jpg',
                  popularity: 42,
                  vote_average: 8,
                },
                {
                  id: 2,
                  media_type: 'tv',
                  name: 'Severance',
                  original_name: 'Severance',
                  first_air_date: '2022-02-18',
                  genre_ids: [18],
                },
                { id: 3, media_type: 'person', name: 'Performer', genre_ids: [] },
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
        ),
      ),
    );

    const result = await new TmdbMediaProvider(environment, cache).searchMedia('arrival', 'en-US');

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      externalId: '1',
      mediaType: 'MOVIE',
      releaseYear: 2016,
      posterUrl: 'https://image.tmdb.org/t/p/w500/arrival.jpg',
    });
    expect(result[1]).toMatchObject({ externalId: '2', mediaType: 'TV', releaseYear: 2022 });
  });

  it('fails closed when the provider response is malformed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(new Response(JSON.stringify({ results: 'invalid' }), { status: 200 })),
      ),
    );
    await expect(
      new TmdbMediaProvider(environment, cache).searchMedia('arrival', 'en-US'),
    ).rejects.toMatchObject({ code: 'MEDIA_PROVIDER_INVALID_RESPONSE' });
  });

  it('searches people and preserves their known movie and TV credits', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              results: [
                {
                  id: 10,
                  name: 'Amy Adams',
                  profile_path: '/amy.jpg',
                  known_for: [
                    {
                      id: 329865,
                      media_type: 'movie',
                      title: 'Arrival',
                      release_date: '2016-11-11',
                      genre_ids: [18],
                    },
                  ],
                },
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
        ),
      ),
    );

    const result = await new TmdbMediaProvider(environment, cache).searchPeople(
      'Amy Adams',
      'en-US',
    );

    expect(result[0]).toMatchObject({
      externalId: '10',
      name: 'Amy Adams',
      profileUrl: 'https://image.tmdb.org/t/p/w185/amy.jpg',
      knownFor: [expect.objectContaining({ title: 'Arrival', mediaType: 'MOVIE' })],
    });
  });

  it('normalizes details, credits, trailers, seasons, and country ratings', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              id: 10,
              name: 'Example Show',
              original_name: 'Example Show',
              overview: 'A carefully normalized show.',
              first_air_date: '2024-01-05',
              episode_run_time: [52],
              original_language: 'en',
              origin_country: ['GH'],
              genres: [{ id: 18, name: 'Drama' }],
              popularity: 20,
              vote_average: 7.5,
              status: 'Returning Series',
              credits: {
                cast: [{ id: 11, name: 'Lead Actor', character: 'Ama', order: 0 }],
                crew: [{ id: 12, name: 'Show Creator', department: 'Writing', job: 'Creator' }],
              },
              videos: {
                results: [{ key: 'trailer-key', site: 'YouTube', type: 'Trailer', official: true }],
              },
              content_ratings: { results: [{ iso_3166_1: 'GH', rating: '16' }] },
              seasons: [
                {
                  id: 13,
                  season_number: 1,
                  name: 'Season 1',
                  air_date: '2024-01-05',
                  episode_count: 8,
                },
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
        ),
      ),
    );

    const result = await new TmdbMediaProvider(environment, cache).getMediaDetails(
      '10',
      'TV',
      'en-GH',
      'GH',
    );

    expect(result).toMatchObject({
      mediaType: 'TV',
      runtimeMinutes: 52,
      ageRating: '16',
      trailerUrl: 'https://www.youtube.com/watch?v=trailer-key',
      countryCodes: ['GH'],
    });
    expect(result.credits).toHaveLength(2);
    expect(result.seasons[0]).toMatchObject({ seasonNumber: 1, episodeCount: 8 });
  });

  it('normalizes country-specific streaming monetization groups', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              results: {
                GH: {
                  link: 'https://example.test/watch',
                  flatrate: [
                    {
                      provider_id: 8,
                      provider_name: 'Netflix',
                      logo_path: '/netflix.jpg',
                      display_priority: 1,
                    },
                  ],
                  rent: [{ provider_id: 3, provider_name: 'Rental Store', display_priority: 5 }],
                },
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
        ),
      ),
    );

    const result = await new TmdbMediaProvider(environment, cache).getStreamingAvailability(
      '10',
      'MOVIE',
      'GH',
    );

    expect(result.providerUrl).toBe('https://example.test/watch');
    expect(result.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Netflix', monetizationType: 'FLATRATE' }),
        expect.objectContaining({ name: 'Rental Store', monetizationType: 'RENT' }),
      ]),
    );
  });

  it('normalizes television season episodes for progress tracking', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              episodes: [
                {
                  id: 101,
                  episode_number: 1,
                  name: 'The Beginning',
                  overview: 'A first episode.',
                  air_date: '2026-01-10',
                  runtime: 48,
                  still_path: '/episode.jpg',
                },
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
        ),
      ),
    );

    const result = await new TmdbMediaProvider(environment, cache).getSeasonEpisodes(
      '10',
      1,
      'en-GH',
    );

    expect(result).toEqual([
      expect.objectContaining({
        externalId: '101',
        episodeNumber: 1,
        runtimeMinutes: 48,
        stillUrl: 'https://image.tmdb.org/t/p/w500/episode.jpg',
      }),
    ]);
  });
});
