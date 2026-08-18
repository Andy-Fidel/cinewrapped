import type { ApiEnvironment } from '@cinewrapped/config';
import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';

import { CacheService } from '../cache/cache.service.js';
import { AppException } from '../common/app.exception.js';
import { API_ENVIRONMENT } from '../config/environment.module.js';
import type {
  MediaProvider,
  ProviderCreditSummary,
  ProviderDiscoveryFilters,
  ProviderMediaDetails,
  ProviderMediaSummary,
  ProviderPersonSummary,
  ProviderEpisodeSummary,
  ProviderStreamingAvailability,
} from './media-provider.types.js';

const mediaResultSchema = z.object({
  id: z.number().int().positive(),
  media_type: z.enum(['movie', 'tv', 'person']),
  title: z.string().optional(),
  name: z.string().optional(),
  original_title: z.string().optional(),
  original_name: z.string().optional(),
  overview: z.string().optional(),
  release_date: z.string().optional(),
  first_air_date: z.string().optional(),
  original_language: z.string().optional(),
  poster_path: z.string().nullable().optional(),
  backdrop_path: z.string().nullable().optional(),
  genre_ids: z.array(z.number().int()).default([]),
  popularity: z.number().optional(),
  vote_average: z.number().optional(),
});

const mediaListSchema = z.object({ results: z.array(mediaResultSchema) });
const personSearchSchema = z.object({
  results: z.array(
    z.object({
      id: z.number().int().positive(),
      name: z.string(),
      profile_path: z.string().nullable().optional(),
      known_for: z.array(mediaResultSchema).default([]),
    }),
  ),
});
const personSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  profile_path: z.string().nullable().optional(),
});
const castSchema = personSchema.extend({
  character: z.string().optional(),
  order: z.number().int().optional(),
});
const crewSchema = personSchema.extend({
  department: z.string().optional(),
  job: z.string().optional(),
});
const detailsSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().optional(),
  name: z.string().optional(),
  original_title: z.string().optional(),
  original_name: z.string().optional(),
  overview: z.string().optional(),
  release_date: z.string().optional(),
  first_air_date: z.string().optional(),
  runtime: z.number().int().positive().nullable().optional(),
  episode_run_time: z.array(z.number().int().positive()).default([]),
  original_language: z.string().optional(),
  origin_country: z.array(z.string()).default([]),
  production_countries: z.array(z.object({ iso_3166_1: z.string() })).default([]),
  poster_path: z.string().nullable().optional(),
  backdrop_path: z.string().nullable().optional(),
  genres: z.array(z.object({ id: z.number().int(), name: z.string() })).default([]),
  popularity: z.number().optional(),
  vote_average: z.number().optional(),
  status: z.string().optional(),
  credits: z.object({
    cast: z.array(castSchema).default([]),
    crew: z.array(crewSchema).default([]),
  }),
  videos: z.object({
    results: z
      .array(
        z.object({
          key: z.string(),
          site: z.string(),
          type: z.string(),
          official: z.boolean().optional(),
        }),
      )
      .default([]),
  }),
  release_dates: z
    .object({
      results: z
        .array(
          z.object({
            iso_3166_1: z.string(),
            release_dates: z.array(z.object({ certification: z.string().default('') })),
          }),
        )
        .default([]),
    })
    .optional(),
  content_ratings: z
    .object({
      results: z
        .array(z.object({ iso_3166_1: z.string(), rating: z.string().default('') }))
        .default([]),
    })
    .optional(),
  seasons: z
    .array(
      z.object({
        id: z.number().int().positive(),
        season_number: z.number().int(),
        name: z.string(),
        overview: z.string().optional(),
        air_date: z.string().nullable().optional(),
        episode_count: z.number().int().nonnegative().optional(),
        poster_path: z.string().nullable().optional(),
      }),
    )
    .default([]),
});

const watchProviderSchema = z.object({
  results: z.record(
    z.string(),
    z.object({
      link: z.string().url().optional(),
      flatrate: z
        .array(
          z.object({
            provider_id: z.number().int(),
            provider_name: z.string(),
            logo_path: z.string().nullable().optional(),
            display_priority: z.number().int().optional(),
          }),
        )
        .default([]),
      free: z
        .array(
          z.object({
            provider_id: z.number().int(),
            provider_name: z.string(),
            logo_path: z.string().nullable().optional(),
            display_priority: z.number().int().optional(),
          }),
        )
        .default([]),
      ads: z
        .array(
          z.object({
            provider_id: z.number().int(),
            provider_name: z.string(),
            logo_path: z.string().nullable().optional(),
            display_priority: z.number().int().optional(),
          }),
        )
        .default([]),
      rent: z
        .array(
          z.object({
            provider_id: z.number().int(),
            provider_name: z.string(),
            logo_path: z.string().nullable().optional(),
            display_priority: z.number().int().optional(),
          }),
        )
        .default([]),
      buy: z
        .array(
          z.object({
            provider_id: z.number().int(),
            provider_name: z.string(),
            logo_path: z.string().nullable().optional(),
            display_priority: z.number().int().optional(),
          }),
        )
        .default([]),
    }),
  ),
});

const seasonDetailsSchema = z.object({
  episodes: z
    .array(
      z.object({
        id: z.number().int().positive(),
        episode_number: z.number().int().nonnegative(),
        name: z.string(),
        overview: z.string().optional(),
        air_date: z.string().nullable().optional(),
        runtime: z.number().int().positive().nullable().optional(),
        still_path: z.string().nullable().optional(),
      }),
    )
    .default([]),
});

function imageUrl(path: string | null | undefined, size: 'w185' | 'w500' | 'w780'): string | null {
  return path == null ? null : `https://image.tmdb.org/t/p/${size}${path}`;
}

function dateValue(value: string | null | undefined): string | null {
  if (value == null || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return null;
  return value;
}

function yearValue(value: string | null): number | null {
  return value === null ? null : Number(value.slice(0, 4));
}

function normalizeSummary(item: z.infer<typeof mediaResultSchema>): ProviderMediaSummary | null {
  if (item.media_type === 'person') return null;
  const isMovie = item.media_type === 'movie';
  const releaseDate = dateValue(isMovie ? item.release_date : item.first_air_date);
  return {
    externalId: String(item.id),
    mediaType: isMovie ? 'MOVIE' : 'TV',
    title: (isMovie ? item.title : item.name) ?? 'Untitled',
    originalTitle:
      (isMovie ? item.original_title : item.original_name) ??
      (isMovie ? item.title : item.name) ??
      'Untitled',
    overview: item.overview?.trim() || null,
    releaseDate,
    releaseYear: yearValue(releaseDate),
    originalLanguage: item.original_language ?? null,
    posterUrl: imageUrl(item.poster_path, 'w500'),
    backdropUrl: imageUrl(item.backdrop_path, 'w780'),
    genreExternalIds: item.genre_ids.map(String),
    providerPopularity: item.popularity ?? null,
    averageProviderRating: item.vote_average ?? null,
  };
}

@Injectable()
export class TmdbMediaProvider implements MediaProvider {
  public constructor(
    @Inject(API_ENVIRONMENT) private readonly environment: ApiEnvironment,
    private readonly cache: CacheService,
  ) {}

  public async searchMedia(
    query: string,
    language: string,
    page = 1,
  ): Promise<ProviderMediaSummary[]> {
    const key = `tmdb:search:${language}:${page}:${query.trim().toLowerCase()}`;
    return this.cache.remember(key, 300, async () => {
      const data = await this.request(
        '/search/multi',
        { query, language, include_adult: 'false', page: String(page) },
        mediaListSchema,
      );
      return data.results
        .map(normalizeSummary)
        .filter((item): item is ProviderMediaSummary => item !== null)
        .slice(0, 20);
    });
  }

  public async searchPeople(
    query: string,
    language: string,
    page = 1,
  ): Promise<ProviderPersonSummary[]> {
    const key = `tmdb:people:${language}:${page}:${query.trim().toLowerCase()}`;
    return this.cache.remember(key, 300, async () => {
      const data = await this.request(
        '/search/person',
        { query, language, include_adult: 'false', page: String(page) },
        personSearchSchema,
      );
      return data.results.slice(0, 20).map((person) => ({
        externalId: String(person.id),
        name: person.name,
        profileUrl: imageUrl(person.profile_path, 'w185'),
        knownFor: person.known_for
          .map(normalizeSummary)
          .filter((item): item is ProviderMediaSummary => item !== null)
          .slice(0, 3),
      }));
    });
  }

  public async getTrending(
    window: 'DAY' | 'WEEK',
    mediaType: 'MOVIE' | 'TV' | undefined,
    language: string,
    page = 1,
  ): Promise<ProviderMediaSummary[]> {
    const key = `tmdb:trending:${window}:${mediaType ?? 'ALL'}:${language}:${page}`;
    return this.cache.remember(key, 600, async () => {
      const data = await this.request(
        `/trending/all/${window.toLowerCase()}`,
        { language, page: String(page) },
        mediaListSchema,
      );
      return data.results
        .map(normalizeSummary)
        .filter(
          (item): item is ProviderMediaSummary =>
            item !== null && (mediaType === undefined || item.mediaType === mediaType),
        )
        .slice(0, 20);
    });
  }

  public async discoverMedia(
    filters: ProviderDiscoveryFilters,
    language: string,
    page = 1,
  ): Promise<ProviderMediaSummary[]> {
    const parameters: Record<string, string> = {
      language,
      include_adult: 'false',
      include_video: 'false',
      page: String(page),
      sort_by: filters.maximumPopularity === undefined ? 'popularity.desc' : 'vote_average.desc',
      'vote_count.gte': '25',
    };
    if (filters.genreExternalIds.length > 0) {
      parameters.with_genres = filters.genreExternalIds.join(',');
    }
    if (filters.originalLanguage !== undefined) {
      parameters.with_original_language = filters.originalLanguage;
    }
    if (filters.productionCountry !== undefined) {
      parameters.with_origin_country = filters.productionCountry;
    }
    if (filters.releaseYearMinimum !== undefined) {
      parameters[
        filters.mediaType === 'MOVIE' ? 'primary_release_date.gte' : 'first_air_date.gte'
      ] = `${filters.releaseYearMinimum}-01-01`;
    }
    if (filters.releaseYearMaximum !== undefined) {
      parameters[
        filters.mediaType === 'MOVIE' ? 'primary_release_date.lte' : 'first_air_date.lte'
      ] = `${filters.releaseYearMaximum}-12-31`;
    }
    if (filters.runtimeMaximum !== undefined) {
      parameters['with_runtime.lte'] = String(filters.runtimeMaximum);
    }
    if (filters.runtimeMinimum !== undefined) {
      parameters['with_runtime.gte'] = String(filters.runtimeMinimum);
    }
    if (filters.minimumRating !== undefined) {
      parameters['vote_average.gte'] = String(filters.minimumRating);
    }
    if (filters.maximumPopularity !== undefined) {
      parameters['popularity.lte'] = String(filters.maximumPopularity);
    }
    if (filters.minimumPopularity !== undefined) {
      parameters['popularity.gte'] = String(filters.minimumPopularity);
    }
    if (filters.watchRegion !== undefined) parameters.watch_region = filters.watchRegion;
    if (filters.watchProviderExternalIds?.length) {
      parameters.with_watch_providers = filters.watchProviderExternalIds.join('|');
      parameters.with_watch_monetization_types = 'flatrate|free|ads';
    }
    const cacheKey = `tmdb:discover:${filters.mediaType}:${language}:${page}:${JSON.stringify(parameters)}`;
    return this.cache.remember(cacheKey, 600, async () => {
      const kind = filters.mediaType === 'MOVIE' ? 'movie' : 'tv';
      const data = await this.request(`/discover/${kind}`, parameters, mediaListSchema);
      return data.results
        .map((result) =>
          normalizeSummary({
            ...result,
            media_type: filters.mediaType === 'MOVIE' ? ('movie' as const) : ('tv' as const),
          }),
        )
        .filter((item): item is ProviderMediaSummary => item !== null)
        .slice(0, 20);
    });
  }

  public async getMediaDetails(
    externalId: string,
    mediaType: 'MOVIE' | 'TV',
    language: string,
    countryCode: string,
  ): Promise<ProviderMediaDetails> {
    const key = `tmdb:details:${mediaType}:${externalId}:${language}:${countryCode}`;
    return this.cache.remember(key, 21_600, async () => {
      const kind = mediaType === 'MOVIE' ? 'movie' : 'tv';
      const data = await this.request(
        `/${kind}/${encodeURIComponent(externalId)}`,
        {
          language,
          append_to_response:
            mediaType === 'MOVIE'
              ? 'credits,videos,release_dates'
              : 'credits,videos,content_ratings',
        },
        detailsSchema,
      );
      const isMovie = mediaType === 'MOVIE';
      const releaseDate = dateValue(isMovie ? data.release_date : data.first_air_date);
      const trailer =
        data.videos.results.find(
          (video) =>
            video.site === 'YouTube' && video.type === 'Trailer' && video.official === true,
        ) ??
        data.videos.results.find((video) => video.site === 'YouTube' && video.type === 'Trailer');
      const countryCodes = isMovie
        ? data.production_countries.map((country) => country.iso_3166_1)
        : data.origin_country;
      const movieRatings =
        data.release_dates?.results.find((entry) => entry.iso_3166_1 === countryCode) ??
        data.release_dates?.results.find((entry) => entry.iso_3166_1 === 'US');
      const tvRating =
        data.content_ratings?.results.find((entry) => entry.iso_3166_1 === countryCode) ??
        data.content_ratings?.results.find((entry) => entry.iso_3166_1 === 'US');
      const credits: ProviderCreditSummary[] = [
        ...data.credits.cast.slice(0, 30).map((credit) => ({
          externalId: String(credit.id),
          name: credit.name,
          profileUrl: imageUrl(credit.profile_path, 'w185'),
          creditType: 'CAST' as const,
          department: null,
          job: null,
          character: credit.character ?? null,
          position: credit.order ?? null,
        })),
        ...data.credits.crew
          .filter((credit) =>
            ['Director', 'Writer', 'Screenplay', 'Creator', 'Executive Producer'].includes(
              credit.job ?? '',
            ),
          )
          .slice(0, 30)
          .map((credit, position) => ({
            externalId: String(credit.id),
            name: credit.name,
            profileUrl: imageUrl(credit.profile_path, 'w185'),
            creditType: 'CREW' as const,
            department: credit.department ?? null,
            job: credit.job ?? null,
            character: null,
            position,
          })),
      ];
      return {
        externalId: String(data.id),
        mediaType,
        title: (isMovie ? data.title : data.name) ?? 'Untitled',
        originalTitle:
          (isMovie ? data.original_title : data.original_name) ??
          (isMovie ? data.title : data.name) ??
          'Untitled',
        overview: data.overview?.trim() || null,
        releaseDate,
        releaseYear: yearValue(releaseDate),
        runtimeMinutes: isMovie ? (data.runtime ?? null) : (data.episode_run_time[0] ?? null),
        originalLanguage: data.original_language ?? null,
        countryCodes,
        posterUrl: imageUrl(data.poster_path, 'w500'),
        backdropUrl: imageUrl(data.backdrop_path, 'w780'),
        genreExternalIds: data.genres.map((genre) => String(genre.id)),
        providerPopularity: data.popularity ?? null,
        averageProviderRating: data.vote_average ?? null,
        trailerUrl:
          trailer === undefined
            ? null
            : `https://www.youtube.com/watch?v=${encodeURIComponent(trailer.key)}`,
        status: data.status ?? 'Unknown',
        ageRating: isMovie
          ? (movieRatings?.release_dates.find((rating) => rating.certification.length > 0)
              ?.certification ?? null)
          : tvRating?.rating || null,
        credits,
        seasons: data.seasons
          .filter((season) => season.season_number >= 0)
          .map((season) => ({
            externalId: String(season.id),
            seasonNumber: season.season_number,
            name: season.name,
            overview: season.overview?.trim() || null,
            airDate: dateValue(season.air_date),
            episodeCount: season.episode_count ?? null,
            posterUrl: imageUrl(season.poster_path, 'w500'),
          })),
        metadata: { provider: 'TMDB', genreNames: data.genres.map((genre) => genre.name) },
      };
    });
  }

  public async getStreamingAvailability(
    externalId: string,
    mediaType: 'MOVIE' | 'TV',
    countryCode: string,
  ): Promise<ProviderStreamingAvailability> {
    const country = countryCode.toUpperCase();
    const key = `tmdb:availability:${mediaType}:${externalId}:${country}`;
    return this.cache.remember(key, 3_600, async () => {
      const kind = mediaType === 'MOVIE' ? 'movie' : 'tv';
      const data = await this.request(
        `/${kind}/${encodeURIComponent(externalId)}/watch/providers`,
        {},
        watchProviderSchema,
      );
      const region = data.results[country];
      if (region === undefined) return { countryCode: country, providerUrl: null, items: [] };
      const groups = [
        ['flatrate', 'FLATRATE'],
        ['free', 'FREE'],
        ['ads', 'ADS'],
        ['rent', 'RENT'],
        ['buy', 'BUY'],
      ] as const;
      return {
        countryCode: country,
        providerUrl: region.link ?? null,
        items: groups.flatMap(([field, monetizationType]) =>
          region[field].map((provider) => ({
            externalProviderId: String(provider.provider_id),
            name: provider.provider_name,
            logoUrl: imageUrl(provider.logo_path, 'w185'),
            monetizationType,
            displayPriority: provider.display_priority ?? null,
          })),
        ),
      };
    });
  }

  public async getSeasonEpisodes(
    externalId: string,
    seasonNumber: number,
    language: string,
  ): Promise<ProviderEpisodeSummary[]> {
    const key = `tmdb:season:${externalId}:${seasonNumber}:${language}`;
    return this.cache.remember(key, 21_600, async () => {
      const data = await this.request(
        `/tv/${encodeURIComponent(externalId)}/season/${seasonNumber}`,
        { language },
        seasonDetailsSchema,
      );
      return data.episodes.map((episode) => ({
        externalId: String(episode.id),
        episodeNumber: episode.episode_number,
        name: episode.name,
        overview: episode.overview?.trim() || null,
        airDate: dateValue(episode.air_date),
        runtimeMinutes: episode.runtime ?? null,
        stillUrl: imageUrl(episode.still_path, 'w500'),
      }));
    });
  }

  private async request<T>(
    path: string,
    parameters: Record<string, string>,
    schema: z.ZodType<T>,
  ): Promise<T> {
    const url = new URL(`https://api.themoviedb.org/3${path}`);
    for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value);
    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${this.environment.TMDB_API_TOKEN}`,
        },
        signal: AbortSignal.timeout(5_000),
      });
    } catch {
      throw new AppException(
        502,
        'MEDIA_PROVIDER_UNAVAILABLE',
        'The media provider is unavailable.',
      );
    }
    if (!response.ok)
      throw new AppException(
        response.status === 404 ? 404 : 502,
        response.status === 404 ? 'MEDIA_NOT_FOUND' : 'MEDIA_PROVIDER_UNAVAILABLE',
        response.status === 404
          ? 'The requested media was not found.'
          : 'The media provider is unavailable.',
      );
    const parsed = schema.safeParse(await response.json());
    if (!parsed.success)
      throw new AppException(
        502,
        'MEDIA_PROVIDER_INVALID_RESPONSE',
        'The media provider returned invalid data.',
      );
    return parsed.data;
  }
}
