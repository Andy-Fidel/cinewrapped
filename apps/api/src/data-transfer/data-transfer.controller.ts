import { Body, Controller, Delete, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import type { z } from 'zod';
import { uuidSchema } from '@cinewrapped/validation';
import { CurrentPrincipal } from '../auth/current-principal.decorator.js';
import type { AuthPrincipal } from '../auth/auth.types.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { AccountExportService, exportQuerySchema } from './account-export.service.js';
import { DataTransferService, importSchema } from './data-transfer.service.js';
@ApiTags('Data transfer')
@ApiBearerAuth()
@Controller('data-transfer')
export class DataTransferController {
  constructor(
    private readonly transfer: DataTransferService,
    private readonly accountExport: AccountExportService,
  ) {}
  @Get('export')
  async export(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Query(new ZodValidationPipe(exportQuerySchema)) query: z.output<typeof exportQuerySchema>,
    @Req() request: FastifyRequest,
  ) {
    return {
      success: true as const,
      data: await this.accountExport.page(principal, query),
      meta: { requestId: request.id },
    };
  }
  @Post('imports')
  async start(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Body(new ZodValidationPipe(importSchema)) input: z.output<typeof importSchema>,
    @Req() request: FastifyRequest,
  ) {
    return {
      success: true as const,
      data: await this.transfer.startImport(principal, input),
      meta: { requestId: request.id },
    };
  }
  @Get('imports')
  async imports(@CurrentPrincipal() principal: AuthPrincipal, @Req() request: FastifyRequest) {
    return {
      success: true as const,
      data: await this.transfer.imports(principal),
      meta: { requestId: request.id },
    };
  }
  @Delete('imports/:id')
  async cancel(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @Req() request: FastifyRequest,
  ) {
    return {
      success: true as const,
      data: await this.transfer.cancelImport(principal, id),
      meta: { requestId: request.id },
    };
  }
}
