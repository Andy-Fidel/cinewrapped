import type {
  AchievementSummary,
  ChallengeSummary,
  GamificationDashboard,
  GamificationMetric,
  LeaderboardEntry,
  LeaderboardMetric,
  LeaderboardSummary,
  MoviePassport,
  StreakSummary,
  UserSummary,
} from '@cinewrapped/shared-types';
import { Injectable } from '@nestjs/common';

import type { AuthPrincipal } from '../auth/auth.types.js';
import { AppException } from '../common/app.exception.js';
import { PrismaService } from '../database/prisma.service.js';

type MetricSnapshot = Record<GamificationMetric, number>;

type StreakDate = { watchedAt: Date };

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

function dateKey(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = (type: 'year' | 'month' | 'day') =>
    parts.find((part) => part.type === type)?.value ?? '00';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

function streakSummary(rows: StreakDate[], timezone: string): StreakSummary {
  const days = [...new Set(rows.map((row) => dateKey(row.watchedAt, timezone)))].sort();
  let longest = 0;
  let sequence = 0;
  let previous: number | null = null;
  for (const day of days) {
    const value = Date.parse(`${day}T00:00:00.000Z`);
    sequence = previous !== null && value - previous === 86_400_000 ? sequence + 1 : 1;
    longest = Math.max(longest, sequence);
    previous = value;
  }
  const last = days.at(-1) ?? null;
  const today = Date.parse(`${dateKey(new Date(), timezone)}T00:00:00.000Z`);
  const lastValue = last === null ? null : Date.parse(`${last}T00:00:00.000Z`);
  return {
    currentDays:
      lastValue !== null && today - lastValue <= 86_400_000 && today - lastValue >= 0
        ? sequence
        : 0,
    longestDays: longest,
    lastActiveDate: last,
    timezone,
  };
}

function criteria(value: unknown): { metric: GamificationMetric; target: number } | null {
  if (typeof value !== 'object' || value === null) return null;
  const candidate = value as { metric?: unknown; target?: unknown };
  const metrics: GamificationMetric[] = [
    'VIEWINGS',
    'UNIQUE_TITLES',
    'MINUTES_WATCHED',
    'REWATCHES',
    'RATINGS',
    'REVIEWS',
    'STREAK_DAYS',
    'COUNTRIES',
  ];
  if (
    typeof candidate.metric !== 'string' ||
    !metrics.includes(candidate.metric as GamificationMetric) ||
    typeof candidate.target !== 'number' ||
    !Number.isInteger(candidate.target) ||
    candidate.target < 1
  )
    return null;
  return { metric: candidate.metric as GamificationMetric, target: candidate.target };
}

@Injectable()
export class GamificationService {
  public constructor(private readonly prisma: PrismaService) {}

  public async dashboard(principal: AuthPrincipal): Promise<GamificationDashboard> {
    const user = await this.requireUser(principal.subject);
    const [achievements, challenges, passport, streak] = await Promise.all([
      this.syncAchievements(user.id, user.timezone),
      this.syncChallenges(user.id, user.timezone),
      this.passportFor(user.id),
      this.streakFor(user.id, user.timezone),
    ]);
    const totalPoints =
      achievements
        .filter((achievement) => achievement.unlockedAt !== null)
        .reduce((total, achievement) => total + achievement.points, 0) +
      challenges
        .filter((challenge) => challenge.completedAt !== null)
        .reduce((total, challenge) => total + challenge.points, 0);
    return {
      totalPoints,
      unlockedCount: achievements.filter((achievement) => achievement.unlockedAt !== null).length,
      achievementCount: achievements.length,
      achievements,
      challenges,
      streak,
      passport,
    };
  }

  public async joinChallenge(
    principal: AuthPrincipal,
    challengeId: string,
  ): Promise<ChallengeSummary> {
    const user = await this.requireUser(principal.subject);
    const now = new Date();
    const challenge = await this.prisma.challenge.findFirst({
      where: { id: challengeId, isActive: true, startsAt: { lte: now }, endsAt: { gt: now } },
    });
    if (challenge === null)
      throw new AppException(404, 'CHALLENGE_NOT_FOUND', 'The active challenge was not found.');
    await this.prisma.userChallenge.upsert({
      where: { userId_challengeId: { userId: user.id, challengeId } },
      update: {},
      create: { userId: user.id, challengeId },
    });
    const challenges = await this.syncChallenges(user.id, user.timezone);
    const result = challenges.find((item) => item.id === challengeId);
    if (result === undefined)
      throw new AppException(404, 'CHALLENGE_NOT_FOUND', 'The active challenge was not found.');
    return result;
  }

  public async leaderboard(
    principal: AuthPrincipal,
    metric: LeaderboardMetric,
    limit: number,
  ): Promise<LeaderboardSummary> {
    const viewer = await this.requireUser(principal.subject);
    const [friendIds, blockedIds] = await Promise.all([
      this.friendIds(viewer.id),
      this.blockedIds(viewer.id),
    ]);
    let settings = await this.prisma.privacySettings.findMany({
      where: {
        userId: { notIn: blockedIds },
        OR: [
          { userId: viewer.id },
          { leaderboardVisibility: 'PUBLIC' },
          { userId: { in: friendIds }, leaderboardVisibility: 'FRIENDS' },
        ],
        user: { deletedAt: null },
      },
      include: { user: true },
      orderBy: { userId: 'asc' },
      take: 200,
    });
    if (!settings.some((item) => item.userId === viewer.id)) {
      const viewerSettings = await this.prisma.privacySettings.findUnique({
        where: { userId: viewer.id },
        include: { user: true },
      });
      if (viewerSettings !== null) settings = [...settings.slice(0, 199), viewerSettings];
    }
    const candidateIds = settings.map((item) => item.userId);
    const scores = await this.leaderboardScores(
      candidateIds,
      metric,
      new Map(settings.map((item) => [item.userId, item.user.timezone])),
    );
    const ranked = settings
      .map((item) => ({ user: item.user, score: scores.get(item.userId) ?? 0 }))
      .sort(
        (left, right) =>
          right.score - left.score || left.user.username.localeCompare(right.user.username),
      )
      .map((item, index): LeaderboardEntry => ({
        rank: index + 1,
        user: userSummary(item.user),
        score: item.score,
        isViewer: item.user.id === viewer.id,
      }));
    return {
      metric,
      visibilityNote:
        'Only members who permit public ranking, accepted friends who permit friend ranking, and you are included.',
      entries: ranked.slice(0, limit),
      viewerEntry: ranked.find((entry) => entry.isViewer) ?? null,
    };
  }

  public async passport(principal: AuthPrincipal): Promise<MoviePassport> {
    const user = await this.requireUser(principal.subject);
    return this.passportFor(user.id);
  }

  private async syncAchievements(userId: string, timezone: string): Promise<AchievementSummary[]> {
    const [definitions, snapshot, privacy] = await Promise.all([
      this.prisma.achievement.findMany({
        where: { isActive: true },
        include: { users: { where: { userId }, take: 1 } },
        orderBy: [{ tier: 'asc' }, { points: 'asc' }, { code: 'asc' }],
      }),
      this.metrics(userId, timezone),
      this.prisma.privacySettings.findUnique({ where: { userId } }),
    ]);
    const newlyUnlocked: Array<{ achievementId: string; unlockedAt: Date }> = [];
    await this.prisma.$transaction(
      definitions.flatMap((definition) => {
        const rule = criteria(definition.criteriaJson);
        if (rule === null) return [];
        const existing = definition.users[0];
        const progress = Math.min(snapshot[rule.metric], rule.target);
        const unlockedAt = existing?.unlockedAt ?? (progress >= rule.target ? new Date() : null);
        if (existing?.unlockedAt == null && unlockedAt !== null)
          newlyUnlocked.push({ achievementId: definition.id, unlockedAt });
        return [
          this.prisma.userAchievement.upsert({
            where: { userId_achievementId: { userId, achievementId: definition.id } },
            update: { progress, target: rule.target, unlockedAt },
            create: {
              userId,
              achievementId: definition.id,
              progress,
              target: rule.target,
              unlockedAt,
            },
          }),
        ];
      }),
    );
    if (privacy?.shareAchievementActivity === true && newlyUnlocked.length > 0) {
      const unlockRows = await this.prisma.userAchievement.findMany({
        where: {
          userId,
          achievementId: { in: newlyUnlocked.map((item) => item.achievementId) },
          unlockedAt: { not: null },
        },
        select: { id: true, achievementId: true, unlockedAt: true },
      });
      await this.prisma.feedActivity.createMany({
        data: unlockRows.map((item) => ({
          actorUserId: userId,
          activityType: 'USER_UNLOCKED_ACHIEVEMENT' as const,
          entityType: 'ACHIEVEMENT' as const,
          entityId: item.id,
          visibility: 'FRIENDS' as const,
          occurredAt: item.unlockedAt ?? new Date(),
          metadataJson: { achievementId: item.achievementId },
        })),
        skipDuplicates: true,
      });
    }
    return definitions.flatMap((definition): AchievementSummary[] => {
      const rule = criteria(definition.criteriaJson);
      if (rule === null) return [];
      const existing = definition.users[0];
      const progress = Math.min(snapshot[rule.metric], rule.target);
      return [
        {
          id: definition.id,
          code: definition.code,
          name: definition.name,
          description: definition.description,
          category: definition.category,
          tier: definition.tier,
          points: definition.points,
          progress,
          target: rule.target,
          unlockedAt:
            existing?.unlockedAt?.toISOString() ??
            (progress >= rule.target
              ? (newlyUnlocked
                  .find((item) => item.achievementId === definition.id)
                  ?.unlockedAt.toISOString() ?? null)
              : null),
        },
      ];
    });
  }

  private async syncChallenges(userId: string, timezone: string): Promise<ChallengeSummary[]> {
    const now = new Date();
    const challenges = await this.prisma.challenge.findMany({
      where: {
        isActive: true,
        OR: [{ startsAt: { lte: now }, endsAt: { gt: now } }, { users: { some: { userId } } }],
      },
      include: { users: { where: { userId }, take: 1 } },
      orderBy: [{ endsAt: 'asc' }, { code: 'asc' }],
    });
    const results: ChallengeSummary[] = [];
    for (const challenge of challenges) {
      const participation = challenge.users[0];
      let progress = participation?.progress ?? 0;
      let completedAt = participation?.completedAt ?? null;
      if (participation !== undefined) {
        const snapshot = await this.metrics(userId, timezone, challenge.startsAt, challenge.endsAt);
        progress = Math.min(snapshot[challenge.metric], challenge.target);
        completedAt = completedAt ?? (progress >= challenge.target ? new Date() : null);
        await this.prisma.userChallenge.update({
          where: { id: participation.id },
          data: { progress, completedAt },
        });
      }
      results.push({
        id: challenge.id,
        code: challenge.code,
        name: challenge.name,
        description: challenge.description,
        metric: challenge.metric,
        target: challenge.target,
        points: challenge.points,
        startsAt: challenge.startsAt.toISOString(),
        endsAt: challenge.endsAt.toISOString(),
        joined: participation !== undefined,
        progress,
        completedAt: completedAt?.toISOString() ?? null,
      });
    }
    return results;
  }

  private async metrics(
    userId: string,
    timezone: string,
    periodStart?: Date,
    periodEnd?: Date,
  ): Promise<MetricSnapshot> {
    const dateFilter =
      periodStart === undefined || periodEnd === undefined
        ? {}
        : { watchedAt: { gte: periodStart, lt: periodEnd } };
    const [viewings, ratings, reviews] = await Promise.all([
      this.prisma.viewing.findMany({
        where: { userId, deletedAt: null, ...dateFilter },
        select: {
          mediaId: true,
          watchedAt: true,
          durationWatchedMin: true,
          isRewatch: true,
          media: { select: { runtimeMinutes: true, countryCodes: true } },
        },
        take: 10_001,
      }),
      this.prisma.rating.count({
        where: {
          userId,
          deletedAt: null,
          ...(periodStart === undefined || periodEnd === undefined
            ? {}
            : { updatedAt: { gte: periodStart, lt: periodEnd } }),
        },
      }),
      this.prisma.review.count({
        where: {
          userId,
          deletedAt: null,
          status: 'PUBLISHED',
          ...(periodStart === undefined || periodEnd === undefined
            ? {}
            : { publishedAt: { gte: periodStart, lt: periodEnd } }),
        },
      }),
    ]);
    if (viewings.length > 10_000)
      throw new AppException(
        422,
        'GAMIFICATION_LIMIT_EXCEEDED',
        'Choose a shorter challenge period.',
      );
    const streak = streakSummary(viewings, timezone);
    return {
      VIEWINGS: viewings.length,
      UNIQUE_TITLES: new Set(viewings.map((viewing) => viewing.mediaId)).size,
      MINUTES_WATCHED: viewings.reduce(
        (total, viewing) =>
          total + Math.max(0, viewing.durationWatchedMin ?? viewing.media.runtimeMinutes ?? 0),
        0,
      ),
      REWATCHES: viewings.filter((viewing) => viewing.isRewatch).length,
      RATINGS: ratings,
      REVIEWS: reviews,
      STREAK_DAYS: streak.longestDays,
      COUNTRIES: new Set(viewings.flatMap((viewing) => viewing.media.countryCodes)).size,
    };
  }

  private async streakFor(userId: string, timezone: string): Promise<StreakSummary> {
    const rows = await this.prisma.viewing.findMany({
      where: { userId, deletedAt: null },
      select: { watchedAt: true },
      orderBy: { watchedAt: 'asc' },
      take: 10_001,
    });
    if (rows.length > 10_000)
      throw new AppException(
        422,
        'GAMIFICATION_LIMIT_EXCEEDED',
        'The streak history is too large.',
      );
    return streakSummary(rows, timezone);
  }

  private async passportFor(userId: string): Promise<MoviePassport> {
    const viewings = await this.prisma.viewing.findMany({
      where: { userId, deletedAt: null },
      select: {
        mediaId: true,
        watchedAt: true,
        media: { select: { countryCodes: true, originalLanguage: true, releaseYear: true } },
      },
      orderBy: { watchedAt: 'asc' },
      take: 10_001,
    });
    if (viewings.length > 10_000)
      throw new AppException(
        422,
        'GAMIFICATION_LIMIT_EXCEEDED',
        'The passport history is too large.',
      );
    const stamps = new Map<
      string,
      { viewings: number; mediaIds: Set<string>; first: Date; last: Date }
    >();
    for (const viewing of viewings) {
      for (const countryCode of viewing.media.countryCodes) {
        const current = stamps.get(countryCode);
        if (current === undefined) {
          stamps.set(countryCode, {
            viewings: 1,
            mediaIds: new Set([viewing.mediaId]),
            first: viewing.watchedAt,
            last: viewing.watchedAt,
          });
        } else {
          current.viewings += 1;
          current.mediaIds.add(viewing.mediaId);
          current.last = viewing.watchedAt;
        }
      }
    }
    return {
      countriesVisited: stamps.size,
      languagesExplored: new Set(
        viewings.flatMap((viewing) =>
          viewing.media.originalLanguage === null ? [] : [viewing.media.originalLanguage],
        ),
      ).size,
      decadesExplored: new Set(
        viewings.flatMap((viewing) =>
          viewing.media.releaseYear === null
            ? []
            : [Math.floor(viewing.media.releaseYear / 10) * 10],
        ),
      ).size,
      totalStamps: stamps.size,
      stamps: [...stamps.entries()]
        .map(([countryCode, stamp]) => ({
          countryCode,
          viewingCount: stamp.viewings,
          uniqueTitles: stamp.mediaIds.size,
          firstVisitedAt: stamp.first.toISOString(),
          lastVisitedAt: stamp.last.toISOString(),
        }))
        .sort(
          (left, right) =>
            right.viewingCount - left.viewingCount ||
            left.countryCode.localeCompare(right.countryCode),
        ),
    };
  }

  private async leaderboardScores(
    userIds: string[],
    metric: LeaderboardMetric,
    timezones: Map<string, string>,
  ): Promise<Map<string, number>> {
    const scores = new Map(userIds.map((id) => [id, 0]));
    if (userIds.length === 0) return scores;
    if (metric === 'POINTS') {
      const [achievements, challenges] = await Promise.all([
        this.prisma.userAchievement.findMany({
          where: { userId: { in: userIds }, unlockedAt: { not: null } },
          include: { achievement: { select: { points: true } } },
        }),
        this.prisma.userChallenge.findMany({
          where: { userId: { in: userIds }, completedAt: { not: null } },
          include: { challenge: { select: { points: true } } },
        }),
      ]);
      for (const row of achievements)
        scores.set(row.userId, (scores.get(row.userId) ?? 0) + row.achievement.points);
      for (const row of challenges)
        scores.set(row.userId, (scores.get(row.userId) ?? 0) + row.challenge.points);
      return scores;
    }
    const viewings = await this.prisma.viewing.findMany({
      where: { userId: { in: userIds }, deletedAt: null },
      select: { userId: true, watchedAt: true },
      take: 50_001,
    });
    if (viewings.length > 50_000)
      throw new AppException(
        422,
        'LEADERBOARD_LIMIT_EXCEEDED',
        'The leaderboard sample is too large.',
      );
    if (metric === 'VIEWINGS') {
      for (const row of viewings) scores.set(row.userId, (scores.get(row.userId) ?? 0) + 1);
      return scores;
    }
    const rowsByUser = new Map<string, StreakDate[]>();
    for (const row of viewings)
      rowsByUser.set(row.userId, [...(rowsByUser.get(row.userId) ?? []), row]);
    for (const userId of userIds)
      scores.set(
        userId,
        streakSummary(rowsByUser.get(userId) ?? [], timezones.get(userId) ?? 'UTC').currentDays,
      );
    return scores;
  }

  private async friendIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.friendship.findMany({
      where: { status: 'ACCEPTED', OR: [{ userAId: userId }, { userBId: userId }] },
      select: { userAId: true, userBId: true },
    });
    return rows.map((row) => (row.userAId === userId ? row.userBId : row.userAId));
  }

  private async blockedIds(userId: string): Promise<string[]> {
    const [created, received] = await Promise.all([
      this.prisma.userBlock.findMany({ where: { blockerId: userId }, select: { blockedId: true } }),
      this.prisma.userBlock.findMany({ where: { blockedId: userId }, select: { blockerId: true } }),
    ]);
    return [
      ...new Set([...created.map((row) => row.blockedId), ...received.map((row) => row.blockerId)]),
    ];
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
}
