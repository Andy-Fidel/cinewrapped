import type { MediaSummary, RecommendationSummary, TasteProfile } from '@cinewrapped/shared-types';
import { Prisma } from '@cinewrapped/database';
import { Injectable } from '@nestjs/common';

import type { AuthPrincipal } from '../auth/auth.types.js';
import { AppException } from '../common/app.exception.js';
import { PrismaService } from '../database/prisma.service.js';
import {
  rankRecommendations,
  RECOMMENDATION_MODEL_VERSION,
  type RankingTaste,
} from './recommendation-engine.js';

export interface RecommendationQuery {
  recommendationType?:
    | 'PERSONALIZED'
    | 'TRENDING'
    | 'FRIEND_BASED'
    | 'MOOD_BASED'
    | 'SIMILAR_MEDIA'
    | 'HIDDEN_GEM'
    | 'CONTINUE_WATCHING'
    | 'BECAUSE_YOU_WATCHED';
  runtimeMax?: number;
  limit: number;
  cursor?: string;
}

type RecommendationRecord = Prisma.RecommendationGetPayload<{
  include: { media: { include: { genres: true } }; feedback: true };
}>;

function mediaSummary(media: RecommendationRecord['media']): MediaSummary {
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

function recommendationSummary(record: RecommendationRecord): RecommendationSummary {
  return {
    id: record.id,
    media: mediaSummary(record.media),
    score: Number(record.score),
    recommendationType: record.recommendationType,
    explanation: record.explanation,
    reasonCodes: record.reasonCodes,
    modelVersion: record.modelVersion,
    generatedAt: record.generatedAt.toISOString(),
    expiresAt: record.expiresAt.toISOString(),
    feedback: record.feedback.map(({ feedbackType }) => feedbackType),
  };
}

function decodeCursor(cursor: string | undefined): { score: number; id: string } | null {
  if (cursor === undefined) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as unknown;
    if (typeof parsed !== 'object' || parsed === null) throw new Error('invalid');
    const value = parsed as { score?: unknown; id?: unknown };
    if (typeof value.score !== 'number' || typeof value.id !== 'string') throw new Error('invalid');
    return { score: value.score, id: value.id };
  } catch {
    throw new AppException(400, 'CURSOR_INVALID', 'The recommendation cursor is invalid.');
  }
}

function encodeCursor(record: { score: Prisma.Decimal; id: string } | undefined): string | null {
  return record === undefined
    ? null
    : Buffer.from(JSON.stringify({ score: Number(record.score), id: record.id }), 'utf8').toString(
        'base64url',
      );
}

@Injectable()
export class RecommendationsService {
  public constructor(private readonly prisma: PrismaService) {}

  public async tasteProfile(principal: AuthPrincipal): Promise<TasteProfile> {
    const user = await this.requireUser(principal.subject);
    return (await this.buildTaste(user.id)).profile;
  }

  public async recommendations(principal: AuthPrincipal, query: RecommendationQuery) {
    const user = await this.requireUser(principal.subject);
    const active = await this.prisma.recommendation.count({
      where: {
        userId: user.id,
        modelVersion: RECOMMENDATION_MODEL_VERSION,
        expiresAt: { gt: new Date() },
        dismissedAt: null,
        feedback: { none: { feedbackType: 'SAVED' } },
      },
    });
    if (active === 0) await this.generate(user.id, false);
    const cursor = decodeCursor(query.cursor);
    const records = await this.prisma.recommendation.findMany({
      where: {
        userId: user.id,
        modelVersion: RECOMMENDATION_MODEL_VERSION,
        expiresAt: { gt: new Date() },
        dismissedAt: null,
        feedback: { none: { feedbackType: 'SAVED' } },
        ...(query.recommendationType === undefined
          ? {}
          : { recommendationType: query.recommendationType }),
        ...(query.runtimeMax === undefined
          ? {}
          : { media: { runtimeMinutes: { lte: query.runtimeMax } } }),
        ...(cursor === null
          ? {}
          : {
              OR: [{ score: { lt: cursor.score } }, { score: cursor.score, id: { gt: cursor.id } }],
            }),
      },
      include: { media: { include: { genres: true } }, feedback: true },
      orderBy: [{ score: 'desc' }, { id: 'asc' }],
      take: query.limit + 1,
    });
    const hasMore = records.length > query.limit;
    const page = records.slice(0, query.limit);
    return {
      items: page.map(recommendationSummary),
      nextCursor: hasMore ? encodeCursor(page.at(-1)) : null,
    };
  }

  public async refresh(principal: AuthPrincipal): Promise<{ generated: number }> {
    const user = await this.requireUser(principal.subject);
    return { generated: await this.generate(user.id, true) };
  }

  public async feedback(
    principal: AuthPrincipal,
    recommendationId: string,
    feedbackType: 'VIEWED' | 'SAVED' | 'DISMISSED' | 'SELECTED',
  ): Promise<RecommendationSummary> {
    const user = await this.requireUser(principal.subject);
    const recommendation = await this.prisma.recommendation.findFirst({
      where: { id: recommendationId, userId: user.id },
    });
    if (recommendation === null) {
      throw new AppException(404, 'RECOMMENDATION_NOT_FOUND', 'The recommendation was not found.');
    }
    await this.prisma.$transaction(
      async (transaction) => {
        await transaction.recommendationFeedback.upsert({
          where: { recommendationId_feedbackType: { recommendationId, feedbackType } },
          update: {},
          create: { recommendationId, feedbackType },
        });
        await transaction.recommendation.update({
          where: { id: recommendationId },
          data:
            feedbackType === 'DISMISSED'
              ? { dismissedAt: new Date() }
              : feedbackType === 'VIEWED'
                ? { viewedAt: new Date() }
                : feedbackType === 'SELECTED'
                  ? { selectedAt: new Date() }
                  : {},
        });
        if (feedbackType === 'SAVED') {
          let watchlist = await transaction.watchlist.findFirst({
            where: { userId: user.id, isDefault: true, deletedAt: null },
          });
          watchlist ??= await transaction.watchlist.create({
            data: { userId: user.id, name: 'Watchlist', isDefault: true, visibility: 'PRIVATE' },
          });
          const existing = await transaction.watchlistItem.findUnique({
            where: {
              watchlistId_mediaId: {
                watchlistId: watchlist.id,
                mediaId: recommendation.mediaId,
              },
            },
          });
          if (existing === null) {
            const last = await transaction.watchlistItem.findFirst({
              where: { watchlistId: watchlist.id },
              orderBy: { position: 'desc' },
            });
            await transaction.watchlistItem.create({
              data: {
                watchlistId: watchlist.id,
                mediaId: recommendation.mediaId,
                addedByUserId: user.id,
                position: (last?.position ?? -1) + 1,
              },
            });
            await transaction.watchlist.update({
              where: { id: watchlist.id },
              data: { version: { increment: 1 } },
            });
          }
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return recommendationSummary(
      await this.prisma.recommendation.findUniqueOrThrow({
        where: { id: recommendationId },
        include: { media: { include: { genres: true } }, feedback: true },
      }),
    );
  }

  private async generate(userId: string, force: boolean): Promise<number> {
    const now = new Date();
    const generatedAt = new Date(Math.floor(now.getTime() / 1_000) * 1_000);
    const currentBatch = await this.prisma.recommendation.count({
      where: {
        userId,
        modelVersion: RECOMMENDATION_MODEL_VERSION,
        generatedAt,
        dismissedAt: null,
        feedback: { none: { feedbackType: 'SAVED' } },
      },
    });
    if (currentBatch > 0) return currentBatch;
    if (!force) {
      const active = await this.prisma.recommendation.count({
        where: {
          userId,
          modelVersion: RECOMMENDATION_MODEL_VERSION,
          expiresAt: { gt: now },
          dismissedAt: null,
          feedback: { none: { feedbackType: 'SAVED' } },
        },
      });
      if (active > 0) return active;
    }
    const { rankingTaste } = await this.buildTaste(userId);
    const [history, watchlistItems, dismissed] = await Promise.all([
      this.prisma.watchHistory.findMany({ where: { userId }, select: { mediaId: true } }),
      this.prisma.watchlistItem.findMany({
        where: { watchlist: { userId, deletedAt: null } },
        select: { mediaId: true },
      }),
      this.prisma.recommendation.findMany({
        where: {
          userId,
          dismissedAt: { gt: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) },
        },
        select: { mediaId: true },
      }),
    ]);
    const excludedIds = new Set([
      ...history.map(({ mediaId }) => mediaId),
      ...watchlistItems.map(({ mediaId }) => mediaId),
      ...dismissed.map(({ mediaId }) => mediaId),
    ]);
    const candidates = await this.prisma.media.findMany({
      where: { id: { notIn: [...excludedIds] }, posterUrl: { not: null } },
      include: { genres: true },
      orderBy: [{ providerPopularity: 'desc' }, { averageProviderRating: 'desc' }],
      take: 500,
    });
    const ranked = rankRecommendations(
      rankingTaste,
      candidates.map((media) => ({
        id: media.id,
        genreIds: media.genres.map(({ genreId }) => genreId),
        originalLanguage: media.originalLanguage,
        releaseYear: media.releaseYear,
        runtimeMinutes: media.runtimeMinutes,
        averageProviderRating:
          media.averageProviderRating === null ? null : Number(media.averageProviderRating),
        providerPopularity:
          media.providerPopularity === null ? null : Number(media.providerPopularity),
      })),
    ).slice(0, 100);
    const expiresAt = new Date(generatedAt.getTime() + 24 * 60 * 60 * 1000);
    await this.prisma.$transaction([
      this.prisma.recommendation.updateMany({
        where: {
          userId,
          modelVersion: RECOMMENDATION_MODEL_VERSION,
          expiresAt: { gt: now },
          generatedAt: { lt: generatedAt },
        },
        data: { expiresAt: now },
      }),
      this.prisma.recommendation.createMany({
        data: ranked.map((item) => ({
          userId,
          mediaId: item.mediaId,
          score: item.score,
          recommendationType: item.recommendationType,
          explanation: item.explanation,
          reasonCodes: item.reasonCodes,
          contextJson: item.context as Prisma.InputJsonValue,
          modelVersion: RECOMMENDATION_MODEL_VERSION,
          generatedAt,
          expiresAt,
        })),
        skipDuplicates: true,
      }),
    ]);
    return ranked.length;
  }

  private async buildTaste(userId: string): Promise<{
    profile: TasteProfile;
    rankingTaste: RankingTaste;
  }> {
    const [preferences, genrePreferences, favorites, ratings, histories, feedback] =
      await Promise.all([
        this.prisma.userPreferences.findUnique({ where: { userId } }),
        this.prisma.userGenrePreference.findMany({
          where: { userId },
          include: { genre: true },
        }),
        this.prisma.userFavoriteMedia.findMany({
          where: { userId },
          include: { media: { include: { genres: { include: { genre: true } } } } },
        }),
        this.prisma.rating.findMany({
          where: { userId, deletedAt: null },
          include: { media: { include: { genres: { include: { genre: true } } } } },
        }),
        this.prisma.watchHistory.findMany({
          where: { userId, status: 'COMPLETED' },
          include: { media: { include: { genres: { include: { genre: true } } } } },
        }),
        this.prisma.recommendationFeedback.findMany({
          where: { recommendation: { userId } },
          include: {
            recommendation: {
              include: { media: { include: { genres: { include: { genre: true } } } } },
            },
          },
        }),
      ]);
    if (preferences === null) {
      throw new AppException(
        500,
        'PREFERENCES_MISSING',
        'Recommendation preferences are unavailable.',
      );
    }
    const rawWeights = new Map<string, number>();
    const signalCounts = new Map<string, number>();
    const genreNames: Record<string, string> = {};
    const addGenres = (
      genres: Array<{ genreId: string; genre: { name: string } }>,
      weight: number,
    ) => {
      for (const { genreId, genre } of genres) {
        genreNames[genreId] = genre.name;
        rawWeights.set(genreId, (rawWeights.get(genreId) ?? 0) + weight);
        signalCounts.set(genreId, (signalCounts.get(genreId) ?? 0) + 1);
      }
    };
    for (const preference of genrePreferences) {
      genreNames[preference.genreId] = preference.genre.name;
      rawWeights.set(
        preference.genreId,
        (rawWeights.get(preference.genreId) ?? 0) +
          (preference.preferenceType === 'PREFERRED' ? 1.2 : -2),
      );
      signalCounts.set(preference.genreId, (signalCounts.get(preference.genreId) ?? 0) + 1);
    }
    for (const favorite of favorites) addGenres(favorite.media.genres, 0.8);
    for (const rating of ratings) {
      const normalized =
        rating.normalizedScore === null ? 0.5 : Number(rating.normalizedScore) / 100;
      addGenres(rating.media.genres, normalized >= 0.6 ? normalized : -(0.6 - normalized));
    }
    for (const history of histories) addGenres(history.media.genres, 0.35);
    const savedGenreIds = new Set<string>();
    const dismissedGenreIds = new Set<string>();
    for (const event of feedback) {
      const genres = event.recommendation.media.genres;
      if (event.feedbackType === 'SAVED' || event.feedbackType === 'SELECTED') {
        addGenres(genres, event.feedbackType === 'SAVED' ? 0.5 : 0.15);
        for (const { genreId } of genres) savedGenreIds.add(genreId);
      }
      if (event.feedbackType === 'DISMISSED') {
        addGenres(genres, -0.4);
        for (const { genreId } of genres) dismissedGenreIds.add(genreId);
      }
    }
    const positiveMaximum = Math.max(1, ...[...rawWeights.values()].filter((value) => value > 0));
    const genreWeights = Object.fromEntries(
      [...rawWeights.entries()].map(([genreId, weight]) => [
        genreId,
        Math.max(-1, weight / positiveMaximum),
      ]),
    );
    const topGenres = [...rawWeights.entries()]
      .filter(([, weight]) => weight > 0)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 10)
      .map(([genreId, weight]) => ({
        genreId,
        name: genreNames[genreId] ?? 'Unknown genre',
        weight: Number((weight / positiveMaximum).toFixed(4)),
        signalCount: signalCounts.get(genreId) ?? 0,
      }));
    const totalSignals = favorites.length + ratings.length + histories.length + feedback.length;
    return {
      profile: {
        topGenres,
        dislikedGenreIds: genrePreferences
          .filter(({ preferenceType }) => preferenceType === 'DISLIKED')
          .map(({ genreId }) => genreId),
        preferredLanguages: preferences.preferredLanguages,
        preferredDecades: preferences.preferredDecades,
        runtimeRange: {
          minimum: preferences.preferredRuntimeMin,
          maximum: preferences.preferredRuntimeMax,
        },
        mainstreamPreferencePercent: preferences.mainstreamPreferencePercent,
        signalCounts: {
          favorites: favorites.length,
          ratings: ratings.length,
          completedTitles: histories.length,
          feedbackEvents: feedback.length,
        },
        confidence: totalSignals < 5 ? 'LOW' : totalSignals < 20 ? 'MEDIUM' : 'HIGH',
        modelVersion: RECOMMENDATION_MODEL_VERSION,
        generatedAt: new Date().toISOString(),
      },
      rankingTaste: {
        genreWeights,
        genreNames,
        dislikedGenreIds: genrePreferences
          .filter(({ preferenceType }) => preferenceType === 'DISLIKED')
          .map(({ genreId }) => genreId),
        preferredLanguages: preferences.preferredLanguages.map(
          (language) => language.split('-')[0] ?? language,
        ),
        preferredDecades: preferences.preferredDecades,
        runtimeMinimum: preferences.preferredRuntimeMin,
        runtimeMaximum: preferences.preferredRuntimeMax,
        mainstreamPreferencePercent: preferences.mainstreamPreferencePercent,
        savedGenreIds: [...savedGenreIds],
        dismissedGenreIds: [...dismissedGenreIds],
      },
    };
  }

  private async requireUser(subject: string) {
    const user = await this.prisma.user.findUnique({ where: { authSubject: subject } });
    if (user === null || user.deletedAt !== null) {
      throw new AppException(
        404,
        'USER_NOT_BOOTSTRAPPED',
        'The application profile is unavailable.',
      );
    }
    if (!user.recommendationOptIn) {
      throw new AppException(
        403,
        'RECOMMENDATIONS_DISABLED',
        'Recommendations are disabled in your settings.',
      );
    }
    return user;
  }
}
