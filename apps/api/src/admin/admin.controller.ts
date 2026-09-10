import { Body, Controller, Get, Param, Patch, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';

import { CurrentPrincipal } from '../auth/current-principal.decorator.js';
import type { AuthPrincipal } from '../auth/auth.types.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { AdminService, adminRoles } from './admin.service.js';

const uuidSchema = z.uuid();
const listQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  take: z.coerce.number().int().min(1).max(100).default(50),
});
const userStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'WARNED', 'SUSPENDED', 'BANNED']),
  reason: z.string().trim().min(8).max(500),
});
const userRoleSchema = z.object({
  role: z.enum(adminRoles),
  enabled: z.boolean(),
  reason: z.string().trim().min(8).max(500),
});
const featureFlagSchema = z.object({
  enabled: z.boolean(),
  rolloutPercentage: z.number().int().min(0).max(100),
  environments: z.array(z.enum(['development', 'test', 'staging', 'production'])).max(4),
  reason: z.string().trim().min(8).max(500),
});
const reportResolutionSchema = z.object({
  resolution: z.enum(['RESOLVED', 'DISMISSED']),
  reason: z.string().trim().min(8).max(500),
});

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
export class AdminController {
  public constructor(private readonly admin: AdminService) {}

  @Get('session')
  public async session(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.admin.session(principal), request.id);
  }

  @Get('dashboard')
  public async dashboard(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.admin.dashboard(principal), request.id);
  }

  @Get('users')
  public async users(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Query() rawQuery: Record<string, unknown>,
    @Req() request: FastifyRequest,
  ) {
    const query = listQuerySchema.parse(rawQuery);
    return this.ok(await this.admin.users(principal, query.q, query.take), request.id);
  }

  @Patch('users/:userId/status')
  public async updateUserStatus(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('userId') rawUserId: string,
    @Body(new ZodValidationPipe(userStatusSchema)) input: z.output<typeof userStatusSchema>,
    @Req() request: FastifyRequest,
  ) {
    const userId = uuidSchema.parse(rawUserId);
    return this.ok(
      await this.admin.updateUserStatus(principal, userId, input.status, input.reason, request.id),
      request.id,
    );
  }

  @Patch('users/:userId/roles')
  public async updateUserRole(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('userId') rawUserId: string,
    @Body(new ZodValidationPipe(userRoleSchema)) input: z.output<typeof userRoleSchema>,
    @Req() request: FastifyRequest,
  ) {
    const userId = uuidSchema.parse(rawUserId);
    return this.ok(
      await this.admin.updateUserRole(
        principal,
        userId,
        input.role,
        input.enabled,
        input.reason,
        request.id,
      ),
      request.id,
    );
  }

  @Get('feature-flags')
  public async featureFlags(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.admin.featureFlags(principal), request.id);
  }

  @Patch('feature-flags/:key')
  public async updateFeatureFlag(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('key') key: string,
    @Body(new ZodValidationPipe(featureFlagSchema)) input: z.output<typeof featureFlagSchema>,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(
      await this.admin.updateFeatureFlag(principal, key, input, request.id),
      request.id,
    );
  }

  @Get('reports')
  public async reports(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Query() rawQuery: Record<string, unknown>,
    @Req() request: FastifyRequest,
  ) {
    const query = listQuerySchema.parse(rawQuery);
    return this.ok(await this.admin.reports(principal, query.take), request.id);
  }

  @Patch('reports/:reportId')
  public async resolveReport(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('reportId') rawReportId: string,
    @Body(new ZodValidationPipe(reportResolutionSchema))
    input: z.output<typeof reportResolutionSchema>,
    @Req() request: FastifyRequest,
  ) {
    const reportId = uuidSchema.parse(rawReportId);
    return this.ok(
      await this.admin.resolveReport(
        principal,
        reportId,
        input.resolution,
        input.reason,
        request.id,
      ),
      request.id,
    );
  }

  @Get('audit-logs')
  public async auditLogs(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Query() rawQuery: Record<string, unknown>,
    @Req() request: FastifyRequest,
  ) {
    const query = listQuerySchema.parse(rawQuery);
    return this.ok(await this.admin.auditLogs(principal, query.take), request.id);
  }

  private ok<TData>(data: TData, requestId: string) {
    return { success: true as const, data, meta: { requestId } };
  }
}
