import { reportContentSchema } from '@cinewrapped/validation';
import { Body, Controller, Post, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { CurrentPrincipal } from '../auth/current-principal.decorator.js';
import type { AuthPrincipal } from '../auth/auth.types.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { ReportsService, type ReportContentInput } from './reports.service.js';

@Controller('reports')
export class ReportsController {
  public constructor(private readonly reports: ReportsService) {}

  @Post()
  public async create(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Body(new ZodValidationPipe(reportContentSchema)) input: ReportContentInput,
    @Req() request: FastifyRequest,
  ) {
    return {
      success: true as const,
      data: await this.reports.create(principal, input, request.id),
      meta: { requestId: request.id },
    };
  }
}
