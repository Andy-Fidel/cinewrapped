import { countryCodeSchema, languageTagSchema, uuidSchema } from '@cinewrapped/validation';
import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';

import { CurrentPrincipal } from '../auth/current-principal.decorator.js';
import type { AuthPrincipal } from '../auth/auth.types.js';
import { CacheService } from '../cache/cache.service.js';
import { AppException } from '../common/app.exception.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { MediaCatalogService } from './media-catalog.service.js';

const mediaTypeSchema = z.enum(['MOVIE', 'TV']);
const listValue = z.preprocess(
  (value) => (typeof value === 'string' ? value.split(',').filter(Boolean) : value),
  z.array(uuidSchema).max(20),
);
const searchQuerySchema = z.object({
  q: z.string().trim().min(2).max(120),
  language: languageTagSchema.default('en-US'),
  mediaType: mediaTypeSchema.optional(),
  genreIds: listValue.optional(),
  releaseYear: z.coerce.number().int().min(1870).max(2200).optional(),
  limit: z.coerce.number().int().min(20).max(20).default(20),
  cursor: z.string().max(200).optional(),
});
const trendingQuerySchema = z.object({
  window: z.enum(['DAY', 'WEEK']).default('WEEK'),
  mediaType: mediaTypeSchema.optional(),
  language: languageTagSchema.default('en-US'),
  limit: z.coerce.number().int().min(20).max(20).default(20),
  cursor: z.string().max(200).optional(),
});
const detailQuerySchema = z.object({
  language: languageTagSchema.default('en-US'),
  countryCode: countryCodeSchema.default('US'),
});
const creditsQuerySchema = detailQuerySchema.extend({
  type: z.enum(['CAST', 'CREW']).optional(),
});
const availabilityQuerySchema = z.object({ countryCode: countryCodeSchema });

type SearchQuery = z.output<typeof searchQuerySchema>;
type TrendingQuery = z.output<typeof trendingQuerySchema>;
type DetailQuery = z.output<typeof detailQuerySchema>;
type CreditsQuery = z.output<typeof creditsQuerySchema>;
type AvailabilityQuery = z.output<typeof availabilityQuerySchema>;

function pageFromCursor(cursor: string | undefined): number {
  if (cursor === undefined) return 1;
  try {
    return z
      .object({ page: z.number().int().min(2).max(500) })
      .parse(JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'))).page;
  } catch {
    throw new AppException(400, 'CURSOR_INVALID', 'The discovery cursor is invalid.');
  }
}

function cursorForPage(page: number): string {
  return Buffer.from(JSON.stringify({ page }), 'utf8').toString('base64url');
}

@ApiTags('Media')
@ApiBearerAuth()
@Controller()
export class MediaCatalogController {
  public constructor(
    private readonly catalog: MediaCatalogService,
    private readonly cache: CacheService,
  ) {}

  @Get('genres')
  @ApiOkResponse({ description: 'Lists selectable movie and television genres.' })
  public async genres(@Req() request: FastifyRequest): Promise<unknown> {
    return this.collection(await this.catalog.genres(), request.id);
  }

  @Get('streaming-providers')
  @ApiOkResponse({ description: 'Lists known streaming providers.' })
  public async streamingProviders(@Req() request: FastifyRequest): Promise<unknown> {
    return this.collection(await this.catalog.streamingProviders(), request.id);
  }

  @Get('search/media')
  @ApiOkResponse({
    description: 'Searches TMDB through the backend and persists normalized results.',
  })
  public async search(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Query(new ZodValidationPipe(searchQuerySchema)) query: SearchQuery,
    @Req() request: FastifyRequest,
  ): Promise<unknown> {
    if (!(await this.cache.consume(`search:${principal.subject}`, 30, 60))) {
      throw new AppException(
        429,
        'RATE_LIMITED',
        'Too many media searches. Please wait before trying again.',
      );
    }
    const page = pageFromCursor(query.cursor);
    const data = await this.catalog.search(
      query.q,
      query.language,
      {
        ...(query.mediaType === undefined ? {} : { mediaType: query.mediaType }),
        ...(query.releaseYear === undefined ? {} : { releaseYear: query.releaseYear }),
        ...(query.genreIds === undefined ? {} : { genreIds: query.genreIds }),
        limit: query.limit,
      },
      page,
    );
    return this.collection(
      data,
      request.id,
      data.length === query.limit ? cursorForPage(page + 1) : null,
    );
  }

  @Get('media/trending')
  @ApiOkResponse({ description: 'Returns cached daily or weekly trending movies and shows.' })
  public async trending(
    @Query(new ZodValidationPipe(trendingQuerySchema)) query: TrendingQuery,
    @Req() request: FastifyRequest,
  ): Promise<unknown> {
    const page = pageFromCursor(query.cursor);
    const data = await this.catalog.trending(
      query.window,
      query.mediaType,
      query.language,
      query.limit,
      page,
    );
    return this.collection(
      data,
      request.id,
      data.length === query.limit ? cursorForPage(page + 1) : null,
    );
  }

  @Get('media/:mediaId')
  @ApiOkResponse({
    description: 'Returns normalized media details, credits, trailer, and availability.',
  })
  public async details(
    @Param('mediaId', new ZodValidationPipe(uuidSchema)) mediaId: string,
    @Query(new ZodValidationPipe(detailQuerySchema)) query: DetailQuery,
    @Req() request: FastifyRequest,
  ): Promise<unknown> {
    return this.ok(
      await this.catalog.details(mediaId, query.language, query.countryCode),
      request.id,
    );
  }

  @Get('media/:mediaId/credits')
  @ApiOkResponse({ description: 'Returns normalized cast and crew credits.' })
  public async credits(
    @Param('mediaId', new ZodValidationPipe(uuidSchema)) mediaId: string,
    @Query(new ZodValidationPipe(creditsQuerySchema)) query: CreditsQuery,
    @Req() request: FastifyRequest,
  ): Promise<unknown> {
    return this.collection(
      await this.catalog.credits(mediaId, query.type, query.language, query.countryCode),
      request.id,
    );
  }

  @Get('media/:mediaId/streaming-availability')
  @ApiOkResponse({ description: 'Returns current streaming availability for one country.' })
  public async availability(
    @Param('mediaId', new ZodValidationPipe(uuidSchema)) mediaId: string,
    @Query(new ZodValidationPipe(availabilityQuerySchema)) query: AvailabilityQuery,
    @Req() request: FastifyRequest,
  ): Promise<unknown> {
    return this.ok(
      await this.catalog.streamingAvailability(mediaId, query.countryCode),
      request.id,
    );
  }

  private ok<T>(data: T, requestId: string) {
    return { success: true as const, data, meta: { requestId } };
  }

  private collection<T>(data: T[], requestId: string, nextCursor: string | null = null) {
    return {
      success: true as const,
      data,
      meta: {
        requestId,
        page: { nextCursor, hasMore: nextCursor !== null, limit: data.length },
      },
    };
  }
}
