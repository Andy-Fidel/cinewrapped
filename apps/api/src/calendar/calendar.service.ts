import { Prisma } from '@cinewrapped/database';
import type { CalendarEventSummary, MediaSummary } from '@cinewrapped/shared-types';
import { createCalendarEventSchema, updateCalendarEventSchema } from '@cinewrapped/validation';
import { Injectable } from '@nestjs/common';
import type { z } from 'zod';

import type { AuthPrincipal } from '../auth/auth.types.js';
import { AppException } from '../common/app.exception.js';
import { PrismaService } from '../database/prisma.service.js';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service.js';

export type CreateCalendarEventInput = z.output<typeof createCalendarEventSchema>;
export type UpdateCalendarEventInput = z.output<typeof updateCalendarEventSchema>;

const include = {
  media: { include: { genres: { select: { genreId: true } } } },
} satisfies Prisma.CalendarEventInclude;
type CalendarRecord = Prisma.CalendarEventGetPayload<{ include: typeof include }>;

function toMedia(media: CalendarRecord['media']): MediaSummary | null {
  if (media === null) return null;
  return {
    id: media.id,
    provider: media.externalProvider,
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

function toSummary(event: CalendarRecord): CalendarEventSummary {
  return {
    id: event.id,
    media: toMedia(event.media),
    eventType: event.eventType,
    status: event.status,
    title: event.title,
    notes: event.notes,
    startsAt: event.startsAt.toISOString(),
    timezone: event.timezone,
    durationMinutes: event.durationMinutes,
    reminderMinutes: event.reminderMinutes,
    version: event.version,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };
}

@Injectable()
export class CalendarService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly featureFlags: FeatureFlagsService,
  ) {}

  public async list(principal: AuthPrincipal, from: Date, to: Date) {
    await this.featureFlags.assertEnabled(principal, 'CALENDAR_INTEGRATION');
    const userId = await this.userId(principal.subject);
    const events = await this.prisma.calendarEvent.findMany({
      where: { userId, deletedAt: null, startsAt: { gte: from, lt: to } },
      include,
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
    });
    return events.map(toSummary);
  }

  public async create(principal: AuthPrincipal, input: CreateCalendarEventInput) {
    await this.featureFlags.assertEnabled(principal, 'CALENDAR_INTEGRATION');
    const userId = await this.userId(principal.subject);
    if (input.mediaId != null) await this.requireMedia(input.mediaId);
    return toSummary(
      await this.prisma.calendarEvent.create({
        data: {
          userId,
          mediaId: input.mediaId ?? null,
          eventType: input.eventType,
          title: input.title,
          notes: input.notes ?? null,
          startsAt: new Date(input.startsAt),
          timezone: input.timezone,
          durationMinutes: input.durationMinutes,
          reminderMinutes: input.reminderMinutes,
        },
        include,
      }),
    );
  }

  public async update(principal: AuthPrincipal, id: string, input: UpdateCalendarEventInput) {
    await this.featureFlags.assertEnabled(principal, 'CALENDAR_INTEGRATION');
    const userId = await this.userId(principal.subject);
    const current = await this.requireEvent(userId, id);
    if (current.version !== input.expectedVersion) {
      throw new AppException(
        409,
        'CALENDAR_EVENT_VERSION_CONFLICT',
        'This event changed. Reload and try again.',
      );
    }
    if (input.mediaId != null) await this.requireMedia(input.mediaId);
    const data: Prisma.CalendarEventUncheckedUpdateInput = {
      ...(input.mediaId === undefined ? {} : { mediaId: input.mediaId }),
      ...(input.eventType === undefined ? {} : { eventType: input.eventType }),
      ...(input.status === undefined ? {} : { status: input.status }),
      ...(input.title === undefined ? {} : { title: input.title }),
      ...(input.notes === undefined ? {} : { notes: input.notes }),
      ...(input.startsAt === undefined ? {} : { startsAt: new Date(input.startsAt) }),
      ...(input.timezone === undefined ? {} : { timezone: input.timezone }),
      ...(input.durationMinutes === undefined ? {} : { durationMinutes: input.durationMinutes }),
      ...(input.reminderMinutes === undefined ? {} : { reminderMinutes: input.reminderMinutes }),
      version: { increment: 1 },
    };
    return toSummary(
      await this.prisma.calendarEvent.update({
        where: { id },
        data,
        include,
      }),
    );
  }

  public async remove(principal: AuthPrincipal, id: string) {
    await this.featureFlags.assertEnabled(principal, 'CALENDAR_INTEGRATION');
    const userId = await this.userId(principal.subject);
    await this.requireEvent(userId, id);
    await this.prisma.calendarEvent.update({ where: { id }, data: { deletedAt: new Date() } });
    return { id };
  }

  public async ics(principal: AuthPrincipal, id: string): Promise<string> {
    await this.featureFlags.assertEnabled(principal, 'CALENDAR_INTEGRATION');
    const event = await this.requireEvent(await this.userId(principal.subject), id);
    const format = (date: Date) =>
      date
        .toISOString()
        .replace(/[-:]/gu, '')
        .replace(/\.\d{3}Z$/u, 'Z');
    const escape = (value: string) => value.replace(/([\\,;])/gu, '\\$1').replace(/\n/gu, '\\n');
    const end = new Date(event.startsAt.getTime() + event.durationMinutes * 60_000);
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//CineWrapped//Calendar//EN',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${event.id}@cinewrapped`,
      `DTSTAMP:${format(event.updatedAt)}`,
      `DTSTART:${format(event.startsAt)}`,
      `DTEND:${format(end)}`,
      `SUMMARY:${escape(event.title)}`,
      ...(event.notes === null ? [] : [`DESCRIPTION:${escape(event.notes)}`]),
      'END:VEVENT',
      'END:VCALENDAR',
      '',
    ].join('\r\n');
  }

  private async userId(subject: string): Promise<string> {
    const user = await this.prisma.user.findFirst({
      where: { authSubject: subject, deletedAt: null },
      select: { id: true },
    });
    if (user === null)
      throw new AppException(
        404,
        'USER_NOT_BOOTSTRAPPED',
        'The application profile is unavailable.',
      );
    return user.id;
  }
  private async requireMedia(id: string) {
    if ((await this.prisma.media.count({ where: { id } })) === 0)
      throw new AppException(404, 'MEDIA_NOT_FOUND', 'The title was not found.');
  }
  private async requireEvent(userId: string, id: string) {
    const event = await this.prisma.calendarEvent.findFirst({
      where: { id, userId, deletedAt: null },
      include,
    });
    if (event === null)
      throw new AppException(404, 'CALENDAR_EVENT_NOT_FOUND', 'The calendar event was not found.');
    return event;
  }
}
