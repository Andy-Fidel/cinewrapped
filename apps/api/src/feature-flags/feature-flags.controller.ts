import { Controller, Get, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';

import { CurrentPrincipal } from '../auth/current-principal.decorator.js';
import type { AuthPrincipal } from '../auth/auth.types.js';
import { FeatureFlagsService } from './feature-flags.service.js';

@ApiTags('Feature flags')
@ApiBearerAuth()
@Controller('feature-flags')
export class FeatureFlagsController {
  public constructor(private readonly featureFlags: FeatureFlagsService) {}

  @Get()
  public async list(@CurrentPrincipal() principal: AuthPrincipal, @Req() request: FastifyRequest) {
    return {
      success: true as const,
      data: await this.featureFlags.evaluate(principal),
      meta: { requestId: request.id },
    };
  }
}
