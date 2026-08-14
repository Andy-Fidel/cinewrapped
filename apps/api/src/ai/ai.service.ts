import type {
  ConversationalRecommendationResult,
  IntelligentDiscoveryResult,
  MovieDnaProfile,
  MovieDnaTrait,
  ReviewAssistantResult,
  ReviewAssistantStyle,
} from '@cinewrapped/shared-types';
import { Inject, Injectable } from '@nestjs/common';

import type { AuthPrincipal } from '../auth/auth.types.js';
import { AppException } from '../common/app.exception.js';
import { PrismaService } from '../database/prisma.service.js';
import { MediaCatalogService } from '../media-provider/media-catalog.service.js';
import { AI_PROVIDER, type AiProvider } from './grounded-ai.provider.js';
import { interpretDiscoveryQuery, TMDB_GENRE_IDS } from './discovery-interpreter.js';

function mostCommon(values: string[]): { value: string; count: number } | null {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  const first = [...counts.entries()].sort(
    ([leftValue, leftCount], [rightValue, rightCount]) =>
      rightCount - leftCount || leftValue.localeCompare(rightValue),
  )[0];
  return first === undefined ? null : { value: first[0], count: first[1] };
}

function trait(
  key: string,
  label: string,
  value: string,
  evidenceCount: number,
  explanation: string,
): MovieDnaTrait {
  return { key, label, value, evidenceCount, explanation };
}

@Injectable()
export class AiService {
  public constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MediaCatalogService) private readonly catalog: MediaCatalogService,
    @Inject(AI_PROVIDER) private readonly provider: AiProvider,
  ) {}

  public async discover(
    principal: AuthPrincipal,
    input: { query: string; language: string; countryCode: string },
  ): Promise<IntelligentDiscoveryResult> {
    const user = await this.requireUser(principal.subject);
    const interpretation = interpretDiscoveryQuery(input.query);
    const providers =
      interpretation.streamingServices.length === 0
        ? []
        : await this.prisma.streamingProvider.findMany({
            where: {
              OR: interpretation.streamingServices.map((name) => ({
                name: { contains: name, mode: 'insensitive' as const },
              })),
            },
            select: { externalId: true },
          });
    const preferredProviders =
      interpretation.streamingServices.length > 0
        ? providers.map(({ externalId }) => externalId)
        : (
            await this.prisma.userStreamingPreference.findMany({
              where: { userId: user.id },
              include: { streamingProvider: { select: { externalId: true } } },
            })
          ).map(({ streamingProvider }) => streamingProvider.externalId);
    const results = await this.catalog.discover(
      {
        mediaType: interpretation.mediaType,
        genreExternalIds: interpretation.genres
          .map((name) => TMDB_GENRE_IDS[name])
          .filter((id): id is string => id !== undefined),
        ...(interpretation.originalLanguage === null
          ? {}
          : { originalLanguage: interpretation.originalLanguage }),
        ...(interpretation.releaseYearMinimum === null
          ? {}
          : { releaseYearMinimum: interpretation.releaseYearMinimum }),
        ...(interpretation.releaseYearMaximum === null
          ? {}
          : { releaseYearMaximum: interpretation.releaseYearMaximum }),
        ...(interpretation.runtimeMaximum === null
          ? {}
          : { runtimeMaximum: interpretation.runtimeMaximum }),
        ...(interpretation.minimumRating === null
          ? {}
          : { minimumRating: interpretation.minimumRating }),
        ...(interpretation.hiddenGemsOnly ? { maximumPopularity: 30 } : {}),
        ...(preferredProviders.length === 0
          ? {}
          : {
              watchRegion: input.countryCode,
              watchProviderExternalIds: preferredProviders,
            }),
      },
      input.language,
      1,
    );
    return {
      interpretation,
      results,
      source: 'LOCAL_GROUNDED',
      notice:
        interpretation.unsupportedConstraints.length === 0
          ? 'Filters were derived locally and results come from TMDB. Verify streaming availability on the title page.'
          : `${interpretation.unsupportedConstraints.join('. ')}. Those constraints were not used to rank results.`,
    };
  }

  public async conversation(
    principal: AuthPrincipal,
    input: {
      query: string;
      language: string;
      countryCode: string;
      turns: Array<{ role: 'USER' | 'ASSISTANT'; content: string }>;
    },
  ): Promise<ConversationalRecommendationResult> {
    const previousUserContext = input.turns
      .filter(({ role }) => role === 'USER')
      .slice(-2)
      .map(({ content }) => content)
      .join(' ');
    const discovery = await this.discover(principal, {
      ...input,
      query: `${previousUserContext} ${input.query}`.trim(),
    });
    const count = discovery.results.length;
    return {
      ...discovery,
      reply:
        count === 0
          ? `I understood the request, but no provider results met all verified filters. Try relaxing runtime, year, genre, or service constraints.`
          : `${discovery.interpretation.explanation} I found ${count} grounded match${count === 1 ? '' : 'es'} and did not infer unverified plot or ending details.`,
      suggestedFollowUps: [
        'Make it shorter than 100 minutes',
        'Show me hidden gems instead',
        'Make the mood more uplifting',
      ],
    };
  }

  public async reviewDraft(
    principal: AuthPrincipal,
    input: {
      mediaId: string;
      notes: string;
      style: ReviewAssistantStyle;
      containsSpoilers: boolean;
    },
  ): Promise<ReviewAssistantResult> {
    const user = await this.requireUser(principal.subject);
    const media = await this.prisma.media.findUnique({ where: { id: input.mediaId } });
    if (media === null) throw new AppException(404, 'MEDIA_NOT_FOUND', 'The title was not found.');
    const tracking = await this.prisma.watchHistory.findUnique({
      where: { userId_mediaId: { userId: user.id, mediaId: media.id } },
    });
    if (tracking === null) {
      throw new AppException(
        409,
        'REVIEW_CONTEXT_REQUIRED',
        'Add this title to your activity before using the review assistant.',
      );
    }
    return this.provider.reviewDraft({
      title: media.title,
      releaseYear: media.releaseYear,
      notes: input.notes,
      style: input.style,
      containsSpoilers: input.containsSpoilers,
    });
  }

  public async movieDna(principal: AuthPrincipal): Promise<MovieDnaProfile> {
    const user = await this.requireUser(principal.subject);
    const [history, ratings] = await Promise.all([
      this.prisma.watchHistory.findMany({
        where: { userId: user.id, status: { in: ['COMPLETED', 'REWATCHING'] } },
        include: {
          media: {
            include: {
              genres: { include: { genre: true } },
              credits: { include: { person: true } },
            },
          },
        },
      }),
      this.prisma.rating.findMany({ where: { userId: user.id, deletedAt: null } }),
    ]);
    const sampleSize = history.length;
    const genres = mostCommon(
      history.flatMap(({ media }) => media.genres.map(({ genre }) => genre.name)),
    );
    const languages = mostCommon(
      history.flatMap(({ media }) =>
        media.originalLanguage === null ? [] : [media.originalLanguage],
      ),
    );
    const countries = mostCommon(history.flatMap(({ media }) => media.countryCodes));
    const decades = mostCommon(
      history.flatMap(({ media }) =>
        media.releaseYear === null ? [] : [`${Math.floor(media.releaseYear / 10) * 10}s`],
      ),
    );
    const people = mostCommon(
      history.flatMap(({ media }) =>
        media.credits
          .filter(
            ({ creditType, job }) =>
              creditType === 'CAST' || job === 'Director' || job === 'Creator',
          )
          .map(({ person }) => person.name),
      ),
    );
    const moods = mostCommon(ratings.flatMap(({ emotionalTags }) => emotionalTags));
    const runtimes = history
      .map(({ media }) => media.runtimeMinutes)
      .filter((runtime): runtime is number => runtime !== null);
    const averageRuntime =
      runtimes.length === 0
        ? null
        : Math.round(runtimes.reduce((sum, runtime) => sum + runtime, 0) / runtimes.length);
    const rewatches = history.filter(({ watchCount }) => watchCount > 1).length;
    const popularityValues = history
      .map(({ media }) => media.providerPopularity)
      .filter((value) => value !== null)
      .map(Number);
    const mainstreamPercent =
      popularityValues.length === 0
        ? null
        : Math.round(
            (popularityValues.filter((popularity) => popularity >= 50).length /
              popularityValues.length) *
              100,
          );
    const providerRatings = history
      .map(({ media }) => media.averageProviderRating)
      .filter((value) => value !== null)
      .map(Number);
    const providerAverage =
      providerRatings.length === 0
        ? null
        : providerRatings.reduce((sum, rating) => sum + rating, 0) / providerRatings.length;
    const traits: MovieDnaTrait[] = [];
    if (genres !== null)
      traits.push(
        trait(
          'genre',
          'Genre signature',
          genres.value,
          genres.count,
          `${genres.count} completed titles include this genre.`,
        ),
      );
    if (averageRuntime !== null)
      traits.push(
        trait(
          'runtime',
          'Runtime rhythm',
          `${averageRuntime} min average`,
          runtimes.length,
          'Calculated only from titles with known runtimes.',
        ),
      );
    if (decades !== null)
      traits.push(
        trait(
          'decade',
          'Era affinity',
          decades.value,
          decades.count,
          `${decades.count} completed titles come from this decade.`,
        ),
      );
    if (languages !== null)
      traits.push(
        trait(
          'language',
          'Most-watched language',
          languages.value,
          languages.count,
          'Based on provider-recorded original language.',
        ),
      );
    if (countries !== null)
      traits.push(
        trait(
          'country',
          'Cinema passport leader',
          countries.value,
          countries.count,
          'Based on known production countries.',
        ),
      );
    if (people !== null)
      traits.push(
        trait(
          'creator',
          'Recurring collaborator',
          people.value,
          people.count,
          'Most frequent known cast member, director, or creator.',
        ),
      );
    if (mainstreamPercent !== null)
      traits.push(
        trait(
          'mainstream',
          'Mainstream–niche balance',
          `${mainstreamPercent}% mainstream`,
          popularityValues.length,
          'A transparent provider-popularity split, not a judgment of taste.',
        ),
      );
    if (rewatches > 0)
      traits.push(
        trait(
          'rewatch',
          'Comfort-watch signal',
          `${rewatches} rewatched title${rewatches === 1 ? '' : 's'}`,
          rewatches,
          'Derived from watch counts greater than one.',
        ),
      );
    if (moods !== null)
      traits.push(
        trait(
          'mood',
          'Emotional signature',
          moods.value,
          moods.count,
          'Based only on emotional tags you added to ratings.',
        ),
      );
    if (providerAverage !== null)
      traits.push(
        trait(
          'critic',
          'Provider-score tendency',
          `${providerAverage.toFixed(1)}/10 average`,
          providerRatings.length,
          'Average external score of completed titles; it is not your personal rating.',
        ),
      );
    const distinctLanguages = new Set(history.flatMap(({ media }) => media.originalLanguage ?? []))
      .size;
    const distinctDecades = new Set(
      history.flatMap(({ media }) =>
        media.releaseYear === null ? [] : [Math.floor(media.releaseYear / 10) * 10],
      ),
    ).size;
    const label =
      sampleSize < 5
        ? 'Developing Taste'
        : distinctLanguages >= 5
          ? 'Global Explorer'
          : distinctDecades >= 5
            ? 'Film Historian'
            : mainstreamPercent !== null && mainstreamPercent < 35
              ? 'Hidden-Gem Hunter'
              : rewatches >= Math.max(2, sampleSize * 0.25)
                ? 'Comfort Curator'
                : 'Genre Loyalist';
    return {
      label,
      confidence: sampleSize < 5 ? 'LOW' : sampleSize < 20 ? 'MEDIUM' : 'HIGH',
      sampleSize,
      traits,
      generatedAt: new Date().toISOString(),
      modelVersion: 'grounded-dna-v1',
      notice:
        'Every trait lists its evidence count. Missing or unsupported signals are omitted rather than guessed.',
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
        'AI_FEATURES_DISABLED',
        'Intelligent features follow your recommendation opt-in setting.',
      );
    }
    return user;
  }
}
