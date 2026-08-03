import { idempotencyKeySchema, bootstrapSchema } from '@cinewrapped/validation';
import { Body, Controller, Delete, Get, Headers, HttpCode, Param, Post, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { CurrentPrincipal } from './current-principal.decorator.js';
import { AuthService, type BootstrapInput } from './auth.service.js';
import type { AuthPrincipal } from './auth.types.js';

@Controller('auth')
export class AuthController {
  public constructor(private readonly authService: AuthService) {}

  @Post('bootstrap')
  public async bootstrap(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body(new ZodValidationPipe(bootstrapSchema)) input: BootstrapInput,
    @Req() request: FastifyRequest,
  ) {
    idempotencyKeySchema.parse(idempotencyKey);
    const user = await this.authService.bootstrap(principal, input);
    return { success: true as const, data: user, meta: { requestId: request.id } };
  }

  @Get('sessions')
  public async sessions(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Req() request: FastifyRequest,
  ) {
    const sessions = await this.authService.listSessions(principal);
    return {
      success: true as const,
      data: sessions,
      meta: {
        requestId: request.id,
        page: { nextCursor: null, hasMore: false, limit: 50 },
      },
    };
  }

  @Delete('sessions/:sessionId')
  @HttpCode(204)
  public async revoke(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('sessionId') sessionId: string,
  ): Promise<void> {
    await this.authService.revokeSession(principal, sessionId);
  }

  @Post('sessions/revoke-others')
  public async revokeOthers(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Headers('idempotency-key') idempotencyKey: string,
    @Req() request: FastifyRequest,
  ) {
    idempotencyKeySchema.parse(idempotencyKey);
    const revokedCount = await this.authService.revokeOtherSessions(principal);
    return {
      success: true as const,
      data: { revokedCount },
      meta: { requestId: request.id },
    };
  }
}
