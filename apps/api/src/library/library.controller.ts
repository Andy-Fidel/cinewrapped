import {
  addWatchlistItemSchema,
  createReviewSchema,
  createWatchlistSchema,
  languageTagSchema,
  logViewingSchema,
  updateEpisodeProgressSchema,
  updateReviewSchema,
  updateWatchlistSchema,
  updateWatchStatusSchema,
  upsertRatingSchema,
  uuidSchema,
  watchStatusSchema,
} from '@cinewrapped/validation';
import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';

import { CurrentPrincipal } from '../auth/current-principal.decorator.js';
import type { AuthPrincipal } from '../auth/auth.types.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import {
  LibraryService,
  type AddWatchlistItemInput,
  type CreateReviewInput,
  type CreateWatchlistInput,
  type LogViewingInput,
  type UpdateEpisodeProgressInput,
  type UpdateReviewInput,
  type UpdateWatchlistInput,
  type UpdateWatchStatusInput,
  type UpsertRatingInput,
} from './library.service.js';

const libraryQuerySchema = z.object({
  status: watchStatusSchema.optional(),
  mediaType: z.enum(['MOVIE', 'TV']).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().max(300).optional(),
});
const episodeQuerySchema = z.object({ language: languageTagSchema.default('en-US') });
const seasonNumberSchema = z.coerce.number().int().min(0).max(999);

@ApiTags('Library')
@ApiBearerAuth()
@Controller()
export class LibraryController {
  public constructor(private readonly libraryService: LibraryService) {}

  @Get('library')
  public async library(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Query(new ZodValidationPipe(libraryQuerySchema)) query: z.output<typeof libraryQuerySchema>,
    @Req() request: FastifyRequest,
  ) {
    const result = await this.libraryService.library(principal, {
      limit: query.limit,
      ...(query.status === undefined ? {} : { status: query.status }),
      ...(query.mediaType === undefined ? {} : { mediaType: query.mediaType }),
      ...(query.cursor === undefined ? {} : { cursor: query.cursor }),
    });
    return this.collection(result.items, request.id, result.nextCursor, query.limit);
  }

  @Get('library/media/:mediaId')
  public async trackingState(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('mediaId', new ZodValidationPipe(uuidSchema)) mediaId: string,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.libraryService.trackingState(principal, mediaId), request.id);
  }

  @Put('library/media/:mediaId/status')
  public async updateStatus(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('mediaId', new ZodValidationPipe(uuidSchema)) mediaId: string,
    @Body(new ZodValidationPipe(updateWatchStatusSchema)) input: UpdateWatchStatusInput,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.libraryService.updateStatus(principal, mediaId, input), request.id);
  }

  @Delete('library/media/:mediaId')
  public async removeFromLibrary(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('mediaId', new ZodValidationPipe(uuidSchema)) mediaId: string,
    @Req() request: FastifyRequest,
  ) {
    await this.libraryService.removeFromLibrary(principal, mediaId);
    return this.ok({ deleted: true }, request.id);
  }

  @Post('library/media/:mediaId/viewings')
  public async logViewing(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('mediaId', new ZodValidationPipe(uuidSchema)) mediaId: string,
    @Body(new ZodValidationPipe(logViewingSchema)) input: LogViewingInput,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.libraryService.logViewing(principal, mediaId, input), request.id);
  }

  @Get('library/media/:mediaId/seasons/:seasonNumber/episodes')
  public async episodes(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('mediaId', new ZodValidationPipe(uuidSchema)) mediaId: string,
    @Param('seasonNumber', new ZodValidationPipe(seasonNumberSchema)) seasonNumber: number,
    @Query(new ZodValidationPipe(episodeQuerySchema)) query: z.output<typeof episodeQuerySchema>,
    @Req() request: FastifyRequest,
  ) {
    return this.collection(
      await this.libraryService.episodes(principal, mediaId, seasonNumber, query.language),
      request.id,
    );
  }

  @Put('library/episodes/:episodeId/progress')
  public async updateEpisode(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('episodeId', new ZodValidationPipe(uuidSchema)) episodeId: string,
    @Body(new ZodValidationPipe(updateEpisodeProgressSchema)) input: UpdateEpisodeProgressInput,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(
      await this.libraryService.updateEpisodeProgress(principal, episodeId, input),
      request.id,
    );
  }

  @Get('watchlists')
  public async watchlists(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Req() request: FastifyRequest,
  ) {
    return this.collection(await this.libraryService.watchlists(principal), request.id);
  }

  @Post('watchlists')
  public async createWatchlist(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Body(new ZodValidationPipe(createWatchlistSchema)) input: CreateWatchlistInput,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.libraryService.createWatchlist(principal, input), request.id);
  }

  @Get('watchlists/:watchlistId')
  public async watchlist(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('watchlistId', new ZodValidationPipe(uuidSchema)) watchlistId: string,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.libraryService.watchlist(principal, watchlistId), request.id);
  }

  @Patch('watchlists/:watchlistId')
  public async updateWatchlist(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('watchlistId', new ZodValidationPipe(uuidSchema)) watchlistId: string,
    @Body(new ZodValidationPipe(updateWatchlistSchema)) input: UpdateWatchlistInput,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(
      await this.libraryService.updateWatchlist(principal, watchlistId, input),
      request.id,
    );
  }

  @Delete('watchlists/:watchlistId')
  public async deleteWatchlist(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('watchlistId', new ZodValidationPipe(uuidSchema)) watchlistId: string,
    @Req() request: FastifyRequest,
  ) {
    await this.libraryService.deleteWatchlist(principal, watchlistId);
    return this.ok({ deleted: true }, request.id);
  }

  @Post('watchlists/:watchlistId/items')
  public async addWatchlistItem(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('watchlistId', new ZodValidationPipe(uuidSchema)) watchlistId: string,
    @Body(new ZodValidationPipe(addWatchlistItemSchema)) input: AddWatchlistItemInput,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(
      await this.libraryService.addWatchlistItem(principal, watchlistId, input),
      request.id,
    );
  }

  @Delete('watchlists/:watchlistId/items/:mediaId')
  public async removeWatchlistItem(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('watchlistId', new ZodValidationPipe(uuidSchema)) watchlistId: string,
    @Param('mediaId', new ZodValidationPipe(uuidSchema)) mediaId: string,
    @Req() request: FastifyRequest,
  ) {
    await this.libraryService.removeWatchlistItem(principal, watchlistId, mediaId);
    return this.ok({ deleted: true }, request.id);
  }

  @Post('watchlist/items')
  public async addDefaultWatchlistItem(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Body(new ZodValidationPipe(addWatchlistItemSchema)) input: AddWatchlistItemInput,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(
      await this.libraryService.addToDefaultWatchlist(principal, input.mediaId),
      request.id,
    );
  }

  @Put('media/:mediaId/rating')
  public async upsertRating(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('mediaId', new ZodValidationPipe(uuidSchema)) mediaId: string,
    @Body(new ZodValidationPipe(upsertRatingSchema)) input: UpsertRatingInput,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.libraryService.upsertRating(principal, mediaId, input), request.id);
  }

  @Delete('media/:mediaId/rating')
  public async deleteRating(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('mediaId', new ZodValidationPipe(uuidSchema)) mediaId: string,
    @Req() request: FastifyRequest,
  ) {
    await this.libraryService.deleteRating(principal, mediaId);
    return this.ok({ deleted: true }, request.id);
  }

  @Get('media/:mediaId/reviews')
  public async listMediaReviews(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('mediaId', new ZodValidationPipe(uuidSchema)) mediaId: string,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.libraryService.listMediaReviews(principal, mediaId), request.id);
  }

  @Post('media/:mediaId/reviews')
  public async createReview(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('mediaId', new ZodValidationPipe(uuidSchema)) mediaId: string,
    @Body(new ZodValidationPipe(createReviewSchema)) input: CreateReviewInput,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.libraryService.createReview(principal, mediaId, input), request.id);
  }

  @Patch('reviews/:reviewId')
  public async updateReview(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('reviewId', new ZodValidationPipe(uuidSchema)) reviewId: string,
    @Body(new ZodValidationPipe(updateReviewSchema)) input: UpdateReviewInput,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.libraryService.updateReview(principal, reviewId, input), request.id);
  }

  @Delete('reviews/:reviewId')
  public async deleteReview(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('reviewId', new ZodValidationPipe(uuidSchema)) reviewId: string,
    @Req() request: FastifyRequest,
  ) {
    await this.libraryService.deleteReview(principal, reviewId);
    return this.ok({ deleted: true }, request.id);
  }

  private ok<T>(data: T, requestId: string) {
    return { success: true as const, data, meta: { requestId } };
  }
  private collection<T>(
    data: T[],
    requestId: string,
    nextCursor: string | null = null,
    limit = data.length,
  ) {
    return {
      success: true as const,
      data,
      meta: { requestId, page: { nextCursor, hasMore: nextCursor !== null, limit } },
    };
  }
}
