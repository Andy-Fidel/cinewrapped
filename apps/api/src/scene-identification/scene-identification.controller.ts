import {
  identifySceneSchema,
  sceneIdentificationFeedbackSchema,
  uuidSchema,
} from '@cinewrapped/validation';
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';

import type { AuthPrincipal } from '../auth/auth.types.js';
import { CurrentPrincipal } from '../auth/current-principal.decorator.js';
import { CacheService } from '../cache/cache.service.js';
import { AppException } from '../common/app.exception.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { SceneIdentificationService } from './scene-identification.service.js';

const listQuerySchema = z.object({ limit: z.coerce.number().int().min(1).max(30).default(20) });

@ApiTags('Scene identification')
@ApiBearerAuth()
@Controller('scene-identifications')
export class SceneIdentificationController {
  public constructor(
    private readonly scenes: SceneIdentificationService,
    private readonly cache: CacheService,
  ) {}

  @Post()
  public async identify(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Body(new ZodValidationPipe(identifySceneSchema)) input: z.output<typeof identifySceneSchema>,
    @Req() request: FastifyRequest,
  ) {
    if (!(await this.cache.consume(`scene-identification:${principal.subject}`, 10, 3_600, true)))
      throw new AppException(
        429,
        'SCENE_IDENTIFICATION_RATE_LIMITED',
        'You have reached the hourly scene-identification limit.',
      );
    return this.ok(await this.scenes.identify(principal, input), request.id);
  }

  @Get()
  public async list(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Query(new ZodValidationPipe(listQuerySchema)) query: z.output<typeof listQuerySchema>,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.scenes.list(principal, query.limit), request.id);
  }

  @Patch(':id/feedback')
  public async feedback(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @Body(new ZodValidationPipe(sceneIdentificationFeedbackSchema))
    input: z.output<typeof sceneIdentificationFeedbackSchema>,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.scenes.feedback(principal, id, input), request.id);
  }

  @Delete(':id')
  public async remove(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.scenes.remove(principal, id), request.id);
  }

  private ok<T>(data: T, requestId: string) {
    return { success: true as const, data, meta: { requestId } };
  }
}
