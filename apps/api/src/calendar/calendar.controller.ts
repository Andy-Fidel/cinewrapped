import {
  createCalendarEventSchema,
  updateCalendarEventSchema,
  uuidSchema,
} from '@cinewrapped/validation';
import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
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
import { CalendarService } from './calendar.service.js';

const rangeSchema = z
  .object({ from: z.iso.datetime({ offset: true }), to: z.iso.datetime({ offset: true }) })
  .refine((value) => new Date(value.from) < new Date(value.to), {
    path: ['to'],
    message: 'The end must be after the start.',
  });

@ApiTags('Calendar')
@ApiBearerAuth()
@Controller('calendar')
export class CalendarController {
  public constructor(private readonly calendar: CalendarService) {}
  @Get()
  public async list(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Query(new ZodValidationPipe(rangeSchema)) query: z.output<typeof rangeSchema>,
    @Req() request: FastifyRequest,
  ) {
    return {
      success: true as const,
      data: await this.calendar.list(principal, new Date(query.from), new Date(query.to)),
      meta: { requestId: request.id },
    };
  }
  @Post()
  public async create(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Body(new ZodValidationPipe(createCalendarEventSchema))
    input: z.output<typeof createCalendarEventSchema>,
    @Req() request: FastifyRequest,
  ) {
    return {
      success: true as const,
      data: await this.calendar.create(principal, input),
      meta: { requestId: request.id },
    };
  }
  @Patch(':eventId')
  public async update(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('eventId', new ZodValidationPipe(uuidSchema)) eventId: string,
    @Body(new ZodValidationPipe(updateCalendarEventSchema))
    input: z.output<typeof updateCalendarEventSchema>,
    @Req() request: FastifyRequest,
  ) {
    return {
      success: true as const,
      data: await this.calendar.update(principal, eventId, input),
      meta: { requestId: request.id },
    };
  }
  @Delete(':eventId')
  public async remove(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('eventId', new ZodValidationPipe(uuidSchema)) eventId: string,
    @Req() request: FastifyRequest,
  ) {
    return {
      success: true as const,
      data: await this.calendar.remove(principal, eventId),
      meta: { requestId: request.id },
    };
  }
  @Get(':eventId.ics')
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  public async export(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('eventId', new ZodValidationPipe(uuidSchema)) eventId: string,
  ) {
    return this.calendar.ics(principal, eventId);
  }
}
