import type {
  CommentSummary,
  FeedActivitySummary,
  FriendshipSummary,
  MediaSummary,
  PublicProfile,
  ReactionSummary,
  RelationshipState,
  ShareReceipt,
  UserSummary,
} from '@cinewrapped/shared-types';
import { Prisma } from '@cinewrapped/database';
import { Injectable } from '@nestjs/common';

import type { AuthPrincipal } from '../auth/auth.types.js';
import { AppException } from '../common/app.exception.js';
import { PrismaService } from '../database/prisma.service.js';

type SocialUser = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
};

type MediaRecord = Prisma.MediaGetPayload<{ include: { genres: true } }>;

type CommentRecord = Prisma.CommentGetPayload<{
  include: { user: true; _count: { select: { replies: true } } };
}>;

type FriendshipRecord = {
  id: string;
  status: FriendshipSummary['status'];
  addresseeId: string;
  createdAt: Date;
  updatedAt: Date;
};

type ActivityPrivacy = {
  userId: string;
  watchHistoryVisibility: FeedActivitySummary['visibility'];
  ratingsVisibility: FeedActivitySummary['visibility'];
  reviewsVisibility: FeedActivitySummary['visibility'];
  listsVisibility: FeedActivitySummary['visibility'];
  shareWatchActivity: boolean;
  shareRatingActivity: boolean;
  shareReviewActivity: boolean;
  shareListActivity: boolean;
};

function userSummary(user: SocialUser): UserSummary {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
  };
}

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
    genreIds: media.genres.map((genre: { genreId: string }) => genre.genreId),
    averageProviderRating:
      media.averageProviderRating === null ? null : Number(media.averageProviderRating),
  };
}

function cursorValue(cursor: string | undefined): { occurredAt: Date; id: string } | null {
  if (cursor === undefined) return null;
  try {
    const value = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
      occurredAt?: unknown;
      id?: unknown;
    };
    if (typeof value.occurredAt !== 'string' || typeof value.id !== 'string') throw new Error();
    const occurredAt = new Date(value.occurredAt);
    if (Number.isNaN(occurredAt.getTime())) throw new Error();
    return { occurredAt, id: value.id };
  } catch {
    throw new AppException(400, 'CURSOR_INVALID', 'The social cursor is invalid.');
  }
}

function encodeCursor(value: { occurredAt: Date; id: string } | undefined): string | null {
  return value === undefined
    ? null
    : Buffer.from(
        JSON.stringify({ occurredAt: value.occurredAt.toISOString(), id: value.id }),
        'utf8',
      ).toString('base64url');
}

@Injectable()
export class SocialService {
  public constructor(private readonly prisma: PrismaService) {}

  public async users(
    principal: AuthPrincipal,
    query: string,
    limit: number,
  ): Promise<UserSummary[]> {
    const viewer = await this.requireUser(principal.subject);
    const [blockedIds, friendIds] = await Promise.all([
      this.blockedIds(viewer.id),
      this.friendIds(viewer.id),
    ]);
    const users = await this.prisma.user.findMany({
      where: {
        id: { notIn: [viewer.id, ...blockedIds] },
        deletedAt: null,
        OR: [{ profileVisibility: 'PUBLIC' }, { id: { in: friendIds } }],
        AND: [
          {
            OR: [
              { usernameNormalized: { contains: query.toLowerCase() } },
              { displayName: { contains: query, mode: 'insensitive' } },
            ],
          },
        ],
      },
      orderBy: [{ usernameNormalized: 'asc' }],
      take: limit,
    });
    return users.map(userSummary);
  }

  public async profile(principal: AuthPrincipal, username: string): Promise<PublicProfile> {
    const viewer = await this.requireUser(principal.subject);
    const target = await this.prisma.user.findUnique({
      where: { usernameNormalized: username.trim().toLowerCase() },
    });
    if (target === null || target.deletedAt !== null) this.notFoundProfile();
    await this.assertNotBlocked(viewer.id, target.id);
    const isFriend = await this.areFriends(viewer.id, target.id);
    if (
      viewer.id !== target.id &&
      target.profileVisibility !== 'PUBLIC' &&
      !(target.profileVisibility === 'FRIENDS' && isFriend)
    ) {
      this.notFoundProfile();
    }
    const [followers, following, friends, reviews, relationship] = await Promise.all([
      this.prisma.follow.count({ where: { followingId: target.id } }),
      this.prisma.follow.count({ where: { followerId: target.id } }),
      this.prisma.friendship.count({
        where: { status: 'ACCEPTED', OR: [{ userAId: target.id }, { userBId: target.id }] },
      }),
      this.prisma.review.count({
        where: { userId: target.id, status: 'PUBLISHED', deletedAt: null },
      }),
      this.relationship(viewer.id, target.id),
    ]);
    return {
      ...userSummary(target),
      profileVisibility: target.profileVisibility,
      createdAt: target.createdAt.toISOString(),
      counts: { followers, following, friends, reviews },
      relationship,
    };
  }

  public async follow(principal: AuthPrincipal, targetId: string): Promise<RelationshipState> {
    const viewer = await this.requireUser(principal.subject);
    const target = await this.requireTarget(targetId);
    this.assertDifferentUsers(viewer.id, target.id);
    await this.assertNotBlocked(viewer.id, target.id);
    await this.prisma.follow.upsert({
      where: { followerId_followingId: { followerId: viewer.id, followingId: target.id } },
      update: { status: 'ACTIVE' },
      create: { followerId: viewer.id, followingId: target.id },
    });
    return this.relationship(viewer.id, target.id);
  }

  public async unfollow(principal: AuthPrincipal, targetId: string): Promise<void> {
    const viewer = await this.requireUser(principal.subject);
    await this.prisma.follow.deleteMany({
      where: { followerId: viewer.id, followingId: targetId },
    });
  }

  public async createFriendship(
    principal: AuthPrincipal,
    addresseeUserId: string,
  ): Promise<FriendshipSummary> {
    const requester = await this.requireUser(principal.subject);
    const addressee = await this.requireTarget(addresseeUserId);
    this.assertDifferentUsers(requester.id, addressee.id);
    await this.assertNotBlocked(requester.id, addressee.id);
    const [userAId, userBId] = [requester.id, addressee.id].sort();
    const friendship = await this.prisma.friendship.upsert({
      where: { userAId_userBId: { userAId: userAId as string, userBId: userBId as string } },
      update: {
        requesterId: requester.id,
        addresseeId: addressee.id,
        status: 'PENDING',
        respondedAt: null,
      },
      create: {
        userAId: userAId as string,
        userBId: userBId as string,
        requesterId: requester.id,
        addresseeId: addressee.id,
      },
    });
    return this.friendshipSummary(friendship, requester.id, addressee);
  }

  public async friendships(
    principal: AuthPrincipal,
    status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'BLOCKED' | undefined,
  ): Promise<FriendshipSummary[]> {
    const viewer = await this.requireUser(principal.subject);
    const rows = await this.prisma.friendship.findMany({
      where: {
        OR: [{ userAId: viewer.id }, { userBId: viewer.id }],
        ...(status === undefined ? {} : { status }),
      },
      include: { userA: true, userB: true },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
    return rows.map((row) =>
      this.friendshipSummary(row, viewer.id, row.userAId === viewer.id ? row.userB : row.userA),
    );
  }

  public async respondFriendship(
    principal: AuthPrincipal,
    friendshipId: string,
    action: 'ACCEPT' | 'DECLINE',
  ): Promise<FriendshipSummary> {
    const viewer = await this.requireUser(principal.subject);
    const friendship = await this.prisma.friendship.findFirst({
      where: { id: friendshipId, addresseeId: viewer.id, status: 'PENDING' },
    });
    if (friendship === null) {
      throw new AppException(
        404,
        'FRIENDSHIP_NOT_FOUND',
        'The pending friend request was not found.',
      );
    }
    const updated = await this.prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: action === 'ACCEPT' ? 'ACCEPTED' : 'DECLINED', respondedAt: new Date() },
    });
    const other = await this.requireTarget(friendship.requesterId);
    return this.friendshipSummary(updated, viewer.id, other);
  }

  public async deleteFriendship(principal: AuthPrincipal, friendshipId: string): Promise<void> {
    const viewer = await this.requireUser(principal.subject);
    const result = await this.prisma.friendship.deleteMany({
      where: { id: friendshipId, OR: [{ userAId: viewer.id }, { userBId: viewer.id }] },
    });
    if (result.count === 0) {
      throw new AppException(404, 'FRIENDSHIP_NOT_FOUND', 'The friendship was not found.');
    }
  }

  public async feed(principal: AuthPrincipal, limit: number, cursor?: string) {
    const viewer = await this.requireUser(principal.subject);
    const [followRows, friends, blocked, muted] = await Promise.all([
      this.prisma.follow.findMany({
        where: { followerId: viewer.id },
        select: { followingId: true },
      }),
      this.friendIds(viewer.id),
      this.blockedIds(viewer.id),
      this.prisma.userMute.findMany({ where: { muterId: viewer.id }, select: { mutedId: true } }),
    ]);
    const excluded = new Set([...blocked, ...muted.map(({ mutedId }) => mutedId)]);
    const friendIds = friends.filter((id) => !excluded.has(id));
    const followedIds = followRows
      .map(({ followingId }) => followingId)
      .filter((id) => !excluded.has(id) && !friendIds.includes(id));
    const actorIds = [viewer.id, ...friendIds, ...followedIds].slice(0, 100);
    await this.syncActivities(actorIds);
    const parsedCursor = cursorValue(cursor);
    const records = await this.prisma.feedActivity.findMany({
      where: {
        deletedAt: null,
        OR: [
          { actorUserId: viewer.id },
          { actorUserId: { in: friendIds }, visibility: { in: ['PUBLIC', 'FRIENDS'] } },
          { actorUserId: { in: followedIds }, visibility: 'PUBLIC' },
        ],
        ...(parsedCursor === null
          ? {}
          : {
              AND: [
                {
                  OR: [
                    { occurredAt: { lt: parsedCursor.occurredAt } },
                    { occurredAt: parsedCursor.occurredAt, id: { lt: parsedCursor.id } },
                  ],
                },
              ],
            }),
      },
      include: { actor: true, media: { include: { genres: true } } },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });
    const hasMore = records.length > limit;
    const page = records.slice(0, limit);
    const interactions = await this.activityInteractions(
      viewer.id,
      page.map(({ id }) => id),
    );
    return {
      items: page.map((record): FeedActivitySummary => ({
        id: record.id,
        actor: userSummary(record.actor),
        activityType: record.activityType,
        media: record.media === null ? null : mediaSummary(record.media),
        visibility: record.visibility,
        occurredAt: record.occurredAt.toISOString(),
        commentCount: interactions.comments.get(record.id) ?? 0,
        reactions: interactions.reactions.get(record.id) ?? { counts: {}, mine: [] },
      })),
      nextCursor: hasMore ? encodeCursor(page.at(-1)) : null,
    };
  }

  public async comments(
    principal: AuthPrincipal,
    parentType: 'REVIEW' | 'FEED_ACTIVITY',
    parentId: string,
  ): Promise<CommentSummary[]> {
    const viewer = await this.requireUser(principal.subject);
    await this.assertTargetVisible(viewer.id, parentType, parentId);
    const blocked = await this.blockedIds(viewer.id);
    const rows = await this.prisma.comment.findMany({
      where: {
        parentType,
        parentId,
        parentCommentId: null,
        deletedAt: null,
        userId: { notIn: blocked },
      },
      include: { user: true, _count: { select: { replies: true } } },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: 200,
    });
    const reactions = await this.reactionMap(
      viewer.id,
      'COMMENT',
      rows.map(({ id }) => id),
    );
    return rows.map((row) => this.commentSummary(row, reactions.get(row.id)));
  }

  public async createComment(
    principal: AuthPrincipal,
    parentType: 'REVIEW' | 'FEED_ACTIVITY',
    parentId: string,
    input: {
      body: string;
      containsSpoilers: boolean;
      parentCommentId?: string | null | undefined;
    },
  ): Promise<CommentSummary> {
    const viewer = await this.requireUser(principal.subject);
    await this.assertTargetVisible(viewer.id, parentType, parentId);
    if (input.parentCommentId != null) {
      const parent = await this.prisma.comment.findFirst({
        where: { id: input.parentCommentId, parentType, parentId, deletedAt: null },
      });
      if (parent === null)
        throw new AppException(422, 'COMMENT_PARENT_INVALID', 'The reply target is invalid.');
    }
    const row = await this.prisma.comment.create({
      data: {
        userId: viewer.id,
        parentType,
        parentId,
        parentCommentId: input.parentCommentId ?? null,
        body: input.body,
        containsSpoilers: input.containsSpoilers,
        visibility: 'PUBLIC',
      },
      include: { user: true, _count: { select: { replies: true } } },
    });
    return this.commentSummary(row);
  }

  public async deleteComment(principal: AuthPrincipal, commentId: string): Promise<void> {
    const viewer = await this.requireUser(principal.subject);
    const result = await this.prisma.comment.updateMany({
      where: { id: commentId, userId: viewer.id, deletedAt: null },
      data: { deletedAt: new Date(), body: '[deleted]' },
    });
    if (result.count === 0)
      throw new AppException(404, 'COMMENT_NOT_FOUND', 'The comment was not found.');
  }

  public async setReaction(
    principal: AuthPrincipal,
    targetType: 'REVIEW' | 'COMMENT' | 'FEED_ACTIVITY',
    targetId: string,
    reactionType: 'LIKE' | 'LOVE' | 'LAUGH' | 'WOW' | 'SAD',
  ): Promise<ReactionSummary> {
    const viewer = await this.requireUser(principal.subject);
    await this.assertReactionTargetVisible(viewer.id, targetType, targetId);
    await this.prisma.reaction.upsert({
      where: {
        userId_targetType_targetId_reactionType: {
          userId: viewer.id,
          targetType,
          targetId,
          reactionType,
        },
      },
      update: {},
      create: { userId: viewer.id, targetType, targetId, reactionType },
    });
    return (
      (await this.reactionMap(viewer.id, targetType, [targetId])).get(targetId) ?? {
        counts: {},
        mine: [],
      }
    );
  }

  public async deleteReaction(
    principal: AuthPrincipal,
    targetType: 'REVIEW' | 'COMMENT' | 'FEED_ACTIVITY',
    targetId: string,
    reactionType: 'LIKE' | 'LOVE' | 'LAUGH' | 'WOW' | 'SAD',
  ): Promise<ReactionSummary> {
    const viewer = await this.requireUser(principal.subject);
    await this.assertReactionTargetVisible(viewer.id, targetType, targetId);
    await this.prisma.reaction.deleteMany({
      where: { userId: viewer.id, targetType, targetId, reactionType },
    });
    return (
      (await this.reactionMap(viewer.id, targetType, [targetId])).get(targetId) ?? {
        counts: {},
        mine: [],
      }
    );
  }

  public async shareMedia(principal: AuthPrincipal, mediaId: string): Promise<ShareReceipt> {
    await this.requireUser(principal.subject);
    const media = await this.prisma.media.findUnique({ where: { id: mediaId } });
    if (media === null)
      throw new AppException(404, 'MEDIA_NOT_FOUND', 'The requested media was not found.');
    return {
      mediaId,
      deepLink: `cinewrapped://media/${mediaId}`,
      webUrl: `https://cinewrapped.example/media/${mediaId}`,
      title: media.title,
    };
  }

  public async block(
    principal: AuthPrincipal,
    targetId: string,
    reason?: string | null,
  ): Promise<void> {
    const viewer = await this.requireUser(principal.subject);
    await this.requireTarget(targetId);
    this.assertDifferentUsers(viewer.id, targetId);
    const [userAId, userBId] = [viewer.id, targetId].sort();
    await this.prisma.$transaction([
      this.prisma.userBlock.upsert({
        where: { blockerId_blockedId: { blockerId: viewer.id, blockedId: targetId } },
        update: { reason: reason ?? null },
        create: { blockerId: viewer.id, blockedId: targetId, reason: reason ?? null },
      }),
      this.prisma.follow.deleteMany({
        where: {
          OR: [
            { followerId: viewer.id, followingId: targetId },
            { followerId: targetId, followingId: viewer.id },
          ],
        },
      }),
      this.prisma.friendship.updateMany({
        where: { userAId: userAId as string, userBId: userBId as string },
        data: { status: 'BLOCKED', respondedAt: new Date() },
      }),
    ]);
  }

  public async unblock(principal: AuthPrincipal, targetId: string): Promise<void> {
    const viewer = await this.requireUser(principal.subject);
    await this.prisma.userBlock.deleteMany({
      where: { blockerId: viewer.id, blockedId: targetId },
    });
  }

  public async mute(principal: AuthPrincipal, targetId: string): Promise<void> {
    const viewer = await this.requireUser(principal.subject);
    await this.requireTarget(targetId);
    this.assertDifferentUsers(viewer.id, targetId);
    await this.prisma.userMute.upsert({
      where: { muterId_mutedId: { muterId: viewer.id, mutedId: targetId } },
      update: {},
      create: { muterId: viewer.id, mutedId: targetId },
    });
  }

  public async unmute(principal: AuthPrincipal, targetId: string): Promise<void> {
    const viewer = await this.requireUser(principal.subject);
    await this.prisma.userMute.deleteMany({ where: { muterId: viewer.id, mutedId: targetId } });
  }

  private async syncActivities(actorIds: string[]): Promise<void> {
    if (actorIds.length === 0) return;
    const [privacy, viewings, ratings, reviews, watchlists] = await Promise.all([
      this.prisma.privacySettings.findMany({ where: { userId: { in: actorIds } } }),
      this.prisma.viewing.findMany({
        where: { userId: { in: actorIds }, deletedAt: null },
        take: 500,
        orderBy: { watchedAt: 'desc' },
      }),
      this.prisma.rating.findMany({
        where: { userId: { in: actorIds }, deletedAt: null },
        take: 500,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.review.findMany({
        where: { userId: { in: actorIds }, status: 'PUBLISHED', deletedAt: null },
        take: 500,
        orderBy: { publishedAt: 'desc' },
      }),
      this.prisma.watchlist.findMany({
        where: { userId: { in: actorIds }, deletedAt: null, isDefault: false },
        take: 200,
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    await this.reconcileActivityPrivacy(actorIds, privacy);
    const privacyByUser = new Map(privacy.map((settings) => [settings.userId, settings]));
    const data: Prisma.FeedActivityCreateManyInput[] = [];
    for (const viewing of viewings) {
      const settings = privacyByUser.get(viewing.userId);
      if (settings?.shareWatchActivity !== true) continue;
      data.push({
        actorUserId: viewing.userId,
        activityType: 'USER_WATCHED_MEDIA',
        entityType: 'VIEWING',
        entityId: viewing.id,
        mediaId: viewing.mediaId,
        visibility: settings.watchHistoryVisibility,
        occurredAt: viewing.watchedAt,
      });
    }
    for (const rating of ratings) {
      const settings = privacyByUser.get(rating.userId);
      if (settings?.shareRatingActivity !== true) continue;
      data.push({
        actorUserId: rating.userId,
        activityType: 'USER_RATED_MEDIA',
        entityType: 'RATING',
        entityId: rating.id,
        mediaId: rating.mediaId,
        visibility: settings.ratingsVisibility,
        occurredAt: rating.updatedAt,
      });
    }
    for (const review of reviews) {
      const settings = privacyByUser.get(review.userId);
      if (settings?.shareReviewActivity !== true) continue;
      data.push({
        actorUserId: review.userId,
        activityType: 'USER_REVIEWED_MEDIA',
        entityType: 'REVIEW',
        entityId: review.id,
        mediaId: review.mediaId,
        visibility: settings.reviewsVisibility,
        occurredAt: review.publishedAt ?? review.updatedAt,
      });
    }
    for (const watchlist of watchlists) {
      const settings = privacyByUser.get(watchlist.userId);
      if (settings?.shareListActivity !== true) continue;
      data.push({
        actorUserId: watchlist.userId,
        activityType: 'USER_CREATED_LIST',
        entityType: 'WATCHLIST',
        entityId: watchlist.id,
        visibility: settings.listsVisibility,
        occurredAt: watchlist.createdAt,
      });
    }
    if (data.length > 0) await this.prisma.feedActivity.createMany({ data, skipDuplicates: true });
  }

  private async reconcileActivityPrivacy(
    actorIds: string[],
    settings: ActivityPrivacy[],
  ): Promise<void> {
    const settingsByUser = new Map(settings.map((item) => [item.userId, item]));
    const policies = [
      {
        activityType: 'USER_WATCHED_MEDIA' as const,
        enabled: (item: ActivityPrivacy) => item.shareWatchActivity,
        visibility: (item: ActivityPrivacy) => item.watchHistoryVisibility,
      },
      {
        activityType: 'USER_RATED_MEDIA' as const,
        enabled: (item: ActivityPrivacy) => item.shareRatingActivity,
        visibility: (item: ActivityPrivacy) => item.ratingsVisibility,
      },
      {
        activityType: 'USER_REVIEWED_MEDIA' as const,
        enabled: (item: ActivityPrivacy) => item.shareReviewActivity,
        visibility: (item: ActivityPrivacy) => item.reviewsVisibility,
      },
      {
        activityType: 'USER_CREATED_LIST' as const,
        enabled: (item: ActivityPrivacy) => item.shareListActivity,
        visibility: (item: ActivityPrivacy) => item.listsVisibility,
      },
    ];
    const now = new Date();
    const operations = policies.flatMap((policy) => {
      const disabledIds = actorIds.filter((id) => {
        const item = settingsByUser.get(id);
        return item === undefined || !policy.enabled(item);
      });
      const enabledByVisibility = new Map<FeedActivitySummary['visibility'], string[]>();
      for (const item of settings) {
        if (!policy.enabled(item)) continue;
        const visibility = policy.visibility(item);
        enabledByVisibility.set(visibility, [
          ...(enabledByVisibility.get(visibility) ?? []),
          item.userId,
        ]);
      }
      return [
        ...(disabledIds.length === 0
          ? []
          : [
              this.prisma.feedActivity.updateMany({
                where: { actorUserId: { in: disabledIds }, activityType: policy.activityType },
                data: { deletedAt: now },
              }),
            ]),
        ...[...enabledByVisibility.entries()].map(([visibility, enabledIds]) =>
          this.prisma.feedActivity.updateMany({
            where: { actorUserId: { in: enabledIds }, activityType: policy.activityType },
            data: { visibility, deletedAt: null },
          }),
        ),
      ];
    });
    if (operations.length > 0) await this.prisma.$transaction(operations);
  }

  private async activityInteractions(viewerId: string, ids: string[]) {
    const [comments, reactions] = await Promise.all([
      this.prisma.comment.groupBy({
        by: ['parentId'],
        where: { parentType: 'FEED_ACTIVITY', parentId: { in: ids }, deletedAt: null },
        _count: { _all: true },
      }),
      this.reactionMap(viewerId, 'FEED_ACTIVITY', ids),
    ]);
    return { comments: new Map(comments.map((row) => [row.parentId, row._count._all])), reactions };
  }

  private async reactionMap(
    viewerId: string,
    targetType: 'REVIEW' | 'COMMENT' | 'FEED_ACTIVITY',
    ids: string[],
  ) {
    if (ids.length === 0) return new Map<string, ReactionSummary>();
    const [counts, mine] = await Promise.all([
      this.prisma.reaction.groupBy({
        by: ['targetId', 'reactionType'],
        where: { targetType, targetId: { in: ids } },
        _count: { _all: true },
      }),
      this.prisma.reaction.findMany({
        where: { userId: viewerId, targetType, targetId: { in: ids } },
      }),
    ]);
    const result = new Map<string, ReactionSummary>();
    for (const id of ids) result.set(id, { counts: {}, mine: [] });
    for (const row of counts) {
      const summary = result.get(row.targetId) as ReactionSummary;
      summary.counts[row.reactionType] = row._count._all;
    }
    for (const row of mine)
      (result.get(row.targetId) as ReactionSummary).mine.push(row.reactionType);
    return result;
  }

  private commentSummary(
    row: CommentRecord,
    reactions: ReactionSummary = { counts: {}, mine: [] },
  ): CommentSummary {
    if (row.parentType !== 'REVIEW' && row.parentType !== 'FEED_ACTIVITY') {
      throw new AppException(
        500,
        'COMMENT_PARENT_UNSUPPORTED',
        'The comment parent is unsupported.',
      );
    }
    return {
      id: row.id,
      author: userSummary(row.user),
      parentType: row.parentType,
      parentId: row.parentId,
      parentCommentId: row.parentCommentId,
      body: row.body,
      containsSpoilers: row.containsSpoilers,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      replyCount: row._count.replies,
      reactions,
    };
  }

  private friendshipSummary(
    row: FriendshipRecord,
    viewerId: string,
    otherUser: SocialUser,
  ): FriendshipSummary {
    return {
      id: row.id,
      status: row.status,
      direction: row.addresseeId === viewerId ? 'INCOMING' : 'OUTGOING',
      otherUser: userSummary(otherUser),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async relationship(viewerId: string, targetId: string): Promise<RelationshipState> {
    if (viewerId === targetId)
      return {
        following: false,
        followedBy: false,
        friendshipId: null,
        friendshipStatus: null,
        friendshipDirection: null,
        muted: false,
      };
    const [following, followedBy, friendship, muted] = await Promise.all([
      this.prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: viewerId, followingId: targetId } },
      }),
      this.prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: targetId, followingId: viewerId } },
      }),
      this.prisma.friendship.findFirst({
        where: {
          OR: [
            { userAId: viewerId, userBId: targetId },
            { userAId: targetId, userBId: viewerId },
          ],
        },
      }),
      this.prisma.userMute.findUnique({
        where: { muterId_mutedId: { muterId: viewerId, mutedId: targetId } },
      }),
    ]);
    return {
      following: following !== null,
      followedBy: followedBy !== null,
      friendshipId: friendship?.id ?? null,
      friendshipStatus: friendship?.status ?? null,
      friendshipDirection:
        friendship === null ? null : friendship.addresseeId === viewerId ? 'INCOMING' : 'OUTGOING',
      muted: muted !== null,
    };
  }

  private async assertTargetVisible(
    viewerId: string,
    parentType: 'REVIEW' | 'FEED_ACTIVITY',
    parentId: string,
  ): Promise<void> {
    if (parentType === 'REVIEW') {
      const review = await this.prisma.review.findFirst({
        where: { id: parentId, status: 'PUBLISHED', deletedAt: null },
      });
      if (review === null)
        throw new AppException(
          404,
          'SOCIAL_TARGET_NOT_FOUND',
          'The discussion target was not found.',
        );
      await this.assertNotBlocked(viewerId, review.userId);
      if (
        review.userId !== viewerId &&
        review.visibility !== 'PUBLIC' &&
        !(review.visibility === 'FRIENDS' && (await this.areFriends(viewerId, review.userId)))
      )
        this.notFoundSocialTarget();
      return;
    }
    const activity = await this.prisma.feedActivity.findFirst({
      where: { id: parentId, deletedAt: null },
    });
    if (activity === null) this.notFoundSocialTarget();
    await this.assertNotBlocked(viewerId, activity.actorUserId);
    if (
      activity.actorUserId !== viewerId &&
      activity.visibility !== 'PUBLIC' &&
      !(
        activity.visibility === 'FRIENDS' && (await this.areFriends(viewerId, activity.actorUserId))
      )
    )
      this.notFoundSocialTarget();
  }

  private async assertReactionTargetVisible(
    viewerId: string,
    targetType: 'REVIEW' | 'COMMENT' | 'FEED_ACTIVITY',
    targetId: string,
  ): Promise<void> {
    if (targetType === 'COMMENT') {
      const comment = await this.prisma.comment.findFirst({
        where: { id: targetId, deletedAt: null },
      });
      if (
        comment === null ||
        (comment.parentType !== 'REVIEW' && comment.parentType !== 'FEED_ACTIVITY')
      )
        this.notFoundSocialTarget();
      await this.assertNotBlocked(viewerId, comment.userId);
      await this.assertTargetVisible(viewerId, comment.parentType, comment.parentId);
      return;
    }
    await this.assertTargetVisible(viewerId, targetType, targetId);
  }

  private async blockedIds(userId: string): Promise<string[]> {
    const [created, received] = await Promise.all([
      this.prisma.userBlock.findMany({ where: { blockerId: userId }, select: { blockedId: true } }),
      this.prisma.userBlock.findMany({ where: { blockedId: userId }, select: { blockerId: true } }),
    ]);
    return [
      ...new Set([
        ...created.map(({ blockedId }) => blockedId),
        ...received.map(({ blockerId }) => blockerId),
      ]),
    ];
  }

  private async friendIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.friendship.findMany({
      where: { status: 'ACCEPTED', OR: [{ userAId: userId }, { userBId: userId }] },
      select: { userAId: true, userBId: true },
    });
    return rows.map((row) => (row.userAId === userId ? row.userBId : row.userAId));
  }

  private async areFriends(leftId: string, rightId: string): Promise<boolean> {
    if (leftId === rightId) return true;
    return (
      (await this.prisma.friendship.count({
        where: {
          status: 'ACCEPTED',
          OR: [
            { userAId: leftId, userBId: rightId },
            { userAId: rightId, userBId: leftId },
          ],
        },
      })) > 0
    );
  }

  private async assertNotBlocked(leftId: string, rightId: string): Promise<void> {
    const blocked = await this.prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: leftId, blockedId: rightId },
          { blockerId: rightId, blockedId: leftId },
        ],
      },
    });
    if (blocked !== null) this.notFoundProfile();
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

  private async requireTarget(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user === null || user.deletedAt !== null) this.notFoundProfile();
    return user;
  }

  private assertDifferentUsers(leftId: string, rightId: string): void {
    if (leftId === rightId)
      throw new AppException(
        422,
        'SELF_RELATIONSHIP_INVALID',
        'You cannot perform this action on yourself.',
      );
  }

  private notFoundProfile(): never {
    throw new AppException(404, 'PROFILE_NOT_FOUND', 'The profile was not found.');
  }
  private notFoundSocialTarget(): never {
    throw new AppException(404, 'SOCIAL_TARGET_NOT_FOUND', 'The social target was not found.');
  }
}
