import {
  conversationalRecommendationSchema,
  intelligentDiscoverySchema,
  reviewAssistantSchema,
} from '@cinewrapped/validation';
import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import type { z } from 'zod';

import type { AuthPrincipal } from '../auth/auth.types.js';
import { CurrentPrincipal } from '../auth/current-principal.decorator.js';
import { CacheService } from '../cache/cache.service.js';
import { AppException } from '../common/app.exception.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { AiService } from './ai.service.js';

@ApiTags('AI')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  public constructor(
    private readonly ai: AiService,
    private readonly cache: CacheService,
  ) {}

  @Post('discovery')
  public async discovery(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Body(new ZodValidationPipe(intelligentDiscoverySchema))
    input: z.output<typeof intelligentDiscoverySchema>,
    @Req() request: FastifyRequest,
  ) {
    await this.consume(principal, 'discovery', 30);
    return this.ok(await this.ai.discover(principal, input), request.id);
  }

  @Post('recommendations/conversation')
  public async conversation(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Body(new ZodValidationPipe(conversationalRecommendationSchema))
    input: z.output<typeof conversationalRecommendationSchema>,
    @Req() request: FastifyRequest,
  ) {
    await this.consume(principal, 'conversation', 20);
    return this.ok(await this.ai.conversation(principal, input), request.id);
  }

  @Post('reviews/assist')
  public async review(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Body(new ZodValidationPipe(reviewAssistantSchema))
    input: z.output<typeof reviewAssistantSchema>,
    @Req() request: FastifyRequest,
  ) {
    await this.consume(principal, 'review', 20);
    return this.ok(await this.ai.reviewDraft(principal, input), request.id);
  }

  @Get('movie-dna')
  public async movieDna(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.ai.movieDna(principal), request.id);
  }

  private async consume(principal: AuthPrincipal, feature: string, limit: number) {
    if (!(await this.cache.consume(`ai:${feature}:${principal.subject}`, limit, 3_600, true))) {
      throw new AppException(
        429,
        'RATE_LIMITED',
        'This assistant is receiving too many requests. Please wait and try again.',
      );
    }
  }

  private ok<T>(data: T, requestId: string) {
    return { success: true as const, data, meta: { requestId } };
  }
}
