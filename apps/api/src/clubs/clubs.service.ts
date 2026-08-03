import { Prisma } from '@cinewrapped/database';
import type {
  ClubDetails,
  ClubMembershipSummary,
  ClubPollSummary,
  ClubPostSummary,
  ClubSummary,
  ClubWatchEventSummary,
  ClubWatchlistItemSummary,
  MediaSummary,
  UserSummary,
} from '@cinewrapped/shared-types';
import {
  addClubWatchlistItemSchema,
  createClubPollSchema,
  createClubPostSchema,
  createClubSchema,
  createClubWatchEventSchema,
  updateClubMembershipSchema,
  voteClubPollSchema,
  voteClubWatchlistItemSchema,
} from '@cinewrapped/validation';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import type { AuthPrincipal } from '../auth/auth.types.js';
import { AppException } from '../common/app.exception.js';
import { PrismaService } from '../database/prisma.service.js';

export type CreateClubInput = z.output<typeof createClubSchema>;
export type UpdateClubMembershipInput = z.output<typeof updateClubMembershipSchema>;
export type CreateClubPostInput = z.output<typeof createClubPostSchema>;
export type CreateClubPollInput = z.output<typeof createClubPollSchema>;
export type VoteClubPollInput = z.output<typeof voteClubPollSchema>;
export type AddClubWatchlistItemInput = z.output<typeof addClubWatchlistItemSchema>;
export type VoteClubWatchlistItemInput = z.output<typeof voteClubWatchlistItemSchema>;
export type CreateClubWatchEventInput = z.output<typeof createClubWatchEventSchema>;

type ClubRecord = Prisma.ClubGetPayload<{
  include: { members: { include: { user: true } } };
}>;
type ClubPostRecord = Prisma.ClubPostGetPayload<{ include: { author: true } }>;
type MediaRecord = Prisma.MediaGetPayload<{ include: { genres: true } }>;
type ClubDetailRecord = Prisma.ClubGetPayload<{
  include: {
    members: { include: { user: true } };
    posts: { include: { author: true } };
    polls: {
      include: {
        votes: true;
        options: { include: { media: { include: { genres: true } }; votes: true } };
      };
    };
    watchlistItems: {
      include: { media: { include: { genres: true } }; suggestedBy: true; votes: true };
    };
    watchEvents: {
      include: { media: { include: { genres: true } }; createdBy: true };
    };
  };
}>;

const managerRoles = new Set(['OWNER', 'ADMIN', 'MODERATOR']);

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
    genreIds: media.genres.map((item) => item.genreId),
    averageProviderRating:
      media.averageProviderRating === null ? null : Number(media.averageProviderRating),
  };
}

function membershipSummary(member: ClubDetailRecord['members'][number]): ClubMembershipSummary {
  return {
    id: member.id,
    role: member.role,
    status: member.status,
    joinedAt: member.joinedAt?.toISOString() ?? null,
    user: userSummary(member.user),
  };
}

function clubSummary(club: ClubRecord, viewerId: string): ClubSummary {
  const membership = club.members.find((item) => item.userId === viewerId) ?? null;
  return {
    id: club.id,
    name: club.name,
    slug: club.slug,
    description: club.description,
    coverImageUrl: club.coverImageUrl,
    visibility: club.visibility,
    membershipType: club.membershipType,
    category: club.category,
    memberCount: club.memberCount,
    membership:
      membership === null
        ? null
        : { id: membership.id, role: membership.role, status: membership.status },
    createdAt: club.createdAt.toISOString(),
    updatedAt: club.updatedAt.toISOString(),
  };
}

function postSummary(post: ClubPostRecord): ClubPostSummary {
  return {
    id: post.id,
    postType: post.postType,
    title: post.title,
    body: post.body,
    containsSpoilers: post.containsSpoilers,
    author: userSummary(post.author),
    commentCount: 0,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };
}

function pollSummary(poll: ClubDetailRecord['polls'][number], viewerId: string): ClubPollSummary {
  const expired = poll.closesAt !== null && poll.closesAt.getTime() <= Date.now();
  return {
    id: poll.id,
    question: poll.question,
    allowMultiple: poll.allowMultiple,
    status: poll.status === 'CLOSED' || expired ? 'CLOSED' : 'OPEN',
    closesAt: poll.closesAt?.toISOString() ?? null,
    totalVotes: poll.votes.length,
    options: poll.options
      .slice()
      .sort((left, right) => left.position - right.position)
      .map((option) => ({
        id: option.id,
        label: option.label,
        position: option.position,
        media: option.media === null ? null : mediaSummary(option.media),
        voteCount: option.votes.length,
        selectedByViewer: option.votes.some((vote) => vote.userId === viewerId),
      })),
    createdAt: poll.createdAt.toISOString(),
  };
}

function watchlistItemSummary(
  item: ClubDetailRecord['watchlistItems'][number],
  viewerId: string,
): ClubWatchlistItemSummary {
  const viewerVote = item.votes.find((vote) => vote.userId === viewerId)?.value ?? 0;
  return {
    id: item.id,
    media: mediaSummary(item.media),
    suggestedBy: userSummary(item.suggestedBy),
    note: item.note,
    score: item.votes.reduce((total, vote) => total + vote.value, 0),
    viewerVote: viewerVote === -1 || viewerVote === 1 ? viewerVote : 0,
    selectedAt: item.selectedAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
  };
}

function watchEventSummary(event: ClubDetailRecord['watchEvents'][number]): ClubWatchEventSummary {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    media: event.media === null ? null : mediaSummary(event.media),
    startsAt: event.startsAt.toISOString(),
    timezone: event.timezone,
    locationUrl: event.locationUrl,
    status: event.status,
    createdBy: userSummary(event.createdBy),
  };
}

function normalizedSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, 110);
}

@Injectable()
export class ClubsService {
  public constructor(private readonly prisma: PrismaService) {}

  public async list(
    principal: AuthPrincipal,
    query: { scope: 'DISCOVER' | 'MINE'; q: string; limit: number },
  ): Promise<ClubSummary[]> {
    const user = await this.requireUser(principal.subject);
    const clubs = await this.prisma.club.findMany({
      where: {
        deletedAt: null,
        AND: [
          ...(query.q.length === 0
            ? []
            : [
                {
                  OR: [
                    { name: { contains: query.q, mode: 'insensitive' as const } },
                    { description: { contains: query.q, mode: 'insensitive' as const } },
                  ],
                },
              ]),
          query.scope === 'MINE'
            ? { members: { some: { userId: user.id, status: { in: ['ACTIVE', 'PENDING'] } } } }
            : {
                OR: [
                  { visibility: 'PUBLIC' as const },
                  { members: { some: { userId: user.id, status: 'ACTIVE' as const } } },
                ],
              },
        ],
      },
      include: { members: { where: { userId: user.id }, include: { user: true }, take: 1 } },
      orderBy: [{ memberCount: 'desc' }, { createdAt: 'desc' }],
      take: query.limit,
    });
    return clubs.map((club) => clubSummary(club, user.id));
  }

  public async create(principal: AuthPrincipal, input: CreateClubInput): Promise<ClubDetails> {
    const user = await this.requireUser(principal.subject);
    const base = normalizedSlug(input.slug ?? input.name);
    if (base.length < 3)
      throw new AppException(400, 'CLUB_SLUG_INVALID', 'Choose a more descriptive club name.');
    let slug = base;
    for (let suffix = 2; await this.prisma.club.findUnique({ where: { slug } }); suffix += 1) {
      slug = `${base.slice(0, 110 - String(suffix).length)}-${suffix}`;
      if (suffix > 100)
        throw new AppException(409, 'CLUB_SLUG_UNAVAILABLE', 'That club name is unavailable.');
    }
    const club = await this.prisma.$transaction(async (transaction) =>
      transaction.club.create({
        data: {
          ownerId: user.id,
          name: input.name,
          slug,
          description: input.description,
          visibility: input.visibility,
          membershipType: input.membershipType,
          category: input.category ?? null,
          members: {
            create: { userId: user.id, role: 'OWNER', status: 'ACTIVE', joinedAt: new Date() },
          },
        },
      }),
    );
    return this.detailsFor(user.id, club.id);
  }

  public async details(principal: AuthPrincipal, clubId: string): Promise<ClubDetails> {
    const user = await this.requireUser(principal.subject);
    return this.detailsFor(user.id, clubId);
  }

  public async join(principal: AuthPrincipal, clubId: string): Promise<ClubDetails> {
    const user = await this.requireUser(principal.subject);
    const club = await this.prisma.club.findFirst({ where: { id: clubId, deletedAt: null } });
    if (club === null) throw new AppException(404, 'CLUB_NOT_FOUND', 'The club was not found.');
    if (club.membershipType === 'INVITE_ONLY' || club.visibility === 'PRIVATE')
      throw new AppException(403, 'CLUB_INVITE_REQUIRED', 'This club requires an invitation.');
    const existing = await this.prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId, userId: user.id } },
    });
    if (existing?.status === 'ACTIVE' || existing?.status === 'PENDING')
      return this.detailsFor(user.id, clubId);
    const active = club.membershipType === 'OPEN';
    await this.prisma.$transaction([
      this.prisma.clubMember.upsert({
        where: { clubId_userId: { clubId, userId: user.id } },
        update: {
          role: 'MEMBER',
          status: active ? 'ACTIVE' : 'PENDING',
          joinedAt: active ? new Date() : null,
        },
        create: {
          clubId,
          userId: user.id,
          role: 'MEMBER',
          status: active ? 'ACTIVE' : 'PENDING',
          joinedAt: active ? new Date() : null,
        },
      }),
      ...(active
        ? [
            this.prisma.club.update({
              where: { id: clubId },
              data: { memberCount: { increment: 1 } },
            }),
          ]
        : []),
    ]);
    return this.detailsFor(user.id, clubId);
  }

  public async updateMembership(
    principal: AuthPrincipal,
    clubId: string,
    membershipId: string,
    input: UpdateClubMembershipInput,
  ): Promise<ClubDetails> {
    const user = await this.requireUser(principal.subject);
    await this.requireManager(user.id, clubId);
    const membership = await this.prisma.clubMember.findFirst({
      where: { id: membershipId, clubId },
    });
    if (membership === null)
      throw new AppException(404, 'CLUB_MEMBERSHIP_NOT_FOUND', 'The membership was not found.');
    if (membership.role === 'OWNER')
      throw new AppException(409, 'CLUB_OWNER_IMMUTABLE', 'The club owner cannot be removed.');
    const activating = input.action === 'APPROVE' && membership.status !== 'ACTIVE';
    const removing = input.action === 'REMOVE' && membership.status === 'ACTIVE';
    await this.prisma.$transaction([
      this.prisma.clubMember.update({
        where: { id: membership.id },
        data:
          input.action === 'APPROVE'
            ? { status: 'ACTIVE', role: input.role ?? membership.role, joinedAt: new Date() }
            : { status: 'REMOVED', role: 'MEMBER' },
      }),
      ...(activating || removing
        ? [
            this.prisma.club.update({
              where: { id: clubId },
              data: { memberCount: activating ? { increment: 1 } : { decrement: 1 } },
            }),
          ]
        : []),
    ]);
    return this.detailsFor(user.id, clubId);
  }

  public async createPost(
    principal: AuthPrincipal,
    clubId: string,
    input: CreateClubPostInput,
  ): Promise<ClubPostSummary> {
    const user = await this.requireUser(principal.subject);
    const membership = await this.requireActiveMember(user.id, clubId);
    if (input.postType === 'ANNOUNCEMENT' && !managerRoles.has(membership.role))
      throw new AppException(403, 'CLUB_MANAGER_REQUIRED', 'Only club managers can announce.');
    const post = await this.prisma.clubPost.create({
      data: {
        clubId,
        authorId: user.id,
        postType: input.postType,
        title: input.title ?? null,
        body: input.body,
        containsSpoilers: input.containsSpoilers,
      },
      include: { author: true },
    });
    return postSummary(post);
  }

  public async createPoll(
    principal: AuthPrincipal,
    clubId: string,
    input: CreateClubPollInput,
  ): Promise<ClubPollSummary> {
    const user = await this.requireUser(principal.subject);
    await this.requireManager(user.id, clubId);
    const poll = await this.prisma.clubPoll.create({
      data: {
        clubId,
        createdById: user.id,
        question: input.question,
        allowMultiple: input.allowMultiple,
        closesAt: input.closesAt == null ? null : new Date(input.closesAt),
        options: {
          create: input.options.map((option, position) => ({
            label: option.label,
            mediaId: option.mediaId ?? null,
            position,
          })),
        },
      },
      include: {
        votes: true,
        options: { include: { media: { include: { genres: true } }, votes: true } },
      },
    });
    return pollSummary(poll, user.id);
  }

  public async votePoll(
    principal: AuthPrincipal,
    clubId: string,
    pollId: string,
    input: VoteClubPollInput,
  ): Promise<ClubPollSummary> {
    const user = await this.requireUser(principal.subject);
    await this.requireActiveMember(user.id, clubId);
    const poll = await this.prisma.clubPoll.findFirst({
      where: { id: pollId, clubId },
      include: { options: true },
    });
    if (poll === null)
      throw new AppException(404, 'CLUB_POLL_NOT_FOUND', 'The club poll was not found.');
    if (poll.status !== 'OPEN' || (poll.closesAt !== null && poll.closesAt <= new Date()))
      throw new AppException(409, 'CLUB_POLL_CLOSED', 'Voting has closed for this poll.');
    if (!poll.options.some((option) => option.id === input.optionId))
      throw new AppException(400, 'CLUB_POLL_OPTION_INVALID', 'That option is not in this poll.');
    const existing = await this.prisma.clubPollVote.findUnique({
      where: { pollId_optionId_userId: { pollId, optionId: input.optionId, userId: user.id } },
    });
    await this.prisma.$transaction([
      ...(!poll.allowMultiple
        ? [this.prisma.clubPollVote.deleteMany({ where: { pollId, userId: user.id } })]
        : existing === null
          ? []
          : [
              this.prisma.clubPollVote.delete({
                where: {
                  pollId_optionId_userId: {
                    pollId,
                    optionId: input.optionId,
                    userId: user.id,
                  },
                },
              }),
            ]),
      ...(existing === null
        ? [
            this.prisma.clubPollVote.create({
              data: { pollId, optionId: input.optionId, userId: user.id },
            }),
          ]
        : []),
    ]);
    return this.pollFor(pollId, user.id);
  }

  public async addWatchlistItem(
    principal: AuthPrincipal,
    clubId: string,
    input: AddClubWatchlistItemInput,
  ): Promise<ClubWatchlistItemSummary> {
    const user = await this.requireUser(principal.subject);
    await this.requireActiveMember(user.id, clubId);
    const media = await this.prisma.media.findUnique({ where: { id: input.mediaId } });
    if (media === null) throw new AppException(404, 'MEDIA_NOT_FOUND', 'The title was not found.');
    const existing = await this.prisma.clubWatchlistItem.findUnique({
      where: { clubId_mediaId: { clubId, mediaId: input.mediaId } },
    });
    if (existing !== null)
      throw new AppException(409, 'CLUB_WATCHLIST_DUPLICATE', 'That title is already suggested.');
    const item = await this.prisma.clubWatchlistItem.create({
      data: {
        clubId,
        mediaId: input.mediaId,
        suggestedById: user.id,
        note: input.note ?? null,
      },
      include: { media: { include: { genres: true } }, suggestedBy: true, votes: true },
    });
    return watchlistItemSummary(item, user.id);
  }

  public async voteWatchlistItem(
    principal: AuthPrincipal,
    clubId: string,
    itemId: string,
    input: VoteClubWatchlistItemInput,
  ): Promise<ClubWatchlistItemSummary> {
    const user = await this.requireUser(principal.subject);
    await this.requireActiveMember(user.id, clubId);
    const item = await this.prisma.clubWatchlistItem.findFirst({
      where: { id: itemId, clubId, archivedAt: null },
    });
    if (item === null)
      throw new AppException(404, 'CLUB_WATCHLIST_ITEM_NOT_FOUND', 'The suggestion was not found.');
    const existing = await this.prisma.clubWatchlistVote.findUnique({
      where: { itemId_userId: { itemId, userId: user.id } },
    });
    if (existing?.value === input.value) {
      await this.prisma.clubWatchlistVote.delete({
        where: { itemId_userId: { itemId, userId: user.id } },
      });
    } else {
      await this.prisma.clubWatchlistVote.upsert({
        where: { itemId_userId: { itemId, userId: user.id } },
        update: { value: input.value },
        create: { itemId, userId: user.id, value: input.value },
      });
    }
    return this.watchlistItemFor(itemId, user.id);
  }

  public async createWatchEvent(
    principal: AuthPrincipal,
    clubId: string,
    input: CreateClubWatchEventInput,
  ): Promise<ClubWatchEventSummary> {
    const user = await this.requireUser(principal.subject);
    await this.requireManager(user.id, clubId);
    if (input.mediaId != null) {
      const media = await this.prisma.media.findUnique({ where: { id: input.mediaId } });
      if (media === null)
        throw new AppException(404, 'MEDIA_NOT_FOUND', 'The title was not found.');
    }
    const event = await this.prisma.clubWatchEvent.create({
      data: {
        clubId,
        createdById: user.id,
        title: input.title,
        description: input.description ?? null,
        mediaId: input.mediaId ?? null,
        startsAt: new Date(input.startsAt),
        timezone: input.timezone,
        locationUrl: input.locationUrl ?? null,
      },
      include: { media: { include: { genres: true } }, createdBy: true },
    });
    return watchEventSummary(event);
  }

  private async detailsFor(viewerId: string, clubId: string): Promise<ClubDetails> {
    const club = await this.prisma.club.findFirst({
      where: { id: clubId, deletedAt: null },
      include: {
        members: {
          where: { status: { in: ['ACTIVE', 'PENDING'] } },
          include: { user: true },
          orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
          take: 100,
        },
        posts: {
          where: { deletedAt: null },
          include: { author: true },
          orderBy: { createdAt: 'desc' },
          take: 30,
        },
        polls: {
          include: {
            votes: true,
            options: { include: { media: { include: { genres: true } }, votes: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        watchlistItems: {
          where: { archivedAt: null },
          include: { media: { include: { genres: true } }, suggestedBy: true, votes: true },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        watchEvents: {
          where: { deletedAt: null, status: 'SCHEDULED' },
          include: { media: { include: { genres: true } }, createdBy: true },
          orderBy: { startsAt: 'asc' },
          take: 30,
        },
      },
    });
    if (club === null) throw new AppException(404, 'CLUB_NOT_FOUND', 'The club was not found.');
    const viewerMembership = club.members.find((member) => member.userId === viewerId) ?? null;
    if (club.visibility === 'PRIVATE' && viewerMembership?.status !== 'ACTIVE')
      throw new AppException(404, 'CLUB_NOT_FOUND', 'The club was not found.');
    return {
      ...clubSummary(club, viewerId),
      members: club.members.map(membershipSummary),
      posts: club.posts.map(postSummary),
      polls: club.polls.map((poll) => pollSummary(poll, viewerId)),
      watchlist: club.watchlistItems
        .map((item) => watchlistItemSummary(item, viewerId))
        .sort(
          (left, right) =>
            right.score - left.score || left.createdAt.localeCompare(right.createdAt),
        ),
      watchEvents: club.watchEvents.map(watchEventSummary),
    };
  }

  private async pollFor(pollId: string, viewerId: string): Promise<ClubPollSummary> {
    const poll = await this.prisma.clubPoll.findUniqueOrThrow({
      where: { id: pollId },
      include: {
        votes: true,
        options: { include: { media: { include: { genres: true } }, votes: true } },
      },
    });
    return pollSummary(poll, viewerId);
  }

  private async watchlistItemFor(
    itemId: string,
    viewerId: string,
  ): Promise<ClubWatchlistItemSummary> {
    const item = await this.prisma.clubWatchlistItem.findUniqueOrThrow({
      where: { id: itemId },
      include: { media: { include: { genres: true } }, suggestedBy: true, votes: true },
    });
    return watchlistItemSummary(item, viewerId);
  }

  private async requireActiveMember(userId: string, clubId: string) {
    const membership = await this.prisma.clubMember.findFirst({
      where: { clubId, userId, status: 'ACTIVE', club: { deletedAt: null } },
    });
    if (membership === null)
      throw new AppException(403, 'CLUB_MEMBERSHIP_REQUIRED', 'Join this club to continue.');
    return membership;
  }

  private async requireManager(userId: string, clubId: string) {
    const membership = await this.requireActiveMember(userId, clubId);
    if (!managerRoles.has(membership.role))
      throw new AppException(403, 'CLUB_MANAGER_REQUIRED', 'Club manager access is required.');
    return membership;
  }

  private async requireUser(authSubject: string) {
    const user = await this.prisma.user.findUnique({ where: { authSubject } });
    if (user === null || user.deletedAt !== null)
      throw new AppException(404, 'USER_NOT_FOUND', 'The member profile was not found.');
    return user;
  }
}
