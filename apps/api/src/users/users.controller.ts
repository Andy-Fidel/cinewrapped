import {
  completeOnboardingSchema,
  idempotencyKeySchema,
  updateOnboardingSchema,
  updatePreferencesSchema,
  updatePrivacySchema,
  updateProfileSchema,
} from '@cinewrapped/validation';
import { Body, Controller, Delete, Get, Headers, Patch, Post, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { CurrentPrincipal } from '../auth/current-principal.decorator.js';
import type { AuthPrincipal } from '../auth/auth.types.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import {
  UsersService,
  type CompleteOnboardingInput,
  type UpdateOnboardingInput,
  type UpdatePreferencesInput,
  type UpdatePrivacyInput,
  type UpdateProfileInput,
} from './users.service.js';

@Controller('users/me')
export class UsersController {
  public constructor(private readonly usersService: UsersService) {}

  @Get()
  public async current(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.usersService.getCurrentUser(principal), request.id);
  }

  @Delete()
  public async deleteAccount(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.usersService.deleteCurrentUser(principal), request.id);
  }

  @Patch()
  public async update(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Body(new ZodValidationPipe(updateProfileSchema)) input: UpdateProfileInput,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.usersService.updateCurrentUser(principal, input), request.id);
  }

  @Get('preferences')
  public async preferences(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.usersService.getPreferences(principal), request.id);
  }

  @Patch('preferences')
  public async updatePreferences(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Body(new ZodValidationPipe(updatePreferencesSchema)) input: UpdatePreferencesInput,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.usersService.updatePreferences(principal, input), request.id);
  }

  @Get('privacy')
  public async privacy(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.usersService.getPrivacy(principal), request.id);
  }

  @Patch('privacy')
  public async updatePrivacy(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Body(new ZodValidationPipe(updatePrivacySchema)) input: UpdatePrivacyInput,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.usersService.updatePrivacy(principal, input), request.id);
  }

  @Get('onboarding')
  public async onboarding(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.usersService.getOnboarding(principal), request.id);
  }

  @Patch('onboarding')
  public async updateOnboarding(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Body(new ZodValidationPipe(updateOnboardingSchema)) input: UpdateOnboardingInput,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.usersService.markOnboardingStep(principal, input), request.id);
  }

  @Post('onboarding/complete')
  public async completeOnboarding(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body(new ZodValidationPipe(completeOnboardingSchema)) input: CompleteOnboardingInput,
    @Req() request: FastifyRequest,
  ) {
    idempotencyKeySchema.parse(idempotencyKey);
    return this.ok(await this.usersService.completeOnboarding(principal, input), request.id);
  }

  private ok<TData>(data: TData, requestId: string) {
    return { success: true as const, data, meta: { requestId } };
  }
}
