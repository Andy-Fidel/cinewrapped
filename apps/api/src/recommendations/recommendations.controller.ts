import { recommendationFeedbackSchema, uuidSchema } from '@cinewrapped/validation';
import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';

import { CurrentPrincipal } from '../auth/current-principal.decorator.js';
import type { AuthPrincipal } from '../auth/auth.types.js';
import { CacheService } from '../cache/cache.service.js';
import { AppException } from '../common/app.exception.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { RecommendationsService } from './recommendations.service.js';

const recommendationTypeSchema = z.enum([
  'PERSONALIZED',
  'TRENDING',
  'FRIEND_BASED',
  'MOOD_BASED',
  'SIMILAR_MEDIA',
  'HIDDEN_GEM',
  'CONTINUE_WATCHING',
  'BECAUSE_YOU_WATCHED',
]);
const recommendationQuerySchema = z.object({
  type: recommendationTypeSchema.optional(),
  runtimeMax: z.coerce.number().int().min(1).max(1_440).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().max(300).optional(),
});

@ApiTags('Recommendations')
@ApiBearerAuth()
@Controller('recommendations')
export class RecommendationsController {
  public constructor(
    private readonly recommendationsService: RecommendationsService,
    private readonly cache: CacheService,
  ) {}

  @Get('taste-profile')
  public async tasteProfile(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.recommendationsService.tasteProfile(principal), request.id);
  }

  @Post('refresh')
  public async refresh(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Req() request: FastifyRequest,
  ) {
    if (
      !(await this.cache.consume(`recommendation-refresh:${principal.subject}`, 5, 3_600, true))
    ) {
      throw new AppException(
        429,
        'RATE_LIMITED',
        'Please wait before refreshing recommendations again.',
      );
    }
    return this.ok(await this.recommendationsService.refresh(principal), request.id);
  }

  @Get()
  public async recommendations(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Query(new ZodValidationPipe(recommendationQuerySchema))
    query: z.output<typeof recommendationQuerySchema>,
    @Req() request: FastifyRequest,
  ) {
    const result = await this.recommendationsService.recommendations(principal, {
      limit: query.limit,
      ...(query.type === undefined ? {} : { recommendationType: query.type }),
      ...(query.runtimeMax === undefined ? {} : { runtimeMax: query.runtimeMax }),
      ...(query.cursor === undefined ? {} : { cursor: query.cursor }),
    });
    return this.collection(result.items, request.id, result.nextCursor, query.limit);
  }

  @Post(':recommendationId/feedback')
  public async feedback(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('recommendationId', new ZodValidationPipe(uuidSchema)) recommendationId: string,
    @Body(new ZodValidationPipe(recommendationFeedbackSchema))
    input: z.output<typeof recommendationFeedbackSchema>,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(
      await this.recommendationsService.feedback(principal, recommendationId, input.feedbackType),
      request.id,
    );
  }

  private ok<T>(data: T, requestId: string) {
    return { success: true as const, data, meta: { requestId } };
  }

  private collection<T>(data: T[], requestId: string, nextCursor: string | null, limit: number) {
    return {
      success: true as const,
      data,
      meta: { requestId, page: { nextCursor, hasMore: nextCursor !== null, limit } },
    };
  }
}
