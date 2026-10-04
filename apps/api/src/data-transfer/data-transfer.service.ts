import { createHash } from 'node:crypto';
import { Prisma } from '@cinewrapped/database';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { AuthPrincipal } from '../auth/auth.types.js';
import { AppException } from '../common/app.exception.js';
import { PrismaService } from '../database/prisma.service.js';
import { MediaCatalogService } from '../media-provider/media-catalog.service.js';

export const importEntrySchema = z.object({
  title: z.string().trim().min(1).max(500),
  releaseYear: z.number().int().min(1870).max(2200).nullish(),
  rating: z.number().min(0).max(5).nullish(),
  watchedDate: z.iso.date().nullish(),
  loggedDate: z.iso.date().nullish(),
  isRewatch: z.boolean(),
  review: z.string().max(20_000).nullish(),
  tags: z.array(z.string().max(100)).max(50).optional(),
  letterboxdUri: z.string().max(2048).nullish(),
});
export const importSchema = z.object({ entries: z.array(importEntrySchema).min(1).max(1000) });
type ImportEntry = z.output<typeof importEntrySchema>;
interface ImportState {
  entries: ImportEntry[];
  nextIndex: number;
  results: Array<{
    title: string;
    status: 'imported' | 'unmatched' | 'ambiguous';
    mediaId?: string;
  }>;
}

export function importOperationId(jobId: string, index: number): string {
  const hash = createHash('sha256').update(`cinewrapped:import:${jobId}:${index}`).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

// A date-only diary entry uses noon in the owner's zone, preserving its calendar day.
export function importWatchedAt(date: string, timezone: string): Date {
  const target = new Date(`${date}T12:00:00Z`);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  let instant = target;
  for (let pass = 0; pass < 2; pass++) {
    const parts = Object.fromEntries(
      formatter.formatToParts(instant).map((part) => [part.type, part.value]),
    );
    const local = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    instant = new Date(instant.getTime() + target.getTime() - local);
  }
  return instant;
}

@Injectable()
export class DataTransferService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: MediaCatalogService,
  ) {}

  private async owner(principal: AuthPrincipal): Promise<string> {
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
    return user.id;
  }

  public async startImport(principal: AuthPrincipal, input: z.output<typeof importSchema>) {
    const userId = await this.owner(principal);
    if (Buffer.byteLength(JSON.stringify(input)) > 500_000)
      throw new AppException(422, 'IMPORT_TOO_LARGE', 'Import at most 500 KB at a time.');
    const job = await this.prisma.$transaction(
      async (tx) => {
        const pending = await tx.outboxEvent.findFirst({
          where: {
            aggregateType: 'data-import',
            aggregateId: userId,
            status: { in: ['PENDING', 'PROCESSING', 'FAILED'] },
          },
        });
        if (pending)
          throw new AppException(
            409,
            'IMPORT_ALREADY_ACTIVE',
            'Finish or cancel your current import first.',
          );
        return tx.outboxEvent.create({
          data: {
            aggregateType: 'data-import',
            aggregateId: userId,
            eventType: 'data.import',
            payloadJson: { entries: input.entries, nextIndex: 0, results: [] },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return this.summary(job);
  }

  private summary(job: {
    id: string;
    status: string;
    payloadJson: Prisma.JsonValue;
    lastErrorCode: string | null;
    attemptCount: number;
  }) {
    const state = job.payloadJson as unknown as ImportState;
    return {
      id: job.id,
      status: job.status,
      completed: state.nextIndex,
      total: state.entries.length,
      results: state.results,
      errorCode: job.lastErrorCode,
      attempts: job.attemptCount,
    };
  }

  public async imports(principal: AuthPrincipal) {
    const userId = await this.owner(principal);
    const jobs = await this.prisma.outboxEvent.findMany({
      where: { aggregateType: 'data-import', aggregateId: userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    return jobs.map((job) => this.summary(job));
  }

  public async cancelImport(principal: AuthPrincipal, id: string) {
    const userId = await this.owner(principal);
    // An active invocation finishes its current batch before cancellation can succeed.
    const result = await this.prisma.outboxEvent.updateMany({
      where: {
        id,
        aggregateType: 'data-import',
        aggregateId: userId,
        status: { in: ['PENDING', 'FAILED'] },
      },
      data: { status: 'PUBLISHED', lastErrorCode: 'IMPORT_CANCELLED', publishedAt: new Date() },
    });
    if (!result.count)
      throw new AppException(
        409,
        'IMPORT_NOT_CANCELLABLE',
        'Wait for the current batch to finish and try again.',
      );
    return { cancelled: true };
  }

  // Each checkpoint commits with its library writes; a crash cannot advance progress without data.
  public async processImport(event: {
    id: string;
    aggregateId: string;
    payloadJson: Prisma.JsonValue;
  }): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: { id: event.aggregateId, deletedAt: null },
      select: { id: true, timezone: true },
    });
    if (!user) {
      await this.prisma.outboxEvent.update({
        where: { id: event.id },
        data: { payloadJson: {}, lastErrorCode: 'OWNER_UNAVAILABLE' },
      });
      return false;
    }
    const state = event.payloadJson as unknown as ImportState;
    if (!Array.isArray(state.entries) || !Number.isInteger(state.nextIndex) || state.nextIndex < 0)
      throw new Error('IMPORT_STATE_INVALID');
    const sourceId = createHash('sha256').update(JSON.stringify(state.entries)).digest('hex');
    for (let count = 0; count < 5 && state.nextIndex < state.entries.length; count++) {
      const entry = importEntrySchema.parse(state.entries[state.nextIndex]);
      const matches = await this.catalog.search(
        entry.title,
        'en-US',
        {
          mediaType: 'MOVIE',
          exactTitle: entry.title,
          ...(entry.releaseYear == null ? {} : { releaseYear: entry.releaseYear }),
          limit: 50,
        },
        1,
      );
      const exact = matches.filter(
        (item) =>
          item.title.normalize('NFKC').toLowerCase() ===
          entry.title.normalize('NFKC').toLowerCase(),
      );
      const media = exact.length === 1 ? exact[0] : undefined;
      const outcome = {
        title: entry.title,
        status: media
          ? ('imported' as const)
          : exact.length > 1
            ? ('ambiguous' as const)
            : ('unmatched' as const),
        ...(media ? { mediaId: media.id } : {}),
      };
      const nextState = {
        ...state,
        nextIndex: state.nextIndex + 1,
        results: [...state.results, outcome],
      };
      await this.prisma.$transaction(async (tx) => {
        // Erasure may begin while metadata is being resolved.
        const owner = await tx.user.findFirst({
          where: { id: user.id, deletedAt: null },
          select: { id: true },
        });
        if (!owner) throw new Error('IMPORT_OWNER_UNAVAILABLE');
        if (media) {
          const watchedAt = entry.watchedDate
            ? importWatchedAt(entry.watchedDate, user.timezone ?? 'UTC')
            : null;
          const history = await tx.watchHistory.upsert({
            where: { userId_mediaId: { userId: user.id, mediaId: media.id } },
            create: {
              userId: user.id,
              mediaId: media.id,
              status: 'COMPLETED',
              progressPercent: 100,
              watchCount: 0,
              completedAt: watchedAt,
              lastWatchedAt: watchedAt,
            },
            update: {},
          });
          if (watchedAt) {
            const viewing = await tx.viewing.findUnique({
              where: {
                userId_clientOperationId: {
                  userId: user.id,
                  clientOperationId: importOperationId(`${user.id}:${sourceId}`, state.nextIndex),
                },
              },
            });
            if (!viewing) {
              await tx.viewing.create({
                data: {
                  userId: user.id,
                  mediaId: media.id,
                  watchHistoryId: history.id,
                  clientOperationId: importOperationId(`${user.id}:${sourceId}`, state.nextIndex),
                  watchedAt,
                  completedAt: watchedAt,
                  source: 'IMPORT',
                  isRewatch: entry.isRewatch,
                },
              });
              await tx.watchHistory.update({
                where: { id: history.id },
                data: {
                  watchCount: { increment: 1 },
                  version: { increment: 1 },
                  ...(history.lastWatchedAt == null || history.lastWatchedAt < watchedAt
                    ? { lastWatchedAt: watchedAt }
                    : {}),
                },
              });
            }
          }
          if (entry.rating != null)
            await tx.rating.upsert({
              where: { userId_mediaId: { userId: user.id, mediaId: media.id } },
              create: {
                userId: user.id,
                mediaId: media.id,
                ratingValue: entry.rating,
                ratingScale: 5,
                normalizedScore: entry.rating * 20,
              },
              update: {},
            });
          if (entry.review?.trim())
            await tx.review.upsert({
              where: { id: importOperationId(`${user.id}:${sourceId}:review`, state.nextIndex) },
              update: {},
              create: {
                id: importOperationId(`${user.id}:${sourceId}:review`, state.nextIndex),
                userId: user.id,
                mediaId: media.id,
                body: entry.review,
                visibility: 'PRIVATE',
                status: 'PUBLISHED',
                publishedAt: new Date(),
              },
            });
        }
        await tx.outboxEvent.update({
          where: { id: event.id },
          data: { payloadJson: nextState },
        });
      });
      Object.assign(state, nextState);
    }
    if (state.nextIndex >= state.entries.length) return false;
    await this.prisma.outboxEvent.update({
      where: { id: event.id },
      data: { status: 'PENDING', lockedAt: null, attemptCount: 0, availableAt: new Date() },
    });
    return true;
  }
}
