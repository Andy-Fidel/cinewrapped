import type { NotificationInboxResponse, RegisterPushDeviceDto } from '@cinewrapped/shared-types';
import {
  notificationInboxQuerySchema,
  registerPushDeviceSchema,
  uuidSchema,
} from '@cinewrapped/validation';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import type { z } from 'zod';

import type { AuthPrincipal } from '../auth/auth.types.js';
import { CurrentPrincipal } from '../auth/current-principal.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { NotificationsService } from './notifications.service.js';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  public constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  public async getInbox(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Query(new ZodValidationPipe(notificationInboxQuerySchema))
    query: z.output<typeof notificationInboxQuerySchema>,
    @Req() request: FastifyRequest,
  ) {
    const data: NotificationInboxResponse = await this.notificationsService.getInbox(
      principal,
      query.filter,
    );
    return {
      success: true as const,
      data,
      meta: { requestId: request.id },
    };
  }

  @Patch(':id/read')
  public async markAsRead(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @Req() request: FastifyRequest,
  ) {
    const data = await this.notificationsService.markAsRead(principal, id);
    return {
      success: true as const,
      data,
      meta: { requestId: request.id },
    };
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  public async markAllAsRead(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Req() request: FastifyRequest,
  ) {
    const data = await this.notificationsService.markAllAsRead(principal);
    return {
      success: true as const,
      data,
      meta: { requestId: request.id },
    };
  }

  @Post('devices')
  @HttpCode(HttpStatus.OK)
  public async registerDevice(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Body(new ZodValidationPipe(registerPushDeviceSchema)) dto: RegisterPushDeviceDto,
    @Req() request: FastifyRequest,
  ) {
    const data = await this.notificationsService.registerDevice(principal, dto);
    return {
      success: true as const,
      data,
      meta: { requestId: request.id },
    };
  }
}
