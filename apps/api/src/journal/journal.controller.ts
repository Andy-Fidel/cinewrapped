import {
  createJournalEntrySchema,
  registerJournalAttachmentSchema,
  updateJournalEntrySchema,
  uuidSchema,
} from '@cinewrapped/validation';
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';

import { CurrentPrincipal } from '../auth/current-principal.decorator.js';
import type { AuthPrincipal } from '../auth/auth.types.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import {
  type CreateJournalEntryInput,
  JournalService,
  type RegisterJournalAttachmentInput,
  type UpdateJournalEntryInput,
} from './journal.service.js';

const journalQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().max(300).optional(),
  status: z.enum(['DRAFT', 'COMPLETED']).optional(),
  mediaId: uuidSchema.optional(),
  query: z.string().trim().min(1).max(100).optional(),
});

@ApiTags('Journal')
@ApiBearerAuth()
@Controller('journal')
export class JournalController {
  public constructor(private readonly journal: JournalService) {}

  @Get()
  public async list(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Query(new ZodValidationPipe(journalQuerySchema)) query: z.output<typeof journalQuerySchema>,
    @Req() request: FastifyRequest,
  ) {
    const result = await this.journal.list(principal, {
      limit: query.limit,
      ...(query.cursor === undefined ? {} : { cursor: query.cursor }),
      ...(query.status === undefined ? {} : { status: query.status }),
      ...(query.mediaId === undefined ? {} : { mediaId: query.mediaId }),
      ...(query.query === undefined ? {} : { query: query.query }),
    });
    return {
      success: true as const,
      data: result.items,
      meta: {
        requestId: request.id,
        page: {
          nextCursor: result.nextCursor,
          hasMore: result.nextCursor !== null,
          limit: query.limit,
        },
      },
    };
  }

  @Post()
  public async create(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Body(new ZodValidationPipe(createJournalEntrySchema)) input: CreateJournalEntryInput,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.journal.create(principal, input), request.id);
  }

  @Get(':entryId')
  public async get(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('entryId', new ZodValidationPipe(uuidSchema)) entryId: string,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.journal.get(principal, entryId), request.id);
  }

  @Patch(':entryId')
  public async update(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('entryId', new ZodValidationPipe(uuidSchema)) entryId: string,
    @Body(new ZodValidationPipe(updateJournalEntrySchema)) input: UpdateJournalEntryInput,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.journal.update(principal, entryId, input), request.id);
  }

  @Delete(':entryId')
  public async remove(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('entryId', new ZodValidationPipe(uuidSchema)) entryId: string,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.journal.remove(principal, entryId), request.id);
  }

  @Post(':entryId/attachments')
  public async addAttachment(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('entryId', new ZodValidationPipe(uuidSchema)) entryId: string,
    @Body(new ZodValidationPipe(registerJournalAttachmentSchema))
    input: RegisterJournalAttachmentInput,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.journal.addAttachment(principal, entryId, input), request.id);
  }

  @Delete(':entryId/attachments/:attachmentId')
  public async removeAttachment(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('entryId', new ZodValidationPipe(uuidSchema)) entryId: string,
    @Param('attachmentId', new ZodValidationPipe(uuidSchema)) attachmentId: string,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(
      await this.journal.removeAttachment(principal, entryId, attachmentId),
      request.id,
    );
  }

  private ok<T>(data: T, requestId: string) {
    return { success: true as const, data, meta: { requestId } };
  }
}
