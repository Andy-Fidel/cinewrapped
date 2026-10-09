import { createHash } from 'node:crypto';
import type { Prisma } from '@cinewrapped/database';
import { z } from 'zod';
import { watchStatusSchema } from '@cinewrapped/validation';
import { AppException } from '../common/app.exception.js';

export const libraryQuerySchema = z.object({
  status: watchStatusSchema.optional(),
  mediaType: z.enum(['MOVIE', 'TV']).optional(),
  q: z.string().trim().max(100).optional(),
  sort: z.enum(['RECENT', 'OLDEST', 'TITLE_ASC', 'TITLE_DESC']).default('RECENT'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().max(4096).optional(),
});
export type LibraryQuery = Omit<z.output<typeof libraryQuerySchema>, 'sort'> & {
  sort?: z.output<typeof libraryQuerySchema>['sort'];
};
const cursorSchema = z.object({
  scope: z.string(),
  value: z.string().max(1000),
  id: z.string().uuid(),
});

export function libraryPageQuery(userId: string, query: LibraryQuery) {
  const sort = query.sort ?? 'RECENT';
  const byTitle = sort.startsWith('TITLE_');
  const direction = sort === 'OLDEST' || sort === 'TITLE_ASC' ? 'asc' : 'desc';
  const comparison = direction === 'asc' ? 'gt' : 'lt';
  const scope = createHash('sha256')
    .update(
      JSON.stringify([
        userId,
        query.status ?? null,
        query.mediaType ?? null,
        query.q?.trim() ?? '',
        sort,
      ]),
    )
    .digest('hex');
  const where: Prisma.WatchHistoryWhereInput = {
    userId,
    ...(query.status ? { status: query.status } : {}),
    media: {
      ...(query.mediaType ? { mediaType: query.mediaType } : {}),
      ...(query.q?.trim()
        ? {
            title: {
              contains: query.q.trim().replace(/[\\%_]/gu, '\\$&'),
              mode: 'insensitive' as const,
            },
          }
        : {}),
    },
  };
  if (query.cursor) {
    try {
      const raw: unknown = JSON.parse(Buffer.from(query.cursor, 'base64url').toString('utf8'));
      const cursor = cursorSchema.parse(raw);
      if (cursor.scope !== scope) throw new Error('Different filters');
      if (byTitle) {
        where.AND = [
          {
            OR: [
              { media: { title: { [comparison]: cursor.value } } },
              { media: { title: cursor.value }, id: { [comparison]: cursor.id } },
            ],
          },
        ];
      } else {
        const date = new Date(cursor.value);
        if (Number.isNaN(date.getTime())) throw new Error('Invalid date');
        where.AND = [
          {
            OR: [
              { updatedAt: { [comparison]: date } },
              { updatedAt: date, id: { [comparison]: cursor.id } },
            ],
          },
        ];
      }
    } catch {
      throw new AppException(400, 'CURSOR_INVALID', 'Refresh the library to restart this search.');
    }
  }
  const orderBy: Prisma.WatchHistoryOrderByWithRelationInput[] = [
    byTitle ? { media: { title: direction } } : { updatedAt: direction },
    { id: direction },
  ];
  return {
    where,
    orderBy,
    nextCursor: (item: { id: string; updatedAt: Date; media: { title: string } }) =>
      Buffer.from(
        JSON.stringify({
          scope,
          value: byTitle ? item.media.title : item.updatedAt.toISOString(),
          id: item.id,
        }),
      ).toString('base64url'),
  };
}
