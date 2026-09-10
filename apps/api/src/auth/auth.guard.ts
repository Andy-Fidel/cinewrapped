import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';

import { AppException } from '../common/app.exception.js';
import { PrismaService } from '../database/prisma.service.js';
import type { AuthPrincipal } from './auth.types.js';
import { IS_PUBLIC_ROUTE } from './public.decorator.js';
import { SupabaseJwtVerifier } from './supabase-jwt-verifier.js';

type AuthenticatedRequest = FastifyRequest & { principal: AuthPrincipal };

@Injectable()
export class AuthGuard implements CanActivate {
  public constructor(
    private readonly reflector: Reflector,
    private readonly verifier: SupabaseJwtVerifier,
    private readonly prisma: PrismaService,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_ROUTE, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    if (authorization === undefined || !authorization.startsWith('Bearer ')) {
      throw new AppException(401, 'AUTH_TOKEN_MISSING', 'A bearer access token is required.');
    }
    const principal = await this.verifier.verify(authorization.slice('Bearer '.length));
    const member = await this.prisma.user.findUnique({
      where: { authSubject: principal.subject },
      select: { status: true, deletedAt: true },
    });
    if (member?.deletedAt !== null && member?.deletedAt !== undefined) {
      throw new AppException(403, 'ACCOUNT_UNAVAILABLE', 'This account is unavailable.');
    }
    if (member?.status === 'SUSPENDED' || member?.status === 'BANNED') {
      throw new AppException(
        403,
        'ACCOUNT_RESTRICTED',
        'This account cannot access CineWrapped at this time.',
      );
    }
    const session = await this.prisma.authSession.findUnique({
      where: { id: principal.sessionId },
      select: { revokedAt: true },
    });
    if (session?.revokedAt != null) {
      throw new AppException(401, 'AUTH_SESSION_REVOKED', 'This session has been revoked.');
    }
    if (session === null && !request.url.includes('/auth/bootstrap')) {
      throw new AppException(
        401,
        'AUTH_SESSION_NOT_REGISTERED',
        'This device session is not registered. Sign in again to continue.',
      );
    }
    request.principal = principal;
    return true;
  }
}
