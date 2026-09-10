import { describe, expect, it, vi } from 'vitest';

import { AdminService } from '../src/admin/admin.service.js';
import type { AuthPrincipal } from '../src/auth/auth.types.js';
import type { AppException } from '../src/common/app.exception.js';
import type { PrismaService } from '../src/database/prisma.service.js';

const principal: AuthPrincipal = {
  subject: 'supabase-admin',
  email: 'admin@example.test',
  sessionId: 'session-1',
  expiresAt: null,
  displayName: 'Admin',
  assuranceLevel: 'aal2',
};

describe('AdminService access control', () => {
  it('requires an aal2 session before reading admin data', async () => {
    const findFirst = vi.fn();
    const prisma = { user: { findFirst } } as unknown as PrismaService;
    const service = new AdminService(prisma);

    await expect(service.session({ ...principal, assuranceLevel: 'aal1' })).rejects.toMatchObject({
      code: 'ADMIN_MFA_REQUIRED',
    } satisfies Partial<AppException>);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('denies a signed-in member without an active admin role', async () => {
    const prisma = {
      user: {
        findFirst: vi.fn().mockResolvedValue({
          id: '10000000-0000-4000-8000-000000000000',
          authSubject: principal.subject,
          email: principal.email,
          displayName: 'Admin',
          roles: [],
        }),
      },
    } as unknown as PrismaService;
    const service = new AdminService(prisma);

    await expect(service.session(principal)).rejects.toMatchObject({
      code: 'ADMIN_PERMISSION_DENIED',
    } satisfies Partial<AppException>);
  });

  it('returns the database-backed roles for an MFA-verified administrator', async () => {
    const prisma = {
      user: {
        findFirst: vi.fn().mockResolvedValue({
          id: '10000000-0000-4000-8000-000000000000',
          authSubject: principal.subject,
          email: principal.email,
          displayName: 'Admin',
          roles: [{ role: 'SUPER_ADMINISTRATOR' }],
        }),
      },
    } as unknown as PrismaService;
    const service = new AdminService(prisma);

    await expect(service.session(principal)).resolves.toEqual({
      id: '10000000-0000-4000-8000-000000000000',
      email: principal.email,
      displayName: 'Admin',
      roles: ['SUPER_ADMINISTRATOR'],
      assuranceLevel: 'aal2',
    });
  });
});
