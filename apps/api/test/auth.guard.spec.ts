import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { AuthGuard } from '../src/auth/auth.guard.js';
import type { AuthPrincipal } from '../src/auth/auth.types.js';
import type { SupabaseJwtVerifier } from '../src/auth/supabase-jwt-verifier.js';
import type { PrismaService } from '../src/database/prisma.service.js';

const principal: AuthPrincipal = {
  subject: 'supabase-member',
  email: 'member@example.test',
  sessionId: 'session-1',
  expiresAt: null,
  displayName: 'Member',
  assuranceLevel: 'aal1',
};

function contextFor(request: Partial<FastifyRequest>): ExecutionContext {
  return {
    getHandler: vi.fn(),
    getClass: vi.fn(),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function createGuard(input: {
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  revokedAt?: Date | null;
}) {
  const reflector = { getAllAndOverride: vi.fn().mockReturnValue(false) } as unknown as Reflector;
  const verifier = {
    verify: vi.fn().mockResolvedValue(principal),
  } as unknown as SupabaseJwtVerifier;
  const prisma = {
    user: {
      findUnique: vi.fn().mockResolvedValue({ status: input.status, deletedAt: null }),
    },
    authSession: {
      findUnique: vi.fn().mockResolvedValue({ revokedAt: input.revokedAt ?? null }),
    },
  } as unknown as PrismaService;
  return new AuthGuard(reflector, verifier, prisma);
}

describe('AuthGuard account restrictions', () => {
  it('rejects a suspended account before checking its device session', async () => {
    const guard = createGuard({ status: 'SUSPENDED' });
    const request = { headers: { authorization: 'Bearer token' }, url: '/library' };

    await expect(guard.canActivate(contextFor(request))).rejects.toMatchObject({
      code: 'ACCOUNT_RESTRICTED',
    });
  });

  it('rejects a revoked registered session', async () => {
    const guard = createGuard({ status: 'ACTIVE', revokedAt: new Date() });
    const request = { headers: { authorization: 'Bearer token' }, url: '/library' };

    await expect(guard.canActivate(contextFor(request))).rejects.toMatchObject({
      code: 'AUTH_SESSION_REVOKED',
    });
  });
});
