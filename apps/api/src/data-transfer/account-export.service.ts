import { accountExportCollections } from '@cinewrapped/shared-types';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { uuidSchema } from '@cinewrapped/validation';
import type { AuthPrincipal } from '../auth/auth.types.js';
import { AppException } from '../common/app.exception.js';
import { PrismaService } from '../database/prisma.service.js';

export const exportCollections = accountExportCollections;
export const exportQuerySchema = z.object({
  collection: z.enum(exportCollections),
  cursor: uuidSchema.optional(),
  asOf: z.iso.datetime({ offset: true }).optional(),
});
@Injectable()
export class AccountExportService {
  constructor(private readonly prisma: PrismaService) {}
  public async page(principal: AuthPrincipal, query: z.output<typeof exportQuerySchema>) {
    const user = await this.prisma.user.findFirst({
      where: { authSubject: principal.subject, deletedAt: null },
      select: { id: true },
    });
    if (!user)
      throw new AppException(
        404,
        'USER_NOT_BOOTSTRAPPED',
        'The application profile is unavailable.',
      );
    const asOf = query.asOf ? new Date(query.asOf) : new Date();
    if (asOf > new Date())
      throw new AppException(
        422,
        'EXPORT_DATE_INVALID',
        'The export date cannot be in the future.',
      );
    if (query.collection === 'profile') {
      const profile = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          bio: true,
          countryCode: true,
          preferredLanguage: true,
          timezone: true,
          dateOfBirth: true,
          profileVisibility: true,
          recommendationOptIn: true,
          analyticsOptIn: true,
          createdAt: true,
          preferences: true,
          privacySettings: true,
          genrePreferences: true,
          favoriteMedia: true,
          streamingPreferences: true,
        },
      });
      return {
        collection: query.collection,
        asOf: asOf.toISOString(),
        records: [profile],
        nextCursor: null,
      };
    }
    const after = query.cursor ? { gt: query.cursor } : undefined;
    const createdAt = { lte: asOf };
    const relationQueries: Record<string, () => Promise<unknown[]>> = {
      following: () =>
        this.prisma.follow.findMany({
          where: { followerId: user.id, createdAt, ...(after ? { followingId: after } : {}) },
          orderBy: { followingId: 'asc' },
          take: 101,
        }),
      followers: () =>
        this.prisma.follow.findMany({
          where: { followingId: user.id, createdAt, ...(after ? { followerId: after } : {}) },
          orderBy: { followerId: 'asc' },
          take: 101,
        }),
      blocks: () =>
        this.prisma.userBlock.findMany({
          where: { blockerId: user.id, createdAt, ...(after ? { blockedId: after } : {}) },
          orderBy: { blockedId: 'asc' },
          take: 101,
        }),
      mutes: () =>
        this.prisma.userMute.findMany({
          where: { muterId: user.id, createdAt, ...(after ? { mutedId: after } : {}) },
          orderBy: { mutedId: 'asc' },
          take: 101,
        }),
    };
    const relation = relationQueries[query.collection];
    if (relation) {
      const rows = await relation();
      const records = rows.slice(0, 100);
      const field = {
        following: 'followingId',
        followers: 'followerId',
        blocks: 'blockedId',
        mutes: 'mutedId',
      }[query.collection as 'following' | 'followers' | 'blocks' | 'mutes'];
      return {
        collection: query.collection,
        asOf: asOf.toISOString(),
        records,
        nextCursor: rows.length > 100 ? (records.at(-1) as Record<string, string>)[field] : null,
      };
    }
    const where = {
      userId: user.id,
      createdAt: { lte: asOf },
      ...(query.cursor ? { id: { gt: query.cursor } } : {}),
    };
    const args = { where, orderBy: { id: 'asc' as const }, take: 101 };
    const media = {
      select: { id: true, title: true, mediaType: true, externalId: true, releaseYear: true },
    };
    const loaders: Partial<Record<typeof query.collection, () => Promise<unknown[]>>> = {
      friendships: () =>
        this.prisma.friendship.findMany({
          ...args,
          where: {
            OR: [{ userAId: user.id }, { userBId: user.id }],
            createdAt: where.createdAt,
            ...(after ? { id: after } : {}),
          },
        }),
      clubs: () =>
        this.prisma.club.findMany({
          ...args,
          where: { ownerId: user.id, createdAt: where.createdAt, ...(after ? { id: after } : {}) },
        }),
      clubMemberships: () => this.prisma.clubMember.findMany(args),
      clubPosts: () =>
        this.prisma.clubPost.findMany({
          ...args,
          where: { authorId: user.id, createdAt: where.createdAt, ...(after ? { id: after } : {}) },
        }),
      clubPolls: () =>
        this.prisma.clubPoll.findMany({
          ...args,
          where: {
            createdById: user.id,
            createdAt: where.createdAt,
            ...(after ? { id: after } : {}),
          },
        }),
      clubWatchEvents: () =>
        this.prisma.clubWatchEvent.findMany({
          ...args,
          where: {
            createdById: user.id,
            createdAt: where.createdAt,
            ...(after ? { id: after } : {}),
          },
        }),
      clubWatchlistSuggestions: () =>
        this.prisma.clubWatchlistItem.findMany({
          ...args,
          where: {
            suggestedById: user.id,
            createdAt: where.createdAt,
            ...(after ? { id: after } : {}),
          },
        }),
      library: () => this.prisma.watchHistory.findMany({ ...args, include: { media } }),
      viewings: () =>
        this.prisma.viewing.findMany({ ...args, include: { media, companions: true } }),
      episodeProgress: () => this.prisma.episodeWatchHistory.findMany(args),
      ratings: () => this.prisma.rating.findMany({ ...args, include: { media } }),
      reviews: () => this.prisma.review.findMany({ ...args, include: { media } }),
      journal: () => this.prisma.journalEntry.findMany({ ...args, include: { attachments: true } }),
      calendar: () => this.prisma.calendarEvent.findMany(args),
      watchlists: () => this.prisma.watchlist.findMany(args),
      watchlistItems: () =>
        this.prisma.watchlistItem.findMany({
          ...args,
          where: {
            watchlist: { userId: user.id },
            createdAt: where.createdAt,
            ...(query.cursor ? { id: { gt: query.cursor } } : {}),
          },
          include: { media },
        }),
      comments: () => this.prisma.comment.findMany(args),
      reactions: () => this.prisma.reaction.findMany(args),
      notifications: () => this.prisma.notification.findMany(args),
      wraps: () => this.prisma.wrap.findMany(args),
      searchHistory: () => this.prisma.searchHistory.findMany(args),
      soundtrackSaves: () => this.prisma.soundtrackSave.findMany(args),
      sceneIdentifications: () => this.prisma.sceneIdentification.findMany(args),
    };
    const loader = loaders[query.collection];
    if (!loader)
      throw new AppException(
        422,
        'EXPORT_COLLECTION_INVALID',
        'The export collection is unavailable.',
      );
    const rows = await loader();
    const records = rows.slice(0, 100);
    return {
      collection: query.collection,
      asOf: asOf.toISOString(),
      records,
      nextCursor: rows.length > 100 ? (records.at(-1) as { id: string }).id : null,
    };
  }
}
