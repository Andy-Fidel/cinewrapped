import type {
  ActivityHeatmapDay,
  ActivityHeatmapSummary,
  MonthlyWatchCount,
  RankedStatistic,
  StatisticsSummary,
  TasteStatistics,
  TopTitleStatistic,
  WrapDetail,
  WrapHighlights,
  WrapShareCard,
  WrapStorySlide,
  WrapSummary,
  WrapType,
} from '@cinewrapped/shared-types';
import { Prisma } from '@cinewrapped/database';
import { Injectable } from '@nestjs/common';

import type { AuthPrincipal } from '../auth/auth.types.js';
import { AppException } from '../common/app.exception.js';
import { PrismaService } from '../database/prisma.service.js';

type ViewingRecord = Prisma.ViewingGetPayload<{
  include: { media: { include: { genres: { include: { genre: true } } } } };
}>;

type Period = { periodStart: Date; periodEnd: Date; timezone: string };
type GeneratedWrapType = Exclude<WrapType, 'CUSTOM'>;

function validateTimezone(timezone: string): void {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
  } catch {
    throw new AppException(400, 'TIMEZONE_INVALID', 'The requested timezone is invalid.');
  }
}

function localParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const value = (type: 'year' | 'month' | 'day' | 'hour') =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: value('hour'),
  };
}

function zonedMidnight(year: number, month: number, day: number, timezone: string): Date {
  const target = Date.UTC(year, month - 1, day);
  let guess = target;
  for (let index = 0; index < 3; index += 1) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(guess));
    const number = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((part) => part.type === type)?.value ?? 0);
    const represented = Date.UTC(
      number('year'),
      number('month') - 1,
      number('day'),
      number('hour'),
      number('minute'),
      number('second'),
    );
    guess += target - represented;
  }
  return new Date(guess);
}

function dateKey(date: Date, timezone: string): string {
  const { year, month, day } = localParts(date, timezone);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function nextCalendarDate(year: number, month: number, day: number, days: number) {
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

function countRanks(values: Array<{ id: string; label: string }>, limit = 8): RankedStatistic[] {
  const counts = new Map<string, { label: string; count: number }>();
  for (const value of values) {
    const current = counts.get(value.id);
    counts.set(value.id, { label: value.label, count: (current?.count ?? 0) + 1 });
  }
  return [...counts.entries()]
    .map(([id, value]) => ({ id, ...value }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
    .slice(0, limit);
}

function longestStreak(viewings: ViewingRecord[], timezone: string): number {
  const days = [...new Set(viewings.map((viewing) => dateKey(viewing.watchedAt, timezone)))].sort();
  let longest = 0;
  let current = 0;
  let previous: number | null = null;
  for (const day of days) {
    const value = Date.parse(`${day}T00:00:00.000Z`);
    current = previous !== null && value - previous === 86_400_000 ? current + 1 : 1;
    longest = Math.max(longest, current);
    previous = value;
  }
  return longest;
}

function currentStreakCalc(viewings: ViewingRecord[], timezone: string, now = new Date()): number {
  const activeDaysSet = new Set(viewings.map((v) => dateKey(v.watchedAt, timezone)));
  const todayKey = dateKey(now, timezone);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = dateKey(yesterday, timezone);

  const checkDate: Date | null = activeDaysSet.has(todayKey)
    ? new Date(now)
    : activeDaysSet.has(yesterdayKey)
      ? yesterday
      : null;
  if (checkDate === null) return 0;

  let streak = 0;
  while (activeDaysSet.has(dateKey(checkDate, timezone))) {
    streak += 1;
    checkDate.setDate(checkDate.getDate() - 1);
  }
  return streak;
}

function wrapCursor(cursor: string | undefined): { periodEnd: Date; id: string } | null {
  if (cursor === undefined) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as unknown;
    if (typeof parsed !== 'object' || parsed === null) throw new Error();
    const candidate = parsed as { periodEnd?: unknown; id?: unknown };
    if (typeof candidate.periodEnd !== 'string' || typeof candidate.id !== 'string')
      throw new Error();
    const periodEnd = new Date(candidate.periodEnd);
    if (Number.isNaN(periodEnd.getTime())) throw new Error();
    return { periodEnd, id: candidate.id };
  } catch {
    throw new AppException(400, 'CURSOR_INVALID', 'The wrap cursor is invalid.');
  }
}

function encodeWrapCursor(value: { periodEnd: Date; id: string } | undefined): string | null {
  return value === undefined
    ? null
    : Buffer.from(
        JSON.stringify({ periodEnd: value.periodEnd.toISOString(), id: value.id }),
        'utf8',
      ).toString('base64url');
}

@Injectable()
export class InsightsService {
  public constructor(private readonly prisma: PrismaService) {}

  public async summary(principal: AuthPrincipal, period: Period): Promise<StatisticsSummary> {
    const user = await this.requireUser(principal.subject);
    return this.statistics(user.id, this.checkedPeriod(period));
  }

  public async monthly(
    principal: AuthPrincipal,
    year: number,
    timezone: string,
  ): Promise<MonthlyWatchCount[]> {
    const user = await this.requireUser(principal.subject);
    validateTimezone(timezone);
    const periodStart = zonedMidnight(year, 1, 1, timezone);
    const periodEnd = zonedMidnight(year + 1, 1, 1, timezone);
    const viewings = await this.viewings(user.id, { periodStart, periodEnd, timezone });
    return Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const rows = viewings.filter(
        (viewing) => localParts(viewing.watchedAt, timezone).month === month,
      );
      return {
        month,
        label: new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(
          new Date(Date.UTC(year, index, 1)),
        ),
        viewingCount: rows.length,
        uniqueTitles: new Set(rows.map((row) => row.mediaId)).size,
        minutesWatched: rows.reduce((total, row) => total + this.minutes(row), 0),
      };
    });
  }

  public async activityHeatmap(
    principal: AuthPrincipal,
    year: number,
    timezone: string,
  ): Promise<ActivityHeatmapSummary> {
    const user = await this.requireUser(principal.subject);
    validateTimezone(timezone);
    const periodStart = zonedMidnight(year, 1, 1, timezone);
    const periodEnd = zonedMidnight(year + 1, 1, 1, timezone);

    const allViewings = await this.prisma.viewing.findMany({
      where: { userId: user.id, deletedAt: null },
      include: { media: { include: { genres: { include: { genre: true } } } } },
      orderBy: { watchedAt: 'desc' },
    });

    const yearViewings = allViewings.filter(
      (v) => v.watchedAt >= periodStart && v.watchedAt < periodEnd,
    );

    const viewingsByDay = new Map<string, ViewingRecord[]>();
    for (const v of yearViewings) {
      const key = dateKey(v.watchedAt, timezone);
      const list = viewingsByDay.get(key) ?? [];
      list.push(v);
      viewingsByDay.set(key, list);
    }

    const days: ActivityHeatmapDay[] = [];
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    const totalDaysInYear = isLeap ? 366 : 365;

    const weekdayCounts = [0, 0, 0, 0, 0, 0, 0]; // 0=Sun, 1=Mon, ..., 6=Sat

    const d = new Date(Date.UTC(year, 0, 1));
    for (let i = 0; i < totalDaysInYear; i++) {
      const currentMonth = d.getUTCMonth() + 1;
      const currentDay = d.getUTCDate();
      const key = `${year}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
      const dayViewings = viewingsByDay.get(key) ?? [];
      const count = dayViewings.length;
      const minutesWatched = dayViewings.reduce((sum, v) => sum + this.minutes(v), 0);

      let intensity: 0 | 1 | 2 | 3 | 4 = 0;
      if (count >= 4) intensity = 4;
      else if (count === 3) intensity = 3;
      else if (count === 2) intensity = 2;
      else if (count === 1) intensity = 1;

      const weekday = d.getUTCDay();
      weekdayCounts[weekday] = (weekdayCounts[weekday] ?? 0) + count;

      days.push({
        date: key,
        count,
        minutesWatched,
        intensity,
        viewings: dayViewings.map((v) => ({
          id: v.id,
          mediaId: v.mediaId,
          title: v.media.title,
          posterUrl: v.media.posterUrl,
          watchedAt: v.watchedAt.toISOString(),
          mediaType: v.media.mediaType,
        })),
      });

      d.setUTCDate(d.getUTCDate() + 1);
    }

    const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekdayFullNames = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    const totalYearCount = yearViewings.length;

    const weekdayDistribution = [1, 2, 3, 4, 5, 6, 0].map((idx) => {
      const count = weekdayCounts[idx] ?? 0;
      return {
        day: weekdayNames[idx] ?? 'Mon',
        fullDay: weekdayFullNames[idx] ?? 'Monday',
        count,
        percent: totalYearCount > 0 ? Math.round((count / totalYearCount) * 100) : 0,
      };
    });

    const maxWeekdayIndex = weekdayCounts.reduce(
      (bestIdx, count, idx, arr) => (count > (arr[bestIdx] ?? 0) ? idx : bestIdx),
      5,
    );

    const activeDaysCount = viewingsByDay.size;
    const currentStreakDays = currentStreakCalc(allViewings, timezone);
    const longestStreakDays = longestStreak(allViewings, timezone);
    const totalMinutesWatched = yearViewings.reduce((sum, v) => sum + this.minutes(v), 0);

    // Circadian Rhythm
    const hourlyCounts: number[] = Array<number>(24).fill(0);
    let morningCount = 0;
    let afternoonCount = 0;
    let eveningCount = 0;
    let nightCount = 0;

    for (const v of yearViewings) {
      const { hour } = localParts(v.watchedAt, timezone);
      hourlyCounts[hour] = (hourlyCounts[hour] ?? 0) + 1;
      if (hour >= 6 && hour < 12) morningCount += 1;
      else if (hour >= 12 && hour < 18) afternoonCount += 1;
      else if (hour >= 18 && hour < 23) eveningCount += 1;
      else nightCount += 1;
    }

    const peakHour = hourlyCounts.reduce(
      (bestHour, count, hour, arr) => (count > (arr[bestHour] ?? 0) ? hour : bestHour),
      20,
    );

    const formatHourLabel = (h: number) => {
      const period = h >= 12 ? 'PM' : 'AM';
      const formatted = h % 12 === 0 ? 12 : h % 12;
      return `${formatted}:00 ${period}`;
    };

    let persona = 'Prime Evening Cinephile';
    const maxBucket = Math.max(morningCount, afternoonCount, eveningCount, nightCount);
    if (maxBucket === nightCount && nightCount > 0) persona = 'Midnight Club Auteur';
    else if (maxBucket === afternoonCount && afternoonCount > 0) persona = 'Afternoon Matinee Buff';
    else if (maxBucket === morningCount && morningCount > 0) persona = 'Early Bird Cinephile';

    const circadianRhythm = {
      persona,
      peakHourLabel: formatHourLabel(peakHour),
      morningPercent: totalYearCount > 0 ? Math.round((morningCount / totalYearCount) * 100) : 0,
      afternoonPercent:
        totalYearCount > 0 ? Math.round((afternoonCount / totalYearCount) * 100) : 0,
      eveningPercent: totalYearCount > 0 ? Math.round((eveningCount / totalYearCount) * 100) : 0,
      nightPercent: totalYearCount > 0 ? Math.round((nightCount / totalYearCount) * 100) : 0,
    };

    return {
      year,
      totalViewings: yearViewings.length,
      totalMinutesWatched,
      activeDaysCount,
      currentStreakDays,
      longestStreakDays,
      mostActiveWeekday: {
        name: weekdayFullNames[maxWeekdayIndex] ?? 'Friday',
        index: maxWeekdayIndex,
        count: weekdayCounts[maxWeekdayIndex] ?? 0,
        percent:
          totalYearCount > 0
            ? Math.round(((weekdayCounts[maxWeekdayIndex] ?? 0) / totalYearCount) * 100)
            : 0,
      },
      weekdayDistribution,
      circadianRhythm,
      days,
    };
  }

  public async taste(principal: AuthPrincipal, period: Period): Promise<TasteStatistics> {
    const user = await this.requireUser(principal.subject);
    return this.tasteFor(user.id, this.checkedPeriod(period));
  }

  public async createWrap(
    principal: AuthPrincipal,
    input: {
      type: GeneratedWrapType;
      timezone: string;
      inputVersion: number;
      periodStart?: string | undefined;
      periodEnd?: string | undefined;
    },
  ): Promise<WrapDetail> {
    const user = await this.requireUser(principal.subject);
    const period = this.resolveWrapPeriod(
      input.type,
      input.timezone,
      input.periodStart,
      input.periodEnd,
    );
    const key = {
      userId: user.id,
      wrapType: input.type,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      inputVersion: input.inputVersion,
    };
    const existing = await this.prisma.wrap.findUnique({
      where: { userId_wrapType_periodStart_periodEnd_inputVersion: key },
    });
    if (existing?.status === 'COMPLETED' && existing.deletedAt === null)
      return this.wrapDetail(existing);
    const wrap = await this.prisma.wrap.upsert({
      where: { userId_wrapType_periodStart_periodEnd_inputVersion: key },
      update: {
        status: 'GENERATING',
        failureCode: null,
        deletedAt: null,
        timezone: input.timezone,
      },
      create: { ...key, timezone: input.timezone, status: 'GENERATING' },
    });
    try {
      const [statistics, taste] = await Promise.all([
        this.statistics(user.id, period),
        this.tasteFor(user.id, period),
      ]);
      const highlights = this.highlights(input.type, statistics);
      const slides = this.slides(input.type, statistics, highlights, taste);
      const completed = await this.prisma.wrap.update({
        where: { id: wrap.id },
        data: {
          status: 'COMPLETED',
          statisticsJson: statistics as unknown as Prisma.InputJsonValue,
          highlightsJson: highlights as unknown as Prisma.InputJsonValue,
          storySlidesJson: slides as unknown as Prisma.InputJsonValue,
          generatedAt: new Date(),
          failureCode: null,
        },
      });
      return this.wrapDetail(completed);
    } catch (error) {
      await this.prisma.wrap.update({
        where: { id: wrap.id },
        data: { status: 'FAILED', failureCode: 'GENERATION_FAILED' },
      });
      throw error;
    }
  }

  public async wraps(
    principal: AuthPrincipal,
    query: {
      type?: WrapType | undefined;
      status?: WrapSummary['status'] | undefined;
      limit: number;
      cursor?: string | undefined;
    },
  ) {
    const user = await this.requireUser(principal.subject);
    const cursor = wrapCursor(query.cursor);
    const rows = await this.prisma.wrap.findMany({
      where: {
        userId: user.id,
        deletedAt: null,
        ...(query.type === undefined ? {} : { wrapType: query.type }),
        ...(query.status === undefined ? {} : { status: query.status }),
        ...(cursor === null
          ? {}
          : {
              OR: [
                { periodEnd: { lt: cursor.periodEnd } },
                { periodEnd: cursor.periodEnd, id: { lt: cursor.id } },
              ],
            }),
      },
      orderBy: [{ periodEnd: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const page = rows.slice(0, query.limit);
    return {
      items: page.map((row) => this.wrapSummary(row)),
      nextCursor: rows.length > query.limit ? encodeWrapCursor(page.at(-1)) : null,
    };
  }

  public async wrap(principal: AuthPrincipal, wrapId: string): Promise<WrapDetail> {
    const user = await this.requireUser(principal.subject);
    const row = await this.prisma.wrap.findFirst({
      where: { id: wrapId, userId: user.id, deletedAt: null },
    });
    if (row === null) this.wrapNotFound();
    return this.wrapDetail(row);
  }

  public async deleteWrap(principal: AuthPrincipal, wrapId: string): Promise<void> {
    const user = await this.requireUser(principal.subject);
    const result = await this.prisma.wrap.updateMany({
      where: { id: wrapId, userId: user.id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (result.count === 0) this.wrapNotFound();
  }

  public async shareCard(
    principal: AuthPrincipal,
    wrapId: string,
    input: { expiresInMinutes: number; slideIndex: number },
  ): Promise<WrapShareCard> {
    const wrap = await this.wrap(principal, wrapId);
    if (wrap.status !== 'COMPLETED' || wrap.statistics === null || wrap.storySlides === null) {
      throw new AppException(409, 'WRAP_NOT_READY', 'The wrap is not ready to share.');
    }
    const slide = wrap.storySlides[input.slideIndex] ?? wrap.storySlides[0];
    if (slide === undefined)
      throw new AppException(409, 'WRAP_EMPTY', 'The wrap has no shareable slides.');
    return {
      wrapId,
      title: slide.title,
      subtitle: slide.body,
      statValue: slide.statValue ?? String(wrap.statistics.viewingCount),
      statLabel: slide.statLabel ?? 'viewings',
      accent: slide.accent,
      deepLink: `cinewrapped://wraps/${wrapId}`,
      webUrl: `https://cinewrapped.example/wraps/${wrapId}`,
      expiresAt: new Date(Date.now() + input.expiresInMinutes * 60_000).toISOString(),
    };
  }

  private checkedPeriod(period: Period): Period {
    validateTimezone(period.timezone);
    if (
      Number.isNaN(period.periodStart.getTime()) ||
      Number.isNaN(period.periodEnd.getTime()) ||
      period.periodStart >= period.periodEnd
    ) {
      throw new AppException(400, 'PERIOD_INVALID', 'The statistics period is invalid.');
    }
    const maximumDays = 366 * 5;
    if (period.periodEnd.getTime() - period.periodStart.getTime() > maximumDays * 86_400_000) {
      throw new AppException(
        400,
        'PERIOD_TOO_LARGE',
        'Statistics periods are limited to five years.',
      );
    }
    return period;
  }

  private resolveWrapPeriod(
    type: GeneratedWrapType,
    timezone: string,
    start?: string,
    end?: string,
  ): Period {
    validateTimezone(timezone);
    if (start !== undefined && end !== undefined) {
      return this.checkedPeriod({
        periodStart: new Date(start),
        periodEnd: new Date(end),
        timezone,
      });
    }
    const current = localParts(new Date(), timezone);
    let startDate: { year: number; month: number; day: number } = current;
    let endDate: { year: number; month: number; day: number };
    if (type === 'WEEKLY') {
      const weekday = new Date(Date.UTC(current.year, current.month - 1, current.day)).getUTCDay();
      startDate = nextCalendarDate(
        current.year,
        current.month,
        current.day,
        -(weekday === 0 ? 6 : weekday - 1),
      );
      endDate = nextCalendarDate(startDate.year, startDate.month, startDate.day, 7);
    } else if (type === 'MONTHLY') {
      startDate = { ...current, day: 1 };
      endDate =
        current.month === 12
          ? { year: current.year + 1, month: 1, day: 1 }
          : { year: current.year, month: current.month + 1, day: 1 };
    } else {
      startDate = { year: current.year, month: 1, day: 1 };
      endDate = { year: current.year + 1, month: 1, day: 1 };
    }
    return {
      periodStart: zonedMidnight(startDate.year, startDate.month, startDate.day, timezone),
      periodEnd: zonedMidnight(endDate.year, endDate.month, endDate.day, timezone),
      timezone,
    };
  }

  private async statistics(userId: string, period: Period): Promise<StatisticsSummary> {
    const viewings = await this.viewings(userId, period);
    const mediaIds = [...new Set(viewings.map((viewing) => viewing.mediaId))];
    const ratings =
      mediaIds.length === 0
        ? []
        : await this.prisma.rating.findMany({
            where: {
              userId,
              mediaId: { in: mediaIds },
              deletedAt: null,
              normalizedScore: { not: null },
            },
          });
    const titleMap = new Map<string, TopTitleStatistic>();
    for (const viewing of viewings) {
      const current = titleMap.get(viewing.mediaId);
      titleMap.set(viewing.mediaId, {
        mediaId: viewing.mediaId,
        title: viewing.media.title,
        posterUrl: viewing.media.posterUrl,
        viewingCount: (current?.viewingCount ?? 0) + 1,
        minutesWatched: (current?.minutesWatched ?? 0) + this.minutes(viewing),
      });
    }
    const totalMinutes = viewings.reduce((total, viewing) => total + this.minutes(viewing), 0);
    const scoreTotal = ratings.reduce((total, rating) => total + Number(rating.normalizedScore), 0);
    return {
      periodStart: period.periodStart.toISOString(),
      periodEnd: period.periodEnd.toISOString(),
      timezone: period.timezone,
      uniqueTitles: mediaIds.length,
      viewingCount: viewings.length,
      totalMinutes,
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      rewatchCount: viewings.filter((viewing) => viewing.isRewatch).length,
      averageRatingPercent:
        ratings.length === 0 ? null : Math.round((scoreTotal / ratings.length) * 10) / 10,
      ratedTitleCount: ratings.length,
      activeDays: new Set(viewings.map((viewing) => dateKey(viewing.watchedAt, period.timezone)))
        .size,
      longestStreakDays: longestStreak(viewings, period.timezone),
      movieViewings: viewings.filter((viewing) => viewing.media.mediaType === 'MOVIE').length,
      tvViewings: viewings.filter((viewing) => viewing.media.mediaType === 'TV').length,
      topGenres: countRanks(
        viewings.flatMap((viewing) =>
          viewing.media.genres.map(({ genre }) => ({ id: genre.id, label: genre.name })),
        ),
        5,
      ),
      topTitles: [...titleMap.values()]
        .sort(
          (left, right) =>
            right.viewingCount - left.viewingCount ||
            right.minutesWatched - left.minutesWatched ||
            left.title.localeCompare(right.title),
        )
        .slice(0, 5),
    };
  }

  private async tasteFor(userId: string, period: Period): Promise<TasteStatistics> {
    const viewings = await this.viewings(userId, period);
    const runtimeBucket = (minutes: number | null) => {
      if (minutes === null) return { id: 'unknown', label: 'Unknown runtime' };
      if (minutes < 60) return { id: 'under-60', label: 'Under 60 min' };
      if (minutes < 120) return { id: '60-119', label: '60–119 min' };
      if (minutes < 180) return { id: '120-179', label: '120–179 min' };
      return { id: '180-plus', label: '180+ min' };
    };
    return {
      periodStart: period.periodStart.toISOString(),
      periodEnd: period.periodEnd.toISOString(),
      timezone: period.timezone,
      sampleSize: viewings.length,
      genres: countRanks(
        viewings.flatMap((viewing) =>
          viewing.media.genres.map(({ genre }) => ({ id: genre.id, label: genre.name })),
        ),
      ),
      languages: countRanks(
        viewings.map((viewing) => ({
          id: viewing.media.originalLanguage ?? 'unknown',
          label: viewing.media.originalLanguage?.toUpperCase() ?? 'Unknown',
        })),
      ),
      decades: countRanks(
        viewings.map((viewing) => {
          const decade =
            viewing.media.releaseYear === null
              ? null
              : Math.floor(viewing.media.releaseYear / 10) * 10;
          return {
            id: decade === null ? 'unknown' : String(decade),
            label: decade === null ? 'Unknown' : `${decade}s`,
          };
        }),
      ),
      runtimeBuckets: countRanks(
        viewings.map((viewing) => runtimeBucket(viewing.media.runtimeMinutes)),
      ),
    };
  }

  private async viewings(userId: string, period: Period): Promise<ViewingRecord[]> {
    const rows = await this.prisma.viewing.findMany({
      where: {
        userId,
        deletedAt: null,
        watchedAt: { gte: period.periodStart, lt: period.periodEnd },
      },
      include: { media: { include: { genres: { include: { genre: true } } } } },
      orderBy: [{ watchedAt: 'asc' }, { id: 'asc' }],
      take: 10_001,
    });
    if (rows.length > 10_000) {
      throw new AppException(
        422,
        'STATISTICS_LIMIT_EXCEEDED',
        'This period contains too many viewing records. Choose a shorter period.',
      );
    }
    return rows;
  }

  private minutes(viewing: ViewingRecord): number {
    return Math.max(0, viewing.durationWatchedMin ?? viewing.media.runtimeMinutes ?? 0);
  }

  private highlights(type: GeneratedWrapType, statistics: StatisticsSummary): WrapHighlights {
    const label = type === 'WEEKLY' ? 'week' : type === 'MONTHLY' ? 'month' : 'year';
    return {
      headline:
        statistics.viewingCount === 0
          ? `Your ${label} is ready for its opening scene.`
          : `${statistics.viewingCount} ${statistics.viewingCount === 1 ? 'viewing' : 'viewings'} shaped your ${label}.`,
      topTitle: statistics.topTitles[0] ?? null,
      favoriteGenre: statistics.topGenres[0] ?? null,
      totalHours: statistics.totalHours,
    };
  }

  private slides(
    type: GeneratedWrapType,
    statistics: StatisticsSummary,
    highlights: WrapHighlights,
    taste: TasteStatistics,
  ): WrapStorySlide[] {
    const periodLabel = type === 'WEEKLY' ? 'Weekly' : type === 'MONTHLY' ? 'Monthly' : 'Yearly';
    const periodFormatter = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeZone: statistics.timezone,
    });
    const slides: WrapStorySlide[] = [
      {
        id: 'intro',
        kind: 'INTRO',
        eyebrow: `${periodLabel.toUpperCase()} WRAP`,
        title: highlights.headline,
        body: `${periodFormatter.format(new Date(statistics.periodStart))} – ${periodFormatter.format(new Date(new Date(statistics.periodEnd).getTime() - 1))}`,
        statValue: null,
        statLabel: null,
        accent: 'VIOLET',
        media: null,
      },
      {
        id: 'totals',
        kind: 'TOTALS',
        eyebrow: 'SCREEN TIME',
        title: `${statistics.totalHours} hours watched`,
        body: `${statistics.uniqueTitles} unique titles across ${statistics.activeDays} active days.`,
        statValue: String(statistics.viewingCount),
        statLabel: 'viewings',
        accent: 'CORAL',
        media: null,
      },
    ];
    if (highlights.favoriteGenre !== null) {
      slides.push({
        id: 'genre',
        kind: 'FAVORITE_GENRE',
        eyebrow: 'TOP GENRE',
        title: highlights.favoriteGenre.label,
        body: `Appeared across ${highlights.favoriteGenre.count} of your logged viewings.`,
        statValue: String(highlights.favoriteGenre.count),
        statLabel: 'genre appearances',
        accent: 'GOLD',
        media: null,
      });
    }
    if (highlights.topTitle !== null) {
      slides.push({
        id: 'title',
        kind: 'TOP_TITLE',
        eyebrow: 'MOST WATCHED',
        title: highlights.topTitle.title,
        body: `${highlights.topTitle.viewingCount} logged viewings and ${highlights.topTitle.minutesWatched} minutes.`,
        statValue: String(highlights.topTitle.viewingCount),
        statLabel: 'viewings',
        accent: 'TEAL',
        media: {
          id: highlights.topTitle.mediaId,
          title: highlights.topTitle.title,
          posterUrl: highlights.topTitle.posterUrl,
        },
      });
    }
    if (statistics.averageRatingPercent !== null) {
      slides.push({
        id: 'ratings',
        kind: 'RATINGS',
        eyebrow: 'YOUR RATINGS',
        title: `${Math.round(statistics.averageRatingPercent)}% average`,
        body: `Based on ${statistics.ratedTitleCount} rated ${statistics.ratedTitleCount === 1 ? 'title' : 'titles'} in this wrap.`,
        statValue: `${Math.round(statistics.averageRatingPercent)}%`,
        statLabel: 'average rating',
        accent: 'VIOLET',
        media: null,
      });
    }
    slides.push({
      id: 'outro',
      kind: 'OUTRO',
      eyebrow: 'THAT’S A WRAP',
      title:
        taste.sampleSize === 0 ? 'Your next story starts now.' : 'Keep building your movie story.',
      body: 'Every number comes from activity you logged in CineWrapped.',
      statValue: String(statistics.longestStreakDays),
      statLabel: 'longest streak in days',
      accent: 'CORAL',
      media: null,
    });
    return slides;
  }

  private wrapSummary(row: Prisma.WrapGetPayload<Record<string, never>>): WrapSummary {
    const highlights = row.highlightsJson as unknown as WrapHighlights | null;
    return {
      id: row.id,
      wrapType: row.wrapType,
      periodStart: row.periodStart.toISOString(),
      periodEnd: row.periodEnd.toISOString(),
      timezone: row.timezone,
      status: row.status,
      inputVersion: row.inputVersion,
      headline: highlights?.headline ?? null,
      generatedAt: row.generatedAt?.toISOString() ?? null,
    };
  }

  private wrapDetail(row: Prisma.WrapGetPayload<Record<string, never>>): WrapDetail {
    return {
      ...this.wrapSummary(row),
      statistics: row.statisticsJson as unknown as StatisticsSummary | null,
      highlights: row.highlightsJson as unknown as WrapHighlights | null,
      storySlides: row.storySlidesJson as unknown as WrapStorySlide[] | null,
      failureCode: row.failureCode,
    };
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

  private wrapNotFound(): never {
    throw new AppException(404, 'WRAP_NOT_FOUND', 'The wrap was not found.');
  }
}
