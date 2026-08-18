import {
  searchHistoryQuerySchema,
  searchSuggestionsSchema,
  unifiedSearchSchema,
  uuidSchema,
} from '@cinewrapped/validation';
import { Controller, Delete, Get, Param, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import type { z } from 'zod';

import { CurrentPrincipal } from '../auth/current-principal.decorator.js';
import type { AuthPrincipal } from '../auth/auth.types.js';
import { CacheService } from '../cache/cache.service.js';
import { AppException } from '../common/app.exception.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { SearchService } from './search.service.js';

@ApiTags('Search')
@ApiBearerAuth()
@Controller('search')
export class SearchController {
  public constructor(
    private readonly search: SearchService,
    private readonly cache: CacheService,
  ) {}

  @Get()
  public async results(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Query(new ZodValidationPipe(unifiedSearchSchema))
    query: z.output<typeof unifiedSearchSchema>,
    @Req() request: FastifyRequest,
  ) {
    if (!(await this.cache.consume(`unified-search:${principal.subject}`, 60, 60)))
      throw new AppException(429, 'RATE_LIMITED', 'Too many searches. Please wait a moment.');
    return this.ok(await this.search.search(principal, query), request.id);
  }

  @Get('suggestions')
  public async suggestions(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Query(new ZodValidationPipe(searchSuggestionsSchema))
    query: z.output<typeof searchSuggestionsSchema>,
    @Req() request: FastifyRequest,
  ) {
    return this.collection(
      await this.search.suggestions(principal, query.q, query.limit),
      request.id,
    );
  }

  @Get('history')
  public async history(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Query(new ZodValidationPipe(searchHistoryQuerySchema))
    query: z.output<typeof searchHistoryQuerySchema>,
    @Req() request: FastifyRequest,
  ) {
    return this.collection(await this.search.history(principal, query.limit), request.id);
  }

  @Get('trending')
  public async trending(@Req() request: FastifyRequest) {
    return this.collection(await this.search.trending(), request.id);
  }

  @Get('lists/:listId')
  public async listDetails(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('listId', new ZodValidationPipe(uuidSchema)) listId: string,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.search.listDetails(principal, listId), request.id);
  }

  @Delete('history/:historyId')
  public async removeHistory(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('historyId', new ZodValidationPipe(uuidSchema)) historyId: string,
    @Req() request: FastifyRequest,
  ) {
    await this.search.removeHistory(principal, historyId);
    return this.ok({ deleted: true }, request.id);
  }

  @Delete('history')
  public async clearHistory(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Req() request: FastifyRequest,
  ) {
    await this.search.clearHistory(principal);
    return this.ok({ deleted: true }, request.id);
  }

  private ok<T>(data: T, requestId: string) {
    return { success: true as const, data, meta: { requestId } };
  }

  private collection<T>(data: T[], requestId: string) {
    return {
      success: true as const,
      data,
      meta: { requestId, page: { nextCursor: null, hasMore: false, limit: data.length } },
    };
  }
}
