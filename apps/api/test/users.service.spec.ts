import { describe, expect, it, vi } from 'vitest';

import type { AuthPrincipal } from '../src/auth/auth.types.js';
import type { PrismaService } from '../src/database/prisma.service.js';
import { UsersService } from '../src/users/users.service.js';

const principal: AuthPrincipal = {
  subject: 'supabase-user-1',
  email: 'member@example.test',
  displayName: 'Member',
  sessionId: 'session-1',
  expiresAt: null,
  assuranceLevel: 'aal1',
};

function createService(createdAt: Date | null) {
  const findUser = vi.fn();
  const runTransaction = vi.fn();
  const prisma = {
    authSession: {
      findFirst: vi.fn().mockResolvedValue(createdAt === null ? null : { createdAt }),
    },
    user: { findUnique: findUser },
    $transaction: runTransaction,
  } as unknown as PrismaService;
  return { service: new UsersService(prisma), findUser, runTransaction };
}

describe('UsersService account deletion authentication', () => {
  it('rejects deletion when the registered session is older than ten minutes', async () => {
    const { service, findUser } = createService(new Date(Date.now() - 11 * 60_000));

    await expect(service.deleteCurrentUser(principal)).rejects.toMatchObject({
      code: 'AUTH_RECENT_LOGIN_REQUIRED',
    });
    expect(findUser).not.toHaveBeenCalled();
  });

  it('rejects deletion when the authenticated session is not registered', async () => {
    const { service, findUser } = createService(null);

    await expect(service.deleteCurrentUser(principal)).rejects.toMatchObject({
      code: 'AUTH_RECENT_LOGIN_REQUIRED',
    });
    expect(findUser).not.toHaveBeenCalled();
  });

  it('continues to account lookup for a newly registered session', async () => {
    const { service, findUser } = createService(new Date());
    findUser.mockResolvedValue(null);

    await expect(service.deleteCurrentUser(principal)).rejects.toMatchObject({
      code: 'USER_NOT_BOOTSTRAPPED',
    });
    expect(findUser).toHaveBeenCalledWith({ where: { authSubject: principal.subject } });
  });

  it('atomically disables the account, revokes sessions, and enqueues erasure', async () => {
    const requestedAt = new Date();
    const { service, findUser, runTransaction } = createService(new Date());
    findUser.mockResolvedValue({ id: 'user-1', deletedAt: null });
    const transaction = {
      accountErasureRequest: {
        upsert: vi.fn().mockResolvedValue({ id: 'request-1', requestedAt }),
      },
      user: { update: vi.fn().mockResolvedValue({}) },
      authSession: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      outboxEvent: { upsert: vi.fn().mockResolvedValue({}) },
    };
    runTransaction.mockImplementation(
      (operation: (client: typeof transaction) => Promise<unknown>) => operation(transaction),
    );

    await expect(service.deleteCurrentUser(principal)).resolves.toEqual({
      id: 'request-1',
      status: 'PENDING',
      requestedAt: requestedAt.toISOString(),
    });
    expect(transaction.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { deletedAt: expect.any(Date) },
    });
    expect(transaction.authSession.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(transaction.outboxEvent.upsert).toHaveBeenCalledWith({
      where: { id: 'request-1' },
      update: {},
      create: {
        id: 'request-1',
        aggregateType: 'ACCOUNT_ERASURE',
        aggregateId: 'request-1',
        eventType: 'account.erase',
        payloadJson: { requestId: 'request-1' },
      },
    });
  });
});
