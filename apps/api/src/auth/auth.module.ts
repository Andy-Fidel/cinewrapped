import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { SupabaseJwtVerifier } from './supabase-jwt-verifier.js';

@Module({
  controllers: [AuthController],
  providers: [AuthService, SupabaseJwtVerifier, { provide: APP_GUARD, useClass: AuthGuard }],
  exports: [AuthService],
})
export class AuthModule {}
