import { Prisma } from '@cinewrapped/database';
import type {
  ClubSummary,
  MediaSummary,
  SearchHistoryItem,
  SearchListDetails,
  SearchListSummary,
  SearchPersonSummary,
  SearchResults,
  SearchSuggestion,
  TrendingSearch,
  UserSummary,
} from '@cinewrapped/shared-types';
import type { unifiedSearchSchema } from '@cinewrapped/validation';
import { Injectable } from '@nestjs/common';
import type { z } from 'zod';

import type { AuthPrincipal } from '../auth/auth.types.js';
import { AppException } from '../common/app.exception.js';
import { PrismaService } from '../database/prisma.service.js';
import { MediaCatalogService } from '../media-provider/media-catalog.service.js';
import type { ProviderDiscoveryFilters } from '../media-provider/media-provider.types.js';

export type UnifiedSearchInput = z.output<typeof unifiedSearchSchema>;

const fallbackTrending = [
  'New releases',
  'Award winners',
  'Hidden gems',
  'Science fiction',
  'Comedy',
  'Documentaries',
];

type MediaRecord = Prisma.MediaGetPayload<{ include: { genres: true } }>;

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

function userSummary(user: {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
}): UserSummary {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
  };
}

function normalizeQuery(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/gu, ' ');
}

@Injectable()
export class SearchService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: MediaCatalogService,
  ) {}

  public async search(principal: AuthPrincipal, input: UnifiedSearchInput): Promise<SearchResults> {
    const viewer = await this.requireUser(principal.subject);
    const friendIds = await this.friendIds(viewer.id);
    const q = input.q.trim();
    const requested = new Set(input.categories);
    const canSearchTextEntities = q.length >= 2;

    const [media, users, people, lists, clubs] = await Promise.all([
      requested.has('MEDIA') ? this.media(viewer.id, friendIds, input) : [],
      requested.has('USER') && canSearchTextEntities
        ? this.users(viewer.id, friendIds, q, input.limit)
        : [],
      requested.has('PERSON') && canSearchTextEntities
        ? this.people(q, input.language, input.limit)
        : [],
      requested.has('LIST') && canSearchTextEntities
        ? this.lists(viewer.id, friendIds, q, input.limit)
        : [],
      requested.has('CLUB') && canSearchTextEntities ? this.clubs(viewer.id, q, input.limit) : [],
    ]);
    const result: SearchResults = {
      media,
      users,
      people,
      lists,
      clubs,
      totalCount: media.length + users.length + people.length + lists.length + clubs.length,
    };
    if (q.length >= 2) await this.record(viewer.id, input, result.totalCount);
    return result;
  }

  public async suggestions(
    principal: AuthPrincipal,
    query: string,
    limit: number,
  ): Promise<SearchSuggestion[]> {
    const viewer = await this.requireUser(principal.subject);
    const q = query.trim();
    const [history, media, users, people, lists, clubs] = await Promise.all([
      this.prisma.searchHistory.findMany({
        where: { userId: viewer.id, query: { contains: q, mode: 'insensitive' } },
        select: { query: true },
        orderBy: { lastSearchedAt: 'desc' },
        take: limit,
      }),
      this.prisma.media.findMany({
        where: { title: { contains: q, mode: 'insensitive' } },
        select: { title: true },
        orderBy: { providerPopularity: 'desc' },
        take: limit,
      }),
      this.prisma.user.findMany({
        where: {
          id: { not: viewer.id },
          deletedAt: null,
          profileVisibility: 'PUBLIC',
          OR: [
            { usernameNormalized: { contains: q.toLocaleLowerCase() } },
            { displayName: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { displayName: true },
        take: limit,
      }),
      this.prisma.person.findMany({
        where: { name: { contains: q, mode: 'insensitive' } },
        select: { name: true },
        take: limit,
      }),
      this.prisma.watchlist.findMany({
        where: {
          deletedAt: null,
          name: { contains: q, mode: 'insensitive' },
          OR: [{ userId: viewer.id }, { visibility: 'PUBLIC' }],
        },
        select: { name: true },
        take: limit,
      }),
      this.prisma.club.findMany({
        where: {
          deletedAt: null,
          visibility: 'PUBLIC',
          name: { contains: q, mode: 'insensitive' },
        },
        select: { name: true },
        take: limit,
      }),
    ]);
    const candidates: SearchSuggestion[] = [
      ...history.map(({ query: text }) => ({ text, category: 'RECENT' as const })),
      ...media.map(({ title: text }) => ({ text, category: 'MEDIA' as const })),
      ...users.map(({ displayName: text }) => ({ text, category: 'USER' as const })),
      ...people.map(({ name: text }) => ({ text, category: 'PERSON' as const })),
      ...lists.map(({ name: text }) => ({ text, category: 'LIST' as const })),
      ...clubs.map(({ name: text }) => ({ text, category: 'CLUB' as const })),
    ];
    const seen = new Set<string>();
    return candidates
      .filter(({ text }) => {
        const normalized = normalizeQuery(text);
        if (seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
      })
      .slice(0, limit);
  }

  public async history(principal: AuthPrincipal, limit: number): Promise<SearchHistoryItem[]> {
    const user = await this.requireUser(principal.subject);
    const history = await this.prisma.searchHistory.findMany({
      where: { userId: user.id },
      orderBy: [{ lastSearchedAt: 'desc' }, { id: 'desc' }],
      take: limit,
    });
    return history.map((item) => ({
      id: item.id,
      query: item.query,
      resultCount: item.resultCount,
      searchCount: item.searchCount,
      lastSearchedAt: item.lastSearchedAt.toISOString(),
    }));
  }

  public async trending(): Promise<TrendingSearch[]> {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1_000);
    const rows = await this.prisma.searchHistory.findMany({
      where: { lastSearchedAt: { gte: since } },
      select: { normalizedQuery: true, query: true, searchCount: true, userId: true },
      orderBy: { lastSearchedAt: 'desc' },
      take: 2_000,
    });
    const aggregate = new Map<string, { query: string; searchCount: number; users: Set<string> }>();
    for (const row of rows) {
      const current = aggregate.get(row.normalizedQuery) ?? {
        query: row.query,
        searchCount: 0,
        users: new Set<string>(),
      };
      current.searchCount += row.searchCount;
      current.users.add(row.userId);
      aggregate.set(row.normalizedQuery, current);
    }
    const trending = [...aggregate.values()]
      .filter(({ users }) => users.size >= 2)
      .sort((a, b) => b.searchCount - a.searchCount)
      .slice(0, 10)
      .map(({ query, searchCount }) => ({ query, searchCount }));
    return trending.length > 0
      ? trending
      : fallbackTrending.map((query, index) => ({
          query,
          searchCount: fallbackTrending.length - index,
        }));
  }

  public async removeHistory(principal: AuthPrincipal, historyId: string): Promise<void> {
    const user = await this.requireUser(principal.subject);
    await this.prisma.searchHistory.deleteMany({ where: { id: historyId, userId: user.id } });
  }

  public async listDetails(principal: AuthPrincipal, listId: string): Promise<SearchListDetails> {
    const viewer = await this.requireUser(principal.subject);
    const friendIds = await this.friendIds(viewer.id);
    const list = await this.prisma.watchlist.findFirst({
      where: {
        id: listId,
        deletedAt: null,
        OR: [
          { userId: viewer.id },
          { visibility: 'PUBLIC' },
          { visibility: 'FRIENDS', userId: { in: friendIds } },
        ],
      },
      include: {
        user: true,
        _count: { select: { items: true } },
        items: {
          include: { media: { include: { genres: true } } },
          orderBy: { position: 'asc' },
        },
      },
    });
    if (list === null)
      throw new AppException(404, 'SEARCH_LIST_NOT_FOUND', 'The list was not found.');
    return {
      id: list.id,
      name: list.name,
      description: list.description,
      visibility: list.visibility,
      itemCount: list._count.items,
      owner: userSummary(list.user),
      updatedAt: list.updatedAt.toISOString(),
      items: list.items.map((item) => ({
        id: item.id,
        position: item.position,
        note: item.note,
        createdAt: item.createdAt.toISOString(),
        media: mediaSummary(item.media),
      })),
    };
  }

  public async clearHistory(principal: AuthPrincipal): Promise<void> {
    const user = await this.requireUser(principal.subject);
    await this.prisma.searchHistory.deleteMany({ where: { userId: user.id } });
  }

  private async media(
    viewerId: string,
    friendIds: string[],
    input: UnifiedSearchInput,
  ): Promise<MediaSummary[]> {
    const [genres, providers] = await Promise.all([
      input.genreIds?.length
        ? this.prisma.genre.findMany({
            where: { id: { in: input.genreIds } },
            select: { id: true, externalId: true },
          })
        : [],
      input.streamingProviderIds?.length
        ? this.prisma.streamingProvider.findMany({
            where: { id: { in: input.streamingProviderIds } },
            select: { id: true, externalId: true },
          })
        : [],
    ]);
    const genreExternalIds = genres.map(({ externalId }) => externalId);
    const providerExternalIds = providers.map(({ externalId }) => externalId);
    let candidates: MediaSummary[];
    if (input.q.length >= 2) {
      candidates = await this.catalog.search(
        input.q,
        input.language,
        {
          ...(input.mediaType === undefined ? {} : { mediaType: input.mediaType }),
          ...(input.releaseYear === undefined ? {} : { releaseYear: input.releaseYear }),
          ...(input.genreIds === undefined ? {} : { genreIds: input.genreIds }),
          limit: 20,
        },
        1,
      );
    } else {
      const mediaTypes =
        input.mediaType === undefined ? (['MOVIE', 'TV'] as const) : [input.mediaType];
      const discovered = await Promise.all(
        mediaTypes.map((mediaType) => {
          const filters: ProviderDiscoveryFilters = {
            mediaType,
            genreExternalIds,
            ...(input.originalLanguage === undefined
              ? {}
              : { originalLanguage: input.originalLanguage }),
            ...(input.productionCountry === undefined
              ? {}
              : { productionCountry: input.productionCountry }),
            ...(input.releaseYear === undefined
              ? input.decade === undefined
                ? {}
                : { releaseYearMinimum: input.decade, releaseYearMaximum: input.decade + 9 }
              : { releaseYearMinimum: input.releaseYear, releaseYearMaximum: input.releaseYear }),
            ...(input.runtimeMinimum === undefined ? {} : { runtimeMinimum: input.runtimeMinimum }),
            ...(input.runtimeMaximum === undefined ? {} : { runtimeMaximum: input.runtimeMaximum }),
            ...(input.minimumRating === undefined ? {} : { minimumRating: input.minimumRating }),
            ...(input.minimumPopularity === undefined
              ? {}
              : { minimumPopularity: input.minimumPopularity }),
            ...(providerExternalIds.length === 0
              ? {}
              : {
                  watchRegion: input.countryCode,
                  watchProviderExternalIds: providerExternalIds,
                }),
          };
          return this.catalog.discover(filters, input.language, 1);
        }),
      );
      candidates = discovered.flat();
    }
    if (candidates.length === 0) return [];
    const strictProviderFields = input.q.length >= 2;
    const where: Prisma.MediaWhereInput = {
      id: { in: candidates.map(({ id }) => id) },
      ...(input.mediaType === undefined ? {} : { mediaType: input.mediaType }),
      ...(strictProviderFields && input.releaseYear !== undefined
        ? { releaseYear: input.releaseYear }
        : strictProviderFields && input.decade !== undefined
          ? { releaseYear: { gte: input.decade, lte: input.decade + 9 } }
          : {}),
      ...(strictProviderFields && input.runtimeMinimum !== undefined
        ? { runtimeMinutes: { gte: input.runtimeMinimum } }
        : {}),
      ...(strictProviderFields && input.runtimeMaximum !== undefined
        ? {
            runtimeMinutes: {
              ...(input.runtimeMinimum === undefined ? {} : { gte: input.runtimeMinimum }),
              lte: input.runtimeMaximum,
            },
          }
        : {}),
      ...(strictProviderFields && input.originalLanguage !== undefined
        ? { originalLanguage: input.originalLanguage }
        : {}),
      ...(strictProviderFields && input.productionCountry !== undefined
        ? { countryCodes: { has: input.productionCountry } }
        : {}),
      ...(strictProviderFields && input.minimumRating !== undefined
        ? { averageProviderRating: { gte: input.minimumRating } }
        : {}),
      ...(strictProviderFields && input.minimumPopularity !== undefined
        ? { providerPopularity: { gte: input.minimumPopularity } }
        : {}),
      AND: [
        ...(input.genreIds ?? []).map((genreId) => ({ genres: { some: { genreId } } })),
        ...(input.friendsWatched
          ? [{ viewings: { some: { userId: { in: friendIds }, deletedAt: null } } }]
          : []),
        ...(input.friendsRatedHighly
          ? [
              {
                ratings: {
                  some: {
                    userId: { in: friendIds },
                    normalizedScore: { gte: 80 },
                    deletedAt: null,
                  },
                },
              },
            ]
          : []),
        ...(input.unwatchedOnly
          ? [{ viewings: { none: { userId: viewerId, deletedAt: null } } }]
          : []),
      ],
      ...(strictProviderFields && input.streamingProviderIds?.length
        ? {
            streamingAvailability: {
              some: {
                streamingProviderId: { in: input.streamingProviderIds },
                countryCode: input.countryCode,
                expiresAt: { gt: new Date() },
              },
            },
          }
        : {}),
    };
    const records = await this.prisma.media.findMany({ where, include: { genres: true } });
    const byId = new Map(records.map((media) => [media.id, mediaSummary(media)]));
    return candidates
      .flatMap(({ id }) => {
        const item = byId.get(id);
        return item === undefined ? [] : [item];
      })
      .filter((item, index, all) => all.findIndex(({ id }) => id === item.id) === index)
      .slice(0, input.limit);
  }

  private async users(
    viewerId: string,
    friendIds: string[],
    q: string,
    limit: number,
  ): Promise<UserSummary[]> {
    const blocked = await this.blockedIds(viewerId);
    const users = await this.prisma.user.findMany({
      where: {
        id: { notIn: [viewerId, ...blocked] },
        deletedAt: null,
        OR: [{ profileVisibility: 'PUBLIC' }, { id: { in: friendIds } }],
        AND: [
          {
            OR: [
              { usernameNormalized: { contains: q.toLocaleLowerCase() } },
              { displayName: { contains: q, mode: 'insensitive' } },
            ],
          },
        ],
      },
      orderBy: { usernameNormalized: 'asc' },
      take: limit,
    });
    return users.map(userSummary);
  }

  private async people(q: string, language: string, limit: number): Promise<SearchPersonSummary[]> {
    try {
      return await this.catalog.searchPeople(q, language, limit);
    } catch {
      // Known local credits remain searchable during a provider outage.
    }
    const people = await this.prisma.person.findMany({
      where: { name: { contains: q, mode: 'insensitive' } },
      include: {
        credits: {
          include: { media: { include: { genres: true } } },
          orderBy: { media: { providerPopularity: 'desc' } },
          take: 3,
        },
      },
      orderBy: { name: 'asc' },
      take: limit,
    });
    return people.map((person) => ({
      id: person.id,
      name: person.name,
      profileUrl: person.profileUrl,
      knownFor: person.credits.map(({ media }) => mediaSummary(media)),
    }));
  }

  private async lists(
    viewerId: string,
    friendIds: string[],
    q: string,
    limit: number,
  ): Promise<SearchListSummary[]> {
    const lists = await this.prisma.watchlist.findMany({
      where: {
        deletedAt: null,
        AND: [
          {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
            ],
          },
          {
            OR: [
              { userId: viewerId },
              { visibility: 'PUBLIC' },
              { visibility: 'FRIENDS', userId: { in: friendIds } },
            ],
          },
        ],
      },
      include: { user: true, _count: { select: { items: true } } },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
    return lists.map((list) => ({
      id: list.id,
      name: list.name,
      description: list.description,
      visibility: list.visibility,
      itemCount: list._count.items,
      owner: userSummary(list.user),
      updatedAt: list.updatedAt.toISOString(),
    }));
  }

  private async clubs(viewerId: string, q: string, limit: number): Promise<ClubSummary[]> {
    const clubs = await this.prisma.club.findMany({
      where: {
        deletedAt: null,
        AND: [
          {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
              { category: { contains: q, mode: 'insensitive' } },
            ],
          },
          {
            OR: [
              { visibility: 'PUBLIC' },
              { members: { some: { userId: viewerId, status: 'ACTIVE' } } },
            ],
          },
        ],
      },
      include: {
        members: {
          where: { userId: viewerId },
          select: { id: true, role: true, status: true },
          take: 1,
        },
      },
      orderBy: [{ memberCount: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });
    return clubs.map((club) => ({
      id: club.id,
      name: club.name,
      slug: club.slug,
      description: club.description,
      coverImageUrl: club.coverImageUrl,
      visibility: club.visibility,
      membershipType: club.membershipType,
      category: club.category,
      memberCount: club.memberCount,
      membership: club.members[0] ?? null,
      createdAt: club.createdAt.toISOString(),
      updatedAt: club.updatedAt.toISOString(),
    }));
  }

  private async record(userId: string, input: UnifiedSearchInput, resultCount: number) {
    const normalizedQuery = normalizeQuery(input.q);
    const filters = { ...input, q: undefined, categories: undefined };
    await this.prisma.searchHistory.upsert({
      where: { userId_normalizedQuery: { userId, normalizedQuery } },
      create: {
        userId,
        query: input.q.trim(),
        normalizedQuery,
        filtersJson: JSON.parse(JSON.stringify(filters)) as Prisma.InputJsonValue,
        resultCount,
      },
      update: {
        query: input.q.trim(),
        filtersJson: JSON.parse(JSON.stringify(filters)) as Prisma.InputJsonValue,
        resultCount,
        searchCount: { increment: 1 },
        lastSearchedAt: new Date(),
      },
    });
  }

  private async requireUser(subject: string) {
    const user = await this.prisma.user.findUnique({ where: { authSubject: subject } });
    if (user === null || user.deletedAt !== null)
      throw new AppException(404, 'USER_NOT_FOUND', 'The signed-in user was not found.');
    return user;
  }

  private async friendIds(userId: string): Promise<string[]> {
    const friendships = await this.prisma.friendship.findMany({
      where: { status: 'ACCEPTED', OR: [{ userAId: userId }, { userBId: userId }] },
      select: { userAId: true, userBId: true },
    });
    return friendships.map(({ userAId, userBId }) => (userAId === userId ? userBId : userAId));
  }

  private async blockedIds(userId: string): Promise<string[]> {
    const blocks = await this.prisma.userBlock.findMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
      select: { blockerId: true, blockedId: true },
    });
    return blocks.map(({ blockerId, blockedId }) => (blockerId === userId ? blockedId : blockerId));
  }
}
