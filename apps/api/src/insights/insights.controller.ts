import {
  createWrapSchema,
  createWrapShareSchema,
  statisticsPeriodSchema,
  uuidSchema,
} from '@cinewrapped/validation';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';

import type { AuthPrincipal } from '../auth/auth.types.js';
import { CurrentPrincipal } from '../auth/current-principal.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { InsightsService } from './insights.service.js';

const monthlyQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2200),
  timezone: z.string().trim().min(1).max(64),
});
const wrapsQuerySchema = z.object({
  type: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY', 'CUSTOM']).optional(),
  status: z.enum(['PENDING', 'GENERATING', 'COMPLETED', 'FAILED']).optional(),
  cursor: z.string().max(300).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

@ApiTags('Statistics', 'Wraps')
@ApiBearerAuth()
@Controller()
export class InsightsController {
  public constructor(private readonly insights: InsightsService) {}

  @Get('statistics/summary')
  public async summary(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Query(new ZodValidationPipe(statisticsPeriodSchema))
    query: z.output<typeof statisticsPeriodSchema>,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(
      await this.insights.summary(principal, {
        periodStart: new Date(query.periodStart),
        periodEnd: new Date(query.periodEnd),
        timezone: query.timezone,
      }),
      request.id,
    );
  }

  @Get('statistics/monthly')
  public async monthly(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Query(new ZodValidationPipe(monthlyQuerySchema)) query: z.output<typeof monthlyQuerySchema>,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.insights.monthly(principal, query.year, query.timezone), request.id);
  }

  @Get('statistics/heatmap')
  public async heatmap(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Query(new ZodValidationPipe(monthlyQuerySchema)) query: z.output<typeof monthlyQuerySchema>,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(
      await this.insights.activityHeatmap(principal, query.year, query.timezone),
      request.id,
    );
  }

  @Get('statistics/taste')
  public async taste(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Query(new ZodValidationPipe(statisticsPeriodSchema))
    query: z.output<typeof statisticsPeriodSchema>,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(
      await this.insights.taste(principal, {
        periodStart: new Date(query.periodStart),
        periodEnd: new Date(query.periodEnd),
        timezone: query.timezone,
      }),
      request.id,
    );
  }

  @Get('wraps')
  public async wraps(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Query(new ZodValidationPipe(wrapsQuerySchema)) query: z.output<typeof wrapsQuerySchema>,
    @Req() request: FastifyRequest,
  ) {
    const result = await this.insights.wraps(principal, query);
    return this.collection(result.items, request.id, result.nextCursor, query.limit);
  }

  @Post('wraps')
  public async createWrap(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Body(new ZodValidationPipe(createWrapSchema)) input: z.output<typeof createWrapSchema>,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.insights.createWrap(principal, input), request.id);
  }

  @Get('wraps/:wrapId')
  public async wrap(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('wrapId', new ZodValidationPipe(uuidSchema)) wrapId: string,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.insights.wrap(principal, wrapId), request.id);
  }

  @Delete('wraps/:wrapId')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async deleteWrap(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('wrapId', new ZodValidationPipe(uuidSchema)) wrapId: string,
  ) {
    await this.insights.deleteWrap(principal, wrapId);
  }

  @Post('wraps/:wrapId/share-link')
  public async shareCard(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('wrapId', new ZodValidationPipe(uuidSchema)) wrapId: string,
    @Body(new ZodValidationPipe(createWrapShareSchema))
    input: z.output<typeof createWrapShareSchema>,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.insights.shareCard(principal, wrapId, input), request.id);
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
