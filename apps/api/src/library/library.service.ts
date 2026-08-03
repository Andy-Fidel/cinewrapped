import type {
  EpisodeProgressSummary,
  LibraryItem,
  MediaSummary,
  MediaTrackingState,
  RatingSummary,
  ReviewSummary,
  ViewingSummary,
  WatchlistDetails,
  WatchlistSummary,
} from '@cinewrapped/shared-types';
import { Prisma } from '@cinewrapped/database';
import type {
  addWatchlistItemSchema,
  createReviewSchema,
  createWatchlistSchema,
  logViewingSchema,
  updateEpisodeProgressSchema,
  updateReviewSchema,
  updateWatchlistSchema,
  updateWatchStatusSchema,
  upsertRatingSchema,
} from '@cinewrapped/validation';
import { Inject, Injectable } from '@nestjs/common';
import type { z } from 'zod';

import type { AuthPrincipal } from '../auth/auth.types.js';
import { AppException } from '../common/app.exception.js';
import { PrismaService } from '../database/prisma.service.js';
import { MEDIA_PROVIDER, type MediaProvider } from '../media-provider/media-provider.types.js';

export type UpdateWatchStatusInput = z.output<typeof updateWatchStatusSchema>;
export type LogViewingInput = z.output<typeof logViewingSchema>;
export type UpdateEpisodeProgressInput = z.output<typeof updateEpisodeProgressSchema>;
export type UpsertRatingInput = z.output<typeof upsertRatingSchema>;
export type CreateReviewInput = z.output<typeof createReviewSchema>;
export type UpdateReviewInput = z.output<typeof updateReviewSchema>;
export type CreateWatchlistInput = z.output<typeof createWatchlistSchema>;
export type UpdateWatchlistInput = z.output<typeof updateWatchlistSchema>;
export type AddWatchlistItemInput = z.output<typeof addWatchlistItemSchema>;

export interface LibraryQuery {
  status?: UpdateWatchStatusInput['status'];
  mediaType?: 'MOVIE' | 'TV';
  limit: number;
  cursor?: string;
}

type MediaRecord = Prisma.MediaGetPayload<{ include: { genres: true } }>;
type LibraryRecord = Prisma.WatchHistoryGetPayload<{
  include: {
    media: {
      include: { genres: true; ratings: true; reviews: true; watchlistItems: true };
    };
  };
}>;

function mediaSummary(media: MediaRecord): MediaSummary {
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

function ratingSummary(rating: {
  id: string;
  ratingValue: Prisma.Decimal | null;
  ratingScale: number | null;
  normalizedScore: Prisma.Decimal | null;
  liked: boolean | null;
  emotionalTags: string[];
  version: number;
  updatedAt: Date;
}): RatingSummary {
  return {
    id: rating.id,
    ratingValue: rating.ratingValue === null ? null : Number(rating.ratingValue),
    ratingScale: rating.ratingScale,
    normalizedScore: rating.normalizedScore === null ? null : Number(rating.normalizedScore),
    liked: rating.liked,
    emotionalTags: rating.emotionalTags,
    version: rating.version,
    updatedAt: rating.updatedAt.toISOString(),
  };
}

function reviewSummary(review: {
  id: string;
  mediaId: string;
  title: string | null;
  body: string;
  containsSpoilers: boolean;
  visibility: 'PUBLIC' | 'FRIENDS' | 'PRIVATE' | 'CLUB_ONLY';
  status: 'DRAFT' | 'PUBLISHED' | 'HIDDEN' | 'REMOVED';
  publishedAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}): ReviewSummary {
  return {
    ...review,
    publishedAt: review.publishedAt?.toISOString() ?? null,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  };
}

function viewingSummary(viewing: {
  id: string;
  mediaId: string;
  watchedAt: Date;
  completedAt: Date | null;
  durationWatchedMin: number | null;
  viewingPlatform: string | null;
  notes: string | null;
  isRewatch: boolean;
  createdAt: Date;
}): ViewingSummary {
  return {
    ...viewing,
    watchedAt: viewing.watchedAt.toISOString(),
    completedAt: viewing.completedAt?.toISOString() ?? null,
    createdAt: viewing.createdAt.toISOString(),
  };
}

function cursorValue(cursor: string | undefined): { updatedAt: Date; id: string } | null {
  if (cursor === undefined) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as unknown;
    if (typeof parsed !== 'object' || parsed === null) throw new Error('invalid');
    const value = parsed as { updatedAt?: unknown; id?: unknown };
    if (typeof value.updatedAt !== 'string' || typeof value.id !== 'string')
      throw new Error('invalid');
    const updatedAt = new Date(value.updatedAt);
    if (Number.isNaN(updatedAt.getTime())) throw new Error('invalid');
    return { updatedAt, id: value.id };
  } catch {
    throw new AppException(400, 'CURSOR_INVALID', 'The library cursor is invalid.');
  }
}

function nextCursor(item: { updatedAt: Date; id: string } | undefined): string | null {
  return item === undefined
    ? null
    : Buffer.from(
        JSON.stringify({ updatedAt: item.updatedAt.toISOString(), id: item.id }),
        'utf8',
      ).toString('base64url');
}

@Injectable()
export class LibraryService {
  public constructor(
    private readonly prisma: PrismaService,
    @Inject(MEDIA_PROVIDER) private readonly provider: MediaProvider,
  ) {}

  public async library(principal: AuthPrincipal, query: LibraryQuery) {
    const user = await this.requireUser(principal.subject);
    const cursor = cursorValue(query.cursor);
    const records = await this.prisma.watchHistory.findMany({
      where: {
        userId: user.id,
        ...(query.status === undefined ? {} : { status: query.status }),
        ...(query.mediaType === undefined ? {} : { media: { mediaType: query.mediaType } }),
        ...(cursor === null
          ? {}
          : {
              OR: [
                { updatedAt: { lt: cursor.updatedAt } },
                { updatedAt: cursor.updatedAt, id: { lt: cursor.id } },
              ],
            }),
      },
      include: {
        media: {
          include: {
            genres: true,
            ratings: { where: { userId: user.id, deletedAt: null }, take: 1 },
            reviews: {
              where: { userId: user.id, deletedAt: null, status: { not: 'REMOVED' } },
              orderBy: { updatedAt: 'desc' },
              take: 1,
            },
            watchlistItems: {
              where: { watchlist: { userId: user.id, isDefault: true, deletedAt: null } },
              take: 1,
            },
          },
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const hasMore = records.length > query.limit;
    const page = records.slice(0, query.limit);
    return {
      items: page.map((record) => this.toLibraryItem(record)),
      nextCursor: hasMore ? nextCursor(page.at(-1)) : null,
    };
  }

  public async trackingState(
    principal: AuthPrincipal,
    mediaId: string,
  ): Promise<MediaTrackingState> {
    const user = await this.requireUser(principal.subject);
    await this.requireMedia(mediaId);
    const [history, watchlists, rating, review] = await Promise.all([
      this.prisma.watchHistory.findUnique({
        where: { userId_mediaId: { userId: user.id, mediaId } },
        include: {
          media: {
            include: {
              genres: true,
              ratings: { where: { userId: user.id, deletedAt: null }, take: 1 },
              reviews: {
                where: { userId: user.id, deletedAt: null, status: { not: 'REMOVED' } },
                orderBy: { updatedAt: 'desc' },
                take: 1,
              },
              watchlistItems: {
                where: { watchlist: { userId: user.id, isDefault: true, deletedAt: null } },
                take: 1,
              },
            },
          },
        },
      }),
      this.prisma.watchlist.findMany({
        where: { userId: user.id, deletedAt: null, items: { some: { mediaId } } },
        select: { id: true, name: true, isDefault: true },
      }),
      this.prisma.rating.findFirst({ where: { userId: user.id, mediaId, deletedAt: null } }),
      this.prisma.review.findFirst({
        where: { userId: user.id, mediaId, deletedAt: null, status: { not: 'REMOVED' } },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);
    return {
      library: history === null ? null : this.toLibraryItem(history),
      watchlists,
      rating: rating === null ? null : ratingSummary(rating),
      latestReview: review === null ? null : reviewSummary(review),
    };
  }

  public async updateStatus(
    principal: AuthPrincipal,
    mediaId: string,
    input: UpdateWatchStatusInput,
  ): Promise<LibraryItem> {
    const user = await this.requireUser(principal.subject);
    await this.requireMedia(mediaId);
    const existing = await this.prisma.watchHistory.findUnique({
      where: { userId_mediaId: { userId: user.id, mediaId } },
    });
    const now = new Date();
    const progressPercent =
      input.status === 'COMPLETED' ? 100 : (input.progressPercent ?? undefined);
    const statusFields = {
      status: input.status,
      ...(progressPercent === undefined ? {} : { progressPercent }),
      ...(input.progressSeconds === undefined ? {} : { progressSeconds: input.progressSeconds }),
      ...(input.status === 'WATCHING' || input.status === 'REWATCHING'
        ? { startedAt: existing?.startedAt ?? now }
        : {}),
      ...(input.status === 'COMPLETED' ? { completedAt: now } : { completedAt: null }),
    };
    if (existing === null) {
      if (input.expectedVersion !== undefined) this.versionConflict('LIBRARY_VERSION_CONFLICT');
      await this.prisma.watchHistory.create({
        data: { userId: user.id, mediaId, ...statusFields },
      });
    } else {
      if (input.expectedVersion === undefined || input.expectedVersion !== existing.version) {
        this.versionConflict('LIBRARY_VERSION_CONFLICT');
      }
      const updated = await this.prisma.watchHistory.updateMany({
        where: { id: existing.id, version: input.expectedVersion },
        data: { ...statusFields, version: { increment: 1 } },
      });
      if (updated.count === 0) this.versionConflict('LIBRARY_VERSION_CONFLICT');
    }
    return (await this.trackingState(principal, mediaId)).library as LibraryItem;
  }

  public async removeFromLibrary(principal: AuthPrincipal, mediaId: string): Promise<void> {
    const user = await this.requireUser(principal.subject);
    await this.prisma.watchHistory.deleteMany({ where: { userId: user.id, mediaId } });
  }

  public async logViewing(
    principal: AuthPrincipal,
    mediaId: string,
    input: LogViewingInput,
  ): Promise<ViewingSummary> {
    const user = await this.requireUser(principal.subject);
    await this.requireMedia(mediaId);
    const duplicate = await this.prisma.viewing.findUnique({
      where: {
        userId_clientOperationId: { userId: user.id, clientOperationId: input.clientOperationId },
      },
    });
    if (duplicate !== null) return viewingSummary(duplicate);
    return this.prisma.$transaction(async (transaction) => {
      const history = await transaction.watchHistory.upsert({
        where: { userId_mediaId: { userId: user.id, mediaId } },
        create: {
          userId: user.id,
          mediaId,
          status: input.completed ? 'COMPLETED' : 'WATCHING',
          startedAt: new Date(input.watchedAt),
          completedAt: input.completed ? new Date(input.watchedAt) : null,
          progressPercent: input.completed ? 100 : 0,
          watchCount: input.completed ? 1 : 0,
          lastWatchedAt: new Date(input.watchedAt),
        },
        update: {
          status: input.completed ? 'COMPLETED' : 'WATCHING',
          completedAt: input.completed ? new Date(input.watchedAt) : null,
          ...(input.completed ? { progressPercent: 100, watchCount: { increment: 1 } } : {}),
          lastWatchedAt: new Date(input.watchedAt),
          version: { increment: 1 },
        },
      });
      const viewing = await transaction.viewing.create({
        data: {
          userId: user.id,
          mediaId,
          watchHistoryId: history.id,
          clientOperationId: input.clientOperationId,
          watchedAt: new Date(input.watchedAt),
          completedAt: input.completed ? new Date(input.watchedAt) : null,
          durationWatchedMin: input.durationWatchedMin ?? null,
          viewingPlatform: input.viewingPlatform ?? null,
          notes: input.notes ?? null,
          isRewatch: history.watchCount > (input.completed ? 1 : 0),
        },
      });
      return viewingSummary(viewing);
    });
  }

  public async episodes(
    principal: AuthPrincipal,
    mediaId: string,
    seasonNumber: number,
    language: string,
  ): Promise<EpisodeProgressSummary[]> {
    const user = await this.requireUser(principal.subject);
    const media = await this.prisma.media.findUnique({ where: { id: mediaId } });
    if (media === null || media.mediaType !== 'TV') {
      throw new AppException(
        404,
        'TV_MEDIA_NOT_FOUND',
        'The requested television title was not found.',
      );
    }
    const season = await this.prisma.tvSeason.findUnique({
      where: { mediaId_seasonNumber: { mediaId, seasonNumber } },
      include: { _count: { select: { episodes: true } } },
    });
    if (season === null)
      throw new AppException(404, 'SEASON_NOT_FOUND', 'The requested season was not found.');
    if (season._count.episodes === 0) {
      const episodes = await this.provider.getSeasonEpisodes(
        media.externalId,
        seasonNumber,
        language,
      );
      await this.prisma.$transaction(
        episodes.map((episode) =>
          this.prisma.tvEpisode.upsert({
            where: {
              externalProvider_externalId: {
                externalProvider: 'TMDB',
                externalId: episode.externalId,
              },
            },
            update: {
              seasonId: season.id,
              episodeNumber: episode.episodeNumber,
              name: episode.name,
              overview: episode.overview,
              airDate:
                episode.airDate === null ? null : new Date(`${episode.airDate}T00:00:00.000Z`),
              runtimeMinutes: episode.runtimeMinutes,
              stillUrl: episode.stillUrl,
            },
            create: {
              seasonId: season.id,
              externalProvider: 'TMDB',
              externalId: episode.externalId,
              episodeNumber: episode.episodeNumber,
              name: episode.name,
              overview: episode.overview,
              airDate:
                episode.airDate === null ? null : new Date(`${episode.airDate}T00:00:00.000Z`),
              runtimeMinutes: episode.runtimeMinutes,
              stillUrl: episode.stillUrl,
            },
          }),
        ),
      );
    }
    const records = await this.prisma.tvEpisode.findMany({
      where: { seasonId: season.id },
      include: { watchHistory: { where: { userId: user.id }, take: 1 } },
      orderBy: { episodeNumber: 'asc' },
    });
    return records.map((episode) => {
      const progress = episode.watchHistory[0];
      return {
        episodeId: episode.id,
        seasonId: season.id,
        seasonNumber,
        episodeNumber: episode.episodeNumber,
        name: episode.name,
        overview: episode.overview,
        airDate: episode.airDate?.toISOString().slice(0, 10) ?? null,
        runtimeMinutes: episode.runtimeMinutes,
        stillUrl: episode.stillUrl,
        completed: progress?.completed ?? false,
        progressSeconds: progress?.progressSeconds ?? null,
        watchedAt: progress?.watchedAt?.toISOString() ?? null,
        watchCount: progress?.watchCount ?? 0,
        version: progress?.version ?? null,
      };
    });
  }

  public async updateEpisodeProgress(
    principal: AuthPrincipal,
    episodeId: string,
    input: UpdateEpisodeProgressInput,
  ): Promise<EpisodeProgressSummary> {
    const user = await this.requireUser(principal.subject);
    const episode = await this.prisma.tvEpisode.findUnique({
      where: { id: episodeId },
      include: { season: true },
    });
    if (episode === null)
      throw new AppException(404, 'EPISODE_NOT_FOUND', 'The requested episode was not found.');
    if (input.clientOperationId !== undefined) {
      const duplicate = await this.prisma.episodeWatchHistory.findUnique({
        where: {
          userId_clientOperationId: { userId: user.id, clientOperationId: input.clientOperationId },
        },
      });
      if (duplicate !== null && duplicate.episodeId !== episodeId) {
        throw new AppException(
          409,
          'OPERATION_ID_CONFLICT',
          'This operation identifier was already used.',
        );
      }
      if (duplicate !== null) {
        const rows = await this.episodes(
          principal,
          episode.season.mediaId,
          episode.season.seasonNumber,
          'en-US',
        );
        return rows.find((row) => row.episodeId === episodeId) as EpisodeProgressSummary;
      }
    }
    const existing = await this.prisma.episodeWatchHistory.findUnique({
      where: { userId_episodeId: { userId: user.id, episodeId } },
    });
    const watchedAt =
      input.watchedAt === undefined
        ? input.completed
          ? new Date()
          : null
        : input.watchedAt === null
          ? null
          : new Date(input.watchedAt);
    if (existing === null) {
      if (input.expectedVersion !== undefined) this.versionConflict('EPISODE_VERSION_CONFLICT');
      await this.prisma.episodeWatchHistory.create({
        data: {
          userId: user.id,
          episodeId,
          ...(input.clientOperationId === undefined
            ? {}
            : { clientOperationId: input.clientOperationId }),
          completed: input.completed,
          progressSeconds: input.progressSeconds ?? null,
          watchedAt,
          watchCount: input.completed ? 1 : 0,
        },
      });
    } else {
      if (input.expectedVersion === undefined || input.expectedVersion !== existing.version) {
        this.versionConflict('EPISODE_VERSION_CONFLICT');
      }
      const result = await this.prisma.episodeWatchHistory.updateMany({
        where: { id: existing.id, version: input.expectedVersion },
        data: {
          clientOperationId: input.clientOperationId ?? existing.clientOperationId,
          completed: input.completed,
          progressSeconds: input.progressSeconds ?? null,
          watchedAt,
          ...(!existing.completed && input.completed ? { watchCount: { increment: 1 } } : {}),
          version: { increment: 1 },
        },
      });
      if (result.count === 0) this.versionConflict('EPISODE_VERSION_CONFLICT');
    }
    await this.updateSeriesProgress(user.id, episode.season.mediaId);
    const rows = await this.episodes(
      principal,
      episode.season.mediaId,
      episode.season.seasonNumber,
      'en-US',
    );
    return rows.find((row) => row.episodeId === episodeId) as EpisodeProgressSummary;
  }

  public async watchlists(principal: AuthPrincipal): Promise<WatchlistSummary[]> {
    const user = await this.requireUser(principal.subject);
    await this.ensureDefaultWatchlist(user.id);
    const rows = await this.prisma.watchlist.findMany({
      where: { userId: user.id, deletedAt: null },
      include: { _count: { select: { items: true } } },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
    return rows.map((row) => this.toWatchlistSummary(row));
  }

  public async watchlist(principal: AuthPrincipal, watchlistId: string): Promise<WatchlistDetails> {
    const user = await this.requireUser(principal.subject);
    const row = await this.prisma.watchlist.findFirst({
      where: { id: watchlistId, userId: user.id, deletedAt: null },
      include: {
        _count: { select: { items: true } },
        items: { include: { media: { include: { genres: true } } }, orderBy: { position: 'asc' } },
      },
    });
    if (row === null)
      throw new AppException(404, 'WATCHLIST_NOT_FOUND', 'The watchlist was not found.');
    return {
      ...this.toWatchlistSummary(row),
      items: row.items.map((item) => ({
        id: item.id,
        position: item.position,
        note: item.note,
        createdAt: item.createdAt.toISOString(),
        media: mediaSummary(item.media),
      })),
    };
  }

  public async createWatchlist(
    principal: AuthPrincipal,
    input: CreateWatchlistInput,
  ): Promise<WatchlistSummary> {
    const user = await this.requireUser(principal.subject);
    const row = await this.prisma.watchlist.create({
      data: {
        userId: user.id,
        name: input.name,
        description: input.description ?? null,
        visibility: input.visibility,
      },
      include: { _count: { select: { items: true } } },
    });
    return this.toWatchlistSummary(row);
  }

  public async updateWatchlist(
    principal: AuthPrincipal,
    watchlistId: string,
    input: UpdateWatchlistInput,
  ): Promise<WatchlistSummary> {
    const user = await this.requireUser(principal.subject);
    const existing = await this.prisma.watchlist.findFirst({
      where: { id: watchlistId, userId: user.id, deletedAt: null },
    });
    if (existing === null)
      throw new AppException(404, 'WATCHLIST_NOT_FOUND', 'The watchlist was not found.');
    const { expectedVersion, ...fields } = input;
    const result = await this.prisma.watchlist.updateMany({
      where: { id: watchlistId, userId: user.id, version: expectedVersion, deletedAt: null },
      data: {
        ...(fields.name === undefined ? {} : { name: fields.name }),
        ...(fields.description === undefined ? {} : { description: fields.description }),
        ...(fields.visibility === undefined ? {} : { visibility: fields.visibility }),
        version: { increment: 1 },
      },
    });
    if (result.count === 0) this.versionConflict('WATCHLIST_VERSION_CONFLICT');
    return (await this.watchlists(principal)).find(
      (row) => row.id === watchlistId,
    ) as WatchlistSummary;
  }

  public async deleteWatchlist(principal: AuthPrincipal, watchlistId: string): Promise<void> {
    const user = await this.requireUser(principal.subject);
    const row = await this.prisma.watchlist.findFirst({
      where: { id: watchlistId, userId: user.id, deletedAt: null },
    });
    if (row === null)
      throw new AppException(404, 'WATCHLIST_NOT_FOUND', 'The watchlist was not found.');
    if (row.isDefault)
      throw new AppException(
        409,
        'DEFAULT_WATCHLIST_REQUIRED',
        'The default watchlist cannot be deleted.',
      );
    await this.prisma.watchlist.update({
      where: { id: watchlistId },
      data: { deletedAt: new Date(), version: { increment: 1 } },
    });
  }

  public async addWatchlistItem(
    principal: AuthPrincipal,
    watchlistId: string,
    input: AddWatchlistItemInput,
  ): Promise<WatchlistDetails> {
    const user = await this.requireUser(principal.subject);
    await this.requireMedia(input.mediaId);
    await this.prisma.$transaction(
      async (transaction) => {
        const watchlist = await transaction.watchlist.findFirst({
          where: { id: watchlistId, userId: user.id, deletedAt: null },
        });
        if (watchlist === null)
          throw new AppException(404, 'WATCHLIST_NOT_FOUND', 'The watchlist was not found.');
        const last = await transaction.watchlistItem.findFirst({
          where: { watchlistId },
          orderBy: { position: 'desc' },
        });
        await transaction.watchlistItem.upsert({
          where: { watchlistId_mediaId: { watchlistId, mediaId: input.mediaId } },
          update: { note: input.note ?? null },
          create: {
            watchlistId,
            mediaId: input.mediaId,
            addedByUserId: user.id,
            position: (last?.position ?? -1) + 1,
            note: input.note ?? null,
          },
        });
        await transaction.watchlist.update({
          where: { id: watchlistId },
          data: { version: { increment: 1 } },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return this.watchlist(principal, watchlistId);
  }

  public async addToDefaultWatchlist(
    principal: AuthPrincipal,
    mediaId: string,
  ): Promise<WatchlistDetails> {
    const user = await this.requireUser(principal.subject);
    const watchlist = await this.ensureDefaultWatchlist(user.id);
    return this.addWatchlistItem(principal, watchlist.id, { mediaId });
  }

  public async removeWatchlistItem(
    principal: AuthPrincipal,
    watchlistId: string,
    mediaId: string,
  ): Promise<void> {
    const user = await this.requireUser(principal.subject);
    const watchlist = await this.prisma.watchlist.findFirst({
      where: { id: watchlistId, userId: user.id, deletedAt: null },
    });
    if (watchlist === null)
      throw new AppException(404, 'WATCHLIST_NOT_FOUND', 'The watchlist was not found.');
    await this.prisma.$transaction([
      this.prisma.watchlistItem.deleteMany({ where: { watchlistId, mediaId } }),
      this.prisma.watchlist.update({
        where: { id: watchlistId },
        data: { version: { increment: 1 } },
      }),
    ]);
  }

  public async upsertRating(
    principal: AuthPrincipal,
    mediaId: string,
    input: UpsertRatingInput,
  ): Promise<RatingSummary> {
    const user = await this.requireUser(principal.subject);
    await this.requireMedia(mediaId);
    const existing = await this.prisma.rating.findUnique({
      where: { userId_mediaId: { userId: user.id, mediaId } },
    });
    const normalizedScore =
      input.ratingValue === undefined || input.ratingScale === undefined
        ? input.liked === undefined
          ? null
          : input.liked
            ? 100
            : 0
        : (input.ratingValue / input.ratingScale) * 100;
    const data = {
      ratingValue: input.ratingValue ?? null,
      ratingScale: input.ratingScale ?? null,
      normalizedScore,
      liked: input.liked ?? null,
      emotionalTags: [...new Set(input.emotionalTags)],
      deletedAt: null,
    };
    if (existing === null) {
      if (input.expectedVersion !== undefined) this.versionConflict('RATING_VERSION_CONFLICT');
      return ratingSummary(
        await this.prisma.rating.create({ data: { userId: user.id, mediaId, ...data } }),
      );
    }
    if (existing.deletedAt !== null && input.expectedVersion === undefined) {
      await this.prisma.rating.update({
        where: { id: existing.id },
        data: { ...data, version: { increment: 1 } },
      });
      return ratingSummary(
        await this.prisma.rating.findUniqueOrThrow({ where: { id: existing.id } }),
      );
    }
    if (input.expectedVersion === undefined || input.expectedVersion !== existing.version)
      this.versionConflict('RATING_VERSION_CONFLICT');
    const result = await this.prisma.rating.updateMany({
      where: { id: existing.id, version: input.expectedVersion },
      data: { ...data, version: { increment: 1 } },
    });
    if (result.count === 0) this.versionConflict('RATING_VERSION_CONFLICT');
    return ratingSummary(
      await this.prisma.rating.findUniqueOrThrow({ where: { id: existing.id } }),
    );
  }

  public async deleteRating(principal: AuthPrincipal, mediaId: string): Promise<void> {
    const user = await this.requireUser(principal.subject);
    await this.prisma.rating.updateMany({
      where: { userId: user.id, mediaId, deletedAt: null },
      data: { deletedAt: new Date(), version: { increment: 1 } },
    });
  }

  public async createReview(
    principal: AuthPrincipal,
    mediaId: string,
    input: CreateReviewInput,
  ): Promise<ReviewSummary> {
    const user = await this.requireUser(principal.subject);
    await this.requireMedia(mediaId);
    const row = await this.prisma.review.create({
      data: {
        userId: user.id,
        mediaId,
        title: input.title ?? null,
        body: input.body,
        containsSpoilers: input.containsSpoilers,
        visibility: input.visibility,
        status: input.status,
        publishedAt: input.status === 'PUBLISHED' ? new Date() : null,
      },
    });
    return reviewSummary(row);
  }

  public async updateReview(
    principal: AuthPrincipal,
    reviewId: string,
    input: UpdateReviewInput,
  ): Promise<ReviewSummary> {
    const user = await this.requireUser(principal.subject);
    const existing = await this.prisma.review.findFirst({
      where: { id: reviewId, userId: user.id, deletedAt: null },
    });
    if (existing === null)
      throw new AppException(404, 'REVIEW_NOT_FOUND', 'The review was not found.');
    const { expectedVersion, status, ...fields } = input;
    const result = await this.prisma.review.updateMany({
      where: { id: reviewId, userId: user.id, version: expectedVersion, deletedAt: null },
      data: {
        ...(fields.title === undefined ? {} : { title: fields.title }),
        ...(fields.body === undefined ? {} : { body: fields.body }),
        ...(fields.containsSpoilers === undefined
          ? {}
          : { containsSpoilers: fields.containsSpoilers }),
        ...(fields.visibility === undefined ? {} : { visibility: fields.visibility }),
        ...(status === undefined
          ? {}
          : {
              status,
              publishedAt: status === 'PUBLISHED' ? (existing.publishedAt ?? new Date()) : null,
            }),
        version: { increment: 1 },
      },
    });
    if (result.count === 0) this.versionConflict('REVIEW_VERSION_CONFLICT');
    return reviewSummary(await this.prisma.review.findUniqueOrThrow({ where: { id: reviewId } }));
  }

  public async deleteReview(principal: AuthPrincipal, reviewId: string): Promise<void> {
    const user = await this.requireUser(principal.subject);
    const result = await this.prisma.review.updateMany({
      where: { id: reviewId, userId: user.id, deletedAt: null },
      data: { status: 'REMOVED', deletedAt: new Date(), version: { increment: 1 } },
    });
    if (result.count === 0)
      throw new AppException(404, 'REVIEW_NOT_FOUND', 'The review was not found.');
  }

  private toLibraryItem(record: LibraryRecord): LibraryItem {
    return {
      media: mediaSummary(record.media),
      status: record.status,
      startedAt: record.startedAt?.toISOString() ?? null,
      completedAt: record.completedAt?.toISOString() ?? null,
      progressPercent: Number(record.progressPercent),
      progressSeconds: record.progressSeconds,
      watchCount: record.watchCount,
      lastWatchedAt: record.lastWatchedAt?.toISOString() ?? null,
      version: record.version,
      inDefaultWatchlist: record.media.watchlistItems.length > 0,
      rating: record.media.ratings[0] === undefined ? null : ratingSummary(record.media.ratings[0]),
      latestReview:
        record.media.reviews[0] === undefined ? null : reviewSummary(record.media.reviews[0]),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private toWatchlistSummary(row: {
    id: string;
    name: string;
    description: string | null;
    visibility: 'PUBLIC' | 'FRIENDS' | 'PRIVATE' | 'CLUB_ONLY';
    isDefault: boolean;
    version: number;
    updatedAt: Date;
    _count: { items: number };
  }): WatchlistSummary {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      visibility: row.visibility,
      isDefault: row.isDefault,
      itemCount: row._count.items,
      version: row.version,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async ensureDefaultWatchlist(userId: string) {
    const existing = await this.prisma.watchlist.findFirst({
      where: { userId, isDefault: true, deletedAt: null },
    });
    return (
      existing ??
      this.prisma.watchlist.create({
        data: { userId, name: 'Watchlist', isDefault: true, visibility: 'PRIVATE' },
      })
    );
  }

  private async updateSeriesProgress(userId: string, mediaId: string): Promise<void> {
    const [media, completed] = await Promise.all([
      this.prisma.media.findUnique({ where: { id: mediaId }, include: { seasons: true } }),
      this.prisma.episodeWatchHistory.count({
        where: { userId, completed: true, episode: { season: { mediaId } } },
      }),
    ]);
    if (media === null) return;
    const total = media.seasons.reduce((sum, season) => sum + (season.episodeCount ?? 0), 0);
    const percent = total === 0 ? 0 : Math.min(100, (completed / total) * 100);
    const isComplete = total > 0 && completed >= total;
    await this.prisma.watchHistory.upsert({
      where: { userId_mediaId: { userId, mediaId } },
      create: {
        userId,
        mediaId,
        status: isComplete ? 'COMPLETED' : 'WATCHING',
        progressPercent: percent,
        startedAt: new Date(),
        completedAt: isComplete ? new Date() : null,
      },
      update: {
        status: isComplete ? 'COMPLETED' : 'WATCHING',
        progressPercent: percent,
        completedAt: isComplete ? new Date() : null,
        lastWatchedAt: new Date(),
        version: { increment: 1 },
      },
    });
  }

  private async requireUser(subject: string) {
    const user = await this.prisma.user.findUnique({ where: { authSubject: subject } });
    if (user === null || user.deletedAt !== null)
      throw new AppException(
        404,
        'USER_NOT_BOOTSTRAPPED',
        'The application profile is unavailable.',
      );
    return user;
  }

  private async requireMedia(mediaId: string) {
    const media = await this.prisma.media.findUnique({ where: { id: mediaId } });
    if (media === null)
      throw new AppException(404, 'MEDIA_NOT_FOUND', 'The requested media was not found.');
    return media;
  }

  private versionConflict(code: string): never {
    throw new AppException(
      409,
      code,
      'This record changed on another device. Refresh and try again.',
    );
  }
}
