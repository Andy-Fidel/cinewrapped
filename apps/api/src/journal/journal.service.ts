import { Prisma } from '@cinewrapped/database';
import type { ApiEnvironment } from '@cinewrapped/config';
import type { JournalEntrySummary, MediaSummary } from '@cinewrapped/shared-types';
import {
  createJournalEntrySchema,
  registerJournalAttachmentSchema,
  updateJournalEntrySchema,
} from '@cinewrapped/validation';
import { Inject, Injectable } from '@nestjs/common';
import type { z } from 'zod';

import type { AuthPrincipal } from '../auth/auth.types.js';
import { AppException } from '../common/app.exception.js';
import { assertTrustedStorageUrl, validateRemoteFile } from '../common/file-upload-security.js';
import { API_ENVIRONMENT } from '../config/environment.module.js';
import { PrismaService } from '../database/prisma.service.js';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service.js';

export type CreateJournalEntryInput = z.output<typeof createJournalEntrySchema>;
export type UpdateJournalEntryInput = z.output<typeof updateJournalEntrySchema>;
export type RegisterJournalAttachmentInput = z.output<typeof registerJournalAttachmentSchema>;

export interface JournalQuery {
  limit: number;
  cursor?: string;
  status?: 'DRAFT' | 'COMPLETED';
  mediaId?: string;
  query?: string;
}

const journalInclude = {
  media: { include: { genres: { select: { genreId: true } } } },
  attachments: { orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.JournalEntryInclude;

type JournalRecord = Prisma.JournalEntryGetPayload<{ include: typeof journalInclude }>;

function decodeCursor(cursor: string | undefined): { updatedAt: Date; id: string } | null {
  if (cursor === undefined) return null;
  try {
    const value = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
      updatedAt?: unknown;
      id?: unknown;
    };
    if (typeof value.updatedAt !== 'string' || typeof value.id !== 'string') throw new Error();
    const updatedAt = new Date(value.updatedAt);
    if (Number.isNaN(updatedAt.getTime())) throw new Error();
    return { updatedAt, id: value.id };
  } catch {
    throw new AppException(400, 'CURSOR_INVALID', 'The journal cursor is invalid.');
  }
}

function encodeCursor(value: { updatedAt: Date; id: string } | undefined): string | null {
  return value === undefined
    ? null
    : Buffer.from(
        JSON.stringify({ updatedAt: value.updatedAt.toISOString(), id: value.id }),
        'utf8',
      ).toString('base64url');
}

function mediaSummary(media: JournalRecord['media']): MediaSummary {
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
    genreIds: media.genres.map((genre) => genre.genreId),
    averageProviderRating:
      media.averageProviderRating === null ? null : Number(media.averageProviderRating),
  };
}

function toSummary(entry: JournalRecord): JournalEntrySummary {
  return {
    id: entry.id,
    media: mediaSummary(entry.media),
    viewingId: entry.viewingId,
    status: entry.status,
    title: entry.title,
    notes: entry.notes,
    viewingLocation: entry.viewingLocation,
    companionNames: entry.companionNames,
    memorableQuotes: entry.memorableQuotes,
    moodBefore: entry.moodBefore,
    moodAfter: entry.moodAfter,
    watchedAt: entry.watchedAt?.toISOString() ?? null,
    attachments: entry.attachments.map((attachment) => ({
      id: attachment.id,
      attachmentType: attachment.attachmentType,
      storageBucket: 'journal-attachments',
      storagePath: attachment.storagePath,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      byteSize: attachment.byteSize,
      createdAt: attachment.createdAt.toISOString(),
    })),
    version: entry.version,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

function hasJournalContent(value: {
  title: string | null;
  notes: string | null;
  viewingLocation: string | null;
  companionNames: string[];
  memorableQuotes: string[];
  moodBefore: string | null;
  moodAfter: string | null;
}): boolean {
  return (
    value.title !== null ||
    value.notes !== null ||
    value.viewingLocation !== null ||
    value.companionNames.length > 0 ||
    value.memorableQuotes.length > 0 ||
    value.moodBefore !== null ||
    value.moodAfter !== null
  );
}

@Injectable()
export class JournalService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly featureFlags: FeatureFlagsService,
    @Inject(API_ENVIRONMENT) private readonly environment: ApiEnvironment,
  ) {}

  public async list(principal: AuthPrincipal, query: JournalQuery) {
    await this.featureFlags.assertEnabled(principal, 'MOVIE_JOURNAL');
    const user = await this.requireUser(principal.subject);
    const cursor = decodeCursor(query.cursor);
    const records = await this.prisma.journalEntry.findMany({
      where: {
        userId: user.id,
        deletedAt: null,
        ...(query.status === undefined ? {} : { status: query.status }),
        ...(query.mediaId === undefined ? {} : { mediaId: query.mediaId }),
        ...(query.query === undefined
          ? {}
          : {
              OR: [
                { title: { contains: query.query, mode: 'insensitive' } },
                { notes: { contains: query.query, mode: 'insensitive' } },
                { media: { title: { contains: query.query, mode: 'insensitive' } } },
              ],
            }),
        ...(cursor === null
          ? {}
          : {
              OR: [
                { updatedAt: { lt: cursor.updatedAt } },
                { updatedAt: cursor.updatedAt, id: { lt: cursor.id } },
              ],
            }),
      },
      include: journalInclude,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const hasMore = records.length > query.limit;
    const page = records.slice(0, query.limit);
    return { items: page.map(toSummary), nextCursor: hasMore ? encodeCursor(page.at(-1)) : null };
  }

  public async get(principal: AuthPrincipal, entryId: string): Promise<JournalEntrySummary> {
    await this.featureFlags.assertEnabled(principal, 'MOVIE_JOURNAL');
    return toSummary(await this.requireEntry(principal.subject, entryId));
  }

  public async create(
    principal: AuthPrincipal,
    input: CreateJournalEntryInput,
  ): Promise<JournalEntrySummary> {
    await this.featureFlags.assertEnabled(principal, 'MOVIE_JOURNAL');
    const user = await this.requireUser(principal.subject);
    await this.requireMedia(input.mediaId);
    await this.validateViewing(user.id, input.mediaId, input.viewingId ?? null);
    if (input.status === 'COMPLETED' && !hasJournalContent(this.contentFromInput(input))) {
      throw new AppException(
        422,
        'JOURNAL_CONTENT_REQUIRED',
        'Add journal content before completing this entry.',
      );
    }
    const entry = await this.prisma.journalEntry.create({
      data: {
        userId: user.id,
        mediaId: input.mediaId,
        viewingId: input.viewingId ?? null,
        status: input.status,
        title: input.title ?? null,
        notes: input.notes ?? null,
        viewingLocation: input.viewingLocation ?? null,
        companionNames: input.companionNames,
        memorableQuotes: input.memorableQuotes,
        moodBefore: input.moodBefore ?? null,
        moodAfter: input.moodAfter ?? null,
        watchedAt:
          input.watchedAt === undefined || input.watchedAt === null
            ? null
            : new Date(input.watchedAt),
      },
      include: journalInclude,
    });
    return toSummary(entry);
  }

  public async update(
    principal: AuthPrincipal,
    entryId: string,
    input: UpdateJournalEntryInput,
  ): Promise<JournalEntrySummary> {
    await this.featureFlags.assertEnabled(principal, 'MOVIE_JOURNAL');
    const existing = await this.requireEntry(principal.subject, entryId);
    await this.validateViewing(
      existing.userId,
      existing.mediaId,
      input.viewingId ?? existing.viewingId,
    );
    const content = {
      title: input.title === undefined ? existing.title : input.title,
      notes: input.notes === undefined ? existing.notes : input.notes,
      viewingLocation:
        input.viewingLocation === undefined ? existing.viewingLocation : input.viewingLocation,
      companionNames: input.companionNames ?? existing.companionNames,
      memorableQuotes: input.memorableQuotes ?? existing.memorableQuotes,
      moodBefore: input.moodBefore === undefined ? existing.moodBefore : input.moodBefore,
      moodAfter: input.moodAfter === undefined ? existing.moodAfter : input.moodAfter,
    };
    if (
      (input.status ?? existing.status) === 'COMPLETED' &&
      !hasJournalContent(content) &&
      existing.attachments.length === 0
    ) {
      throw new AppException(
        422,
        'JOURNAL_CONTENT_REQUIRED',
        'Add journal content before completing this entry.',
      );
    }
    const result = await this.prisma.journalEntry.updateMany({
      where: {
        id: entryId,
        userId: existing.userId,
        version: input.expectedVersion,
        deletedAt: null,
      },
      data: {
        ...(input.viewingId === undefined ? {} : { viewingId: input.viewingId }),
        ...(input.status === undefined ? {} : { status: input.status }),
        ...(input.title === undefined ? {} : { title: input.title }),
        ...(input.notes === undefined ? {} : { notes: input.notes }),
        ...(input.viewingLocation === undefined ? {} : { viewingLocation: input.viewingLocation }),
        ...(input.companionNames === undefined ? {} : { companionNames: input.companionNames }),
        ...(input.memorableQuotes === undefined ? {} : { memorableQuotes: input.memorableQuotes }),
        ...(input.moodBefore === undefined ? {} : { moodBefore: input.moodBefore }),
        ...(input.moodAfter === undefined ? {} : { moodAfter: input.moodAfter }),
        ...(input.watchedAt === undefined
          ? {}
          : { watchedAt: input.watchedAt === null ? null : new Date(input.watchedAt) }),
        version: { increment: 1 },
      },
    });
    if (result.count === 0) {
      throw new AppException(
        409,
        'JOURNAL_VERSION_CONFLICT',
        'This journal entry changed on another device.',
      );
    }
    return toSummary(await this.requireEntry(principal.subject, entryId));
  }

  public async remove(principal: AuthPrincipal, entryId: string) {
    await this.featureFlags.assertEnabled(principal, 'MOVIE_JOURNAL');
    const entry = await this.requireEntry(principal.subject, entryId);
    await this.prisma.journalEntry.update({
      where: { id: entry.id },
      data: { deletedAt: new Date(), version: { increment: 1 } },
    });
    return { deleted: true, attachmentPaths: entry.attachments.map((item) => item.storagePath) };
  }

  public async addAttachment(
    principal: AuthPrincipal,
    entryId: string,
    input: RegisterJournalAttachmentInput,
  ): Promise<JournalEntrySummary> {
    await this.featureFlags.assertEnabled(principal, 'MOVIE_JOURNAL');
    const entry = await this.requireEntry(principal.subject, entryId);
    if (!input.storagePath.startsWith(`${principal.subject}/`)) {
      throw new AppException(
        403,
        'STORAGE_PATH_FORBIDDEN',
        'The attachment path is not owned by this account.',
      );
    }
    assertTrustedStorageUrl({
      supabaseUrl: this.environment.SUPABASE_URL,
      bucket: 'journal-attachments',
      subject: principal.subject,
      storagePath: input.storagePath,
      signedUrl: input.signedUrl,
    });
    await validateRemoteFile({
      signedUrl: input.signedUrl,
      mimeType: input.mimeType,
      fileName: input.fileName,
      maxSizeBytes: 10_485_760,
      expectedSizeBytes: input.byteSize,
    });
    if (entry.attachments.length >= 10) {
      throw new AppException(
        422,
        'ATTACHMENT_LIMIT_REACHED',
        'A journal entry can contain up to 10 attachments.',
      );
    }
    await this.prisma.journalAttachment.create({
      data: {
        journalEntryId: entry.id,
        attachmentType: input.attachmentType,
        storagePath: input.storagePath,
        fileName: input.fileName,
        mimeType: input.mimeType,
        byteSize: input.byteSize,
      },
    });
    return toSummary(await this.requireEntry(principal.subject, entryId));
  }

  public async removeAttachment(principal: AuthPrincipal, entryId: string, attachmentId: string) {
    await this.featureFlags.assertEnabled(principal, 'MOVIE_JOURNAL');
    const entry = await this.requireEntry(principal.subject, entryId);
    const attachment = entry.attachments.find((item) => item.id === attachmentId);
    if (attachment === undefined) {
      throw new AppException(
        404,
        'JOURNAL_ATTACHMENT_NOT_FOUND',
        'The journal attachment was not found.',
      );
    }
    await this.prisma.journalAttachment.delete({ where: { id: attachment.id } });
    return { deleted: true, storagePath: attachment.storagePath };
  }

  private contentFromInput(input: CreateJournalEntryInput) {
    return {
      title: input.title ?? null,
      notes: input.notes ?? null,
      viewingLocation: input.viewingLocation ?? null,
      companionNames: input.companionNames,
      memorableQuotes: input.memorableQuotes,
      moodBefore: input.moodBefore ?? null,
      moodAfter: input.moodAfter ?? null,
    };
  }

  private async requireUser(subject: string) {
    const user = await this.prisma.user.findUnique({
      where: { authSubject: subject, deletedAt: null },
    });
    if (user === null) throw new AppException(404, 'USER_NOT_FOUND', 'The account was not found.');
    return user;
  }

  private async requireMedia(mediaId: string): Promise<void> {
    if ((await this.prisma.media.count({ where: { id: mediaId } })) === 0) {
      throw new AppException(404, 'MEDIA_NOT_FOUND', 'The title was not found.');
    }
  }

  private async validateViewing(
    userId: string,
    mediaId: string,
    viewingId: string | null,
  ): Promise<void> {
    if (viewingId === null) return;
    const viewing = await this.prisma.viewing.findFirst({
      where: { id: viewingId, userId, mediaId, deletedAt: null },
      select: { id: true },
    });
    if (viewing === null) {
      throw new AppException(404, 'VIEWING_NOT_FOUND', 'The selected viewing was not found.');
    }
  }

  private async requireEntry(subject: string, entryId: string): Promise<JournalRecord> {
    const entry = await this.prisma.journalEntry.findFirst({
      where: { id: entryId, user: { authSubject: subject, deletedAt: null }, deletedAt: null },
      include: journalInclude,
    });
    if (entry === null) {
      throw new AppException(404, 'JOURNAL_ENTRY_NOT_FOUND', 'The journal entry was not found.');
    }
    return entry;
  }
}
