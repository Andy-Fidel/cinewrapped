import { Prisma } from '@cinewrapped/database';
import type {
  CreditSummary,
  GenreSummary,
  MediaDetails,
  MediaSummary,
  StreamingAvailability,
  StreamingProviderSummary,
} from '@cinewrapped/shared-types';
import { Inject, Injectable } from '@nestjs/common';

import { AppException } from '../common/app.exception.js';
import { PrismaService } from '../database/prisma.service.js';
import {
  MEDIA_PROVIDER,
  type MediaProvider,
  type ProviderMediaDetails,
  type ProviderMediaSummary,
} from './media-provider.types.js';

type MediaWithGenres = Prisma.MediaGetPayload<{ include: { genres: true } }>;
type DetailsPayload = Prisma.MediaGetPayload<{
  include: {
    genres: { include: { genre: true } };
    credits: { include: { person: true } };
    seasons: true;
  };
}>;

export interface MediaSearchFilters {
  mediaType?: 'MOVIE' | 'TV';
  releaseYear?: number;
  genreIds?: string[];
  limit: number;
}

function dateFromProvider(value: string | null): Date | null {
  return value === null ? null : new Date(`${value}T00:00:00.000Z`);
}

function providerStatus(
  value: string,
):
  | 'RUMORED'
  | 'PLANNED'
  | 'IN_PRODUCTION'
  | 'POST_PRODUCTION'
  | 'RELEASED'
  | 'RETURNING_SERIES'
  | 'ENDED'
  | 'CANCELED'
  | 'UNKNOWN' {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'rumored') return 'RUMORED';
  if (normalized === 'planned' || normalized === 'pilot') return 'PLANNED';
  if (normalized === 'in production') return 'IN_PRODUCTION';
  if (normalized === 'post production') return 'POST_PRODUCTION';
  if (normalized === 'released') return 'RELEASED';
  if (normalized === 'returning series') return 'RETURNING_SERIES';
  if (normalized === 'ended') return 'ENDED';
  if (normalized === 'canceled' || normalized === 'cancelled') return 'CANCELED';
  return 'UNKNOWN';
}

function mediaSummary(media: MediaWithGenres): MediaSummary {
  return {
    id: media.id,
    provider: 'TMDB',
    externalId: media.externalId,
    mediaType: media.mediaType,
    title: media.title,
    releaseYear: media.releaseYear,
    runtimeMinutes: media.runtimeMinutes,
    posterUrl: media.posterUrl,
    backdropUrl: media.backdropUrl,
    overview: media.overview,
    genreIds: media.genres.map(({ genreId }) => genreId),
    averageProviderRating:
      media.averageProviderRating === null ? null : Number(media.averageProviderRating),
  };
}

function creditSummary(credit: DetailsPayload['credits'][number]): CreditSummary {
  return {
    id: credit.id,
    personId: credit.personId,
    name: credit.person.name,
    profileUrl: credit.person.profileUrl,
    creditType: credit.creditType,
    department: credit.department,
    job: credit.job,
    character: credit.character,
    position: credit.position,
  };
}

@Injectable()
export class MediaCatalogService {
  public constructor(
    private readonly prisma: PrismaService,
    @Inject(MEDIA_PROVIDER) private readonly provider: MediaProvider,
  ) {}

  public async genres(): Promise<GenreSummary[]> {
    return this.prisma.genre.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    });
  }

  public async streamingProviders(): Promise<StreamingProviderSummary[]> {
    return this.prisma.streamingProvider.findMany({
      select: { id: true, name: true, slug: true, logoUrl: true },
      orderBy: [{ displayPriority: 'asc' }, { name: 'asc' }],
    });
  }

  public async search(
    query: string,
    language: string,
    filters: MediaSearchFilters,
    page: number,
  ): Promise<MediaSummary[]> {
    const media = await this.persistSummaries(
      await this.provider.searchMedia(query, language, page),
    );
    return media
      .filter((item) => filters.mediaType === undefined || item.mediaType === filters.mediaType)
      .filter(
        (item) => filters.releaseYear === undefined || item.releaseYear === filters.releaseYear,
      )
      .filter(
        (item) =>
          filters.genreIds === undefined ||
          filters.genreIds.every((genreId) => item.genreIds.includes(genreId)),
      )
      .slice(0, filters.limit);
  }

  public async trending(
    window: 'DAY' | 'WEEK',
    mediaType: 'MOVIE' | 'TV' | undefined,
    language: string,
    limit: number,
    page: number,
  ): Promise<MediaSummary[]> {
    const media = await this.persistSummaries(
      await this.provider.getTrending(window, mediaType, language, page),
    );
    return media.slice(0, limit);
  }

  public async details(
    mediaId: string,
    language: string,
    countryCode: string,
  ): Promise<MediaDetails> {
    const existing = await this.prisma.media.findUnique({
      where: { id: mediaId },
      include: { _count: { select: { credits: true } } },
    });
    if (existing === null) {
      throw new AppException(404, 'MEDIA_NOT_FOUND', 'The requested media was not found.');
    }
    const staleBefore = Date.now() - 6 * 60 * 60 * 1000;
    if (
      existing.lastSyncedAt === null ||
      existing.lastSyncedAt.getTime() < staleBefore ||
      existing._count.credits === 0
    ) {
      const providerDetails = await this.provider.getMediaDetails(
        existing.externalId,
        existing.mediaType,
        language,
        countryCode,
      );
      await this.persistDetails(existing.id, providerDetails);
    }
    const media = await this.prisma.media.findUniqueOrThrow({
      where: { id: mediaId },
      include: {
        genres: { include: { genre: true } },
        credits: { include: { person: true }, orderBy: { position: 'asc' } },
        seasons: { orderBy: { seasonNumber: 'asc' } },
      },
    });
    const availability = await this.streamingAvailability(mediaId, countryCode);
    const cast = media.credits.filter((credit) => credit.creditType === 'CAST').map(creditSummary);
    const crew = media.credits.filter((credit) => credit.creditType === 'CREW').map(creditSummary);
    return {
      ...mediaSummary({ ...media, genres: media.genres }),
      originalTitle: media.originalTitle,
      releaseDate: media.releaseDate?.toISOString().slice(0, 10) ?? null,
      originalLanguage: media.originalLanguage,
      countryCodes: media.countryCodes,
      trailerUrl: media.trailerUrl,
      status: media.status,
      ageRating: media.ageRating,
      genres: media.genres.map(({ genre }) => ({
        id: genre.id,
        name: genre.name,
        slug: genre.slug,
      })),
      cast: cast.slice(0, 20),
      crew: crew.slice(0, 20),
      seasons: media.seasons.map((season) => ({
        id: season.id,
        seasonNumber: season.seasonNumber,
        name: season.name,
        overview: season.overview,
        airDate: season.airDate?.toISOString().slice(0, 10) ?? null,
        episodeCount: season.episodeCount,
        posterUrl: season.posterUrl,
      })),
      streamingAvailability: availability,
      lastSyncedAt: media.lastSyncedAt?.toISOString() ?? null,
    };
  }

  public async credits(
    mediaId: string,
    type: 'CAST' | 'CREW' | undefined,
    language: string,
    countryCode: string,
  ): Promise<CreditSummary[]> {
    const media = await this.details(mediaId, language, countryCode);
    if (type === 'CAST') return media.cast;
    if (type === 'CREW') return media.crew;
    return [...media.cast, ...media.crew];
  }

  public async streamingAvailability(
    mediaId: string,
    countryCode: string,
  ): Promise<StreamingAvailability> {
    const country = countryCode.toUpperCase();
    const media = await this.prisma.media.findUnique({ where: { id: mediaId } });
    if (media === null) {
      throw new AppException(404, 'MEDIA_NOT_FOUND', 'The requested media was not found.');
    }
    let rows = await this.prisma.mediaStreamingAvailability.findMany({
      where: { mediaId, countryCode: country, expiresAt: { gt: new Date() } },
      include: { streamingProvider: true },
      orderBy: { displayPriority: 'asc' },
    });
    if (rows.length === 0) {
      const providerAvailability = await this.provider.getStreamingAvailability(
        media.externalId,
        media.mediaType,
        country,
      );
      const fetchedAt = new Date();
      const expiresAt = new Date(fetchedAt.getTime() + 60 * 60 * 1000);
      await this.prisma.$transaction(async (transaction) => {
        await transaction.mediaStreamingAvailability.deleteMany({
          where: { mediaId, countryCode: country },
        });
        for (const item of providerAvailability.items) {
          const streamingProvider = await transaction.streamingProvider.upsert({
            where: {
              externalProvider_externalId: {
                externalProvider: 'TMDB',
                externalId: item.externalProviderId,
              },
            },
            update: {
              name: item.name,
              logoUrl: item.logoUrl,
              displayPriority: item.displayPriority,
            },
            create: {
              externalProvider: 'TMDB',
              externalId: item.externalProviderId,
              name: item.name,
              slug: `${item.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/gu, '-')
                .replace(/^-|-$/gu, '')}-${item.externalProviderId}`,
              logoUrl: item.logoUrl,
              displayPriority: item.displayPriority,
            },
          });
          await transaction.mediaStreamingAvailability.create({
            data: {
              mediaId,
              streamingProviderId: streamingProvider.id,
              countryCode: country,
              monetizationType: item.monetizationType,
              providerUrl: providerAvailability.providerUrl,
              displayPriority: item.displayPriority,
              fetchedAt,
              expiresAt,
            },
          });
        }
      });
      rows = await this.prisma.mediaStreamingAvailability.findMany({
        where: { mediaId, countryCode: country, expiresAt: { gt: new Date() } },
        include: { streamingProvider: true },
        orderBy: { displayPriority: 'asc' },
      });
      if (rows.length === 0) {
        return {
          countryCode: country,
          fetchedAt: fetchedAt.toISOString(),
          expiresAt: expiresAt.toISOString(),
          items: [],
        };
      }
    }
    return {
      countryCode: country,
      fetchedAt: rows[0]?.fetchedAt.toISOString() ?? new Date().toISOString(),
      expiresAt: rows[0]?.expiresAt.toISOString() ?? new Date().toISOString(),
      items: rows.map((row) => ({
        providerId: row.streamingProviderId,
        providerName: row.streamingProvider.name,
        logoUrl: row.streamingProvider.logoUrl,
        monetizationType: row.monetizationType,
        providerUrl: row.providerUrl,
        displayPriority: row.displayPriority,
      })),
    };
  }

  private async persistSummaries(results: ProviderMediaSummary[]): Promise<MediaSummary[]> {
    return this.prisma.$transaction(async (transaction) =>
      Promise.all(
        results.map(async (result) => {
          const genres = await transaction.genre.findMany({
            where: { provider: 'TMDB', externalId: { in: result.genreExternalIds } },
            select: { id: true },
          });
          const media = await transaction.media.upsert({
            where: {
              externalProvider_externalId_mediaType: {
                externalProvider: 'TMDB',
                externalId: result.externalId,
                mediaType: result.mediaType,
              },
            },
            update: {
              title: result.title,
              originalTitle: result.originalTitle,
              overview: result.overview,
              releaseDate: dateFromProvider(result.releaseDate),
              releaseYear: result.releaseYear,
              originalLanguage: result.originalLanguage,
              posterUrl: result.posterUrl,
              backdropUrl: result.backdropUrl,
              providerPopularity: result.providerPopularity,
              averageProviderRating: result.averageProviderRating,
            },
            create: {
              externalProvider: 'TMDB',
              externalId: result.externalId,
              mediaType: result.mediaType,
              title: result.title,
              originalTitle: result.originalTitle,
              overview: result.overview,
              releaseDate: dateFromProvider(result.releaseDate),
              releaseYear: result.releaseYear,
              originalLanguage: result.originalLanguage,
              posterUrl: result.posterUrl,
              backdropUrl: result.backdropUrl,
              providerPopularity: result.providerPopularity,
              averageProviderRating: result.averageProviderRating,
            },
            include: { genres: true },
          });
          await transaction.mediaGenre.deleteMany({ where: { mediaId: media.id } });
          if (genres.length > 0) {
            await transaction.mediaGenre.createMany({
              data: genres.map(({ id }) => ({ mediaId: media.id, genreId: id })),
            });
          }
          return mediaSummary({
            ...media,
            genres: genres.map(({ id }) => ({ mediaId: media.id, genreId: id })),
          });
        }),
      ),
    );
  }

  private async persistDetails(mediaId: string, details: ProviderMediaDetails): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const genres = await transaction.genre.findMany({
        where: { provider: 'TMDB', externalId: { in: details.genreExternalIds } },
        select: { id: true },
      });
      await transaction.media.update({
        where: { id: mediaId },
        data: {
          title: details.title,
          originalTitle: details.originalTitle,
          overview: details.overview,
          releaseDate: dateFromProvider(details.releaseDate),
          releaseYear: details.releaseYear,
          runtimeMinutes: details.runtimeMinutes,
          originalLanguage: details.originalLanguage,
          countryCodes: details.countryCodes,
          posterUrl: details.posterUrl,
          backdropUrl: details.backdropUrl,
          trailerUrl: details.trailerUrl,
          status: providerStatus(details.status),
          averageProviderRating: details.averageProviderRating,
          providerPopularity: details.providerPopularity,
          ageRating: details.ageRating,
          metadataJson: details.metadata as Prisma.InputJsonValue,
          lastSyncedAt: new Date(),
        },
      });
      await transaction.mediaGenre.deleteMany({ where: { mediaId } });
      if (genres.length > 0) {
        await transaction.mediaGenre.createMany({
          data: genres.map(({ id }) => ({ mediaId, genreId: id })),
        });
      }
      await transaction.credit.deleteMany({ where: { mediaId } });
      const creditRows = [];
      for (const credit of details.credits) {
        const person = await transaction.person.upsert({
          where: {
            externalProvider_externalId: {
              externalProvider: 'TMDB',
              externalId: credit.externalId,
            },
          },
          update: { name: credit.name, profileUrl: credit.profileUrl, lastSyncedAt: new Date() },
          create: {
            externalProvider: 'TMDB',
            externalId: credit.externalId,
            name: credit.name,
            profileUrl: credit.profileUrl,
            lastSyncedAt: new Date(),
          },
        });
        creditRows.push({
          mediaId,
          personId: person.id,
          creditType: credit.creditType,
          department: credit.department,
          job: credit.job,
          character: credit.character,
          position: credit.position,
        });
      }
      if (creditRows.length > 0) {
        await transaction.credit.createMany({ data: creditRows, skipDuplicates: true });
      }
      if (details.mediaType === 'TV' && details.seasons.length > 0) {
        for (const season of details.seasons) {
          await transaction.tvSeason.upsert({
            where: { mediaId_seasonNumber: { mediaId, seasonNumber: season.seasonNumber } },
            update: {
              externalId: season.externalId,
              name: season.name,
              overview: season.overview,
              airDate: dateFromProvider(season.airDate),
              episodeCount: season.episodeCount,
              posterUrl: season.posterUrl,
            },
            create: {
              mediaId,
              externalProvider: 'TMDB',
              externalId: season.externalId,
              seasonNumber: season.seasonNumber,
              name: season.name,
              overview: season.overview,
              airDate: dateFromProvider(season.airDate),
              episodeCount: season.episodeCount,
              posterUrl: season.posterUrl,
            },
          });
        }
      }
    });
  }
}
