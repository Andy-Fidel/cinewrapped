import { uuidSchema } from '@cinewrapped/validation';
import { Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';

import type { AuthPrincipal } from '../auth/auth.types.js';
import { CurrentPrincipal } from '../auth/current-principal.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { GamificationService } from './gamification.service.js';

const leaderboardQuerySchema = z.object({
  metric: z.enum(['POINTS', 'VIEWINGS', 'STREAK']).default('POINTS'),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

@ApiTags('Gamification')
@ApiBearerAuth()
@Controller()
export class GamificationController {
  public constructor(private readonly gamification: GamificationService) {}

  @Get('gamification')
  public async dashboard(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.gamification.dashboard(principal), request.id);
  }

  @Post('challenges/:challengeId/join')
  public async joinChallenge(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('challengeId', new ZodValidationPipe(uuidSchema)) challengeId: string,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.gamification.joinChallenge(principal, challengeId), request.id);
  }

  @Get('leaderboards')
  public async leaderboard(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Query(new ZodValidationPipe(leaderboardQuerySchema))
    query: z.output<typeof leaderboardQuerySchema>,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(
      await this.gamification.leaderboard(principal, query.metric, query.limit),
      request.id,
    );
  }

  @Get('passport')
  public async passport(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.gamification.passport(principal), request.id);
  }

  private ok<T>(data: T, requestId: string) {
    return { success: true as const, data, meta: { requestId } };
  }
}
