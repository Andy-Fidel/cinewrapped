import { createHash, randomUUID } from 'node:crypto';

import { PrismaClient } from '@prisma/client';
import { afterAll, describe, expect, it } from 'vitest';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (process.env.CI === 'true' && databaseUrl === undefined) {
  throw new Error('CI must provide TEST_DATABASE_URL for database integration tests.');
}
const integration = describe.runIf(databaseUrl !== undefined);

integration('Account erasure migration', () => {
  const prisma = new PrismaClient({
    datasourceUrl: databaseUrl ?? 'postgresql://unused:unused@localhost:5432/unused',
  });

  afterAll(async () => prisma.$disconnect());

  it('persists an erasure request and outbox event without a user foreign key', async () => {
    const requestId = randomUUID();
    const userId = randomUUID();
    const subject = `integration-${randomUUID()}`;
    const subjectHash = createHash('sha256').update(subject).digest('hex');

    await prisma.$transaction(async (transaction) => {
      await transaction.accountErasureRequest.create({
        data: { id: requestId, userId, authSubject: subject, authSubjectHash: subjectHash },
      });
      await transaction.outboxEvent.create({
        data: {
          id: requestId,
          aggregateType: 'ACCOUNT_ERASURE',
          aggregateId: requestId,
          eventType: 'account.erase',
          payloadJson: { requestId },
        },
      });
    });

    await expect(
      prisma.accountErasureRequest.update({
        where: { id: requestId },
        data: { status: 'COMPLETED', authSubject: null, completedAt: new Date() },
      }),
    ).resolves.toMatchObject({
      id: requestId,
      userId,
      authSubject: null,
      authSubjectHash: subjectHash,
      status: 'COMPLETED',
    });

    await prisma.outboxEvent.delete({ where: { id: requestId } });
    await prisma.accountErasureRequest.delete({ where: { id: requestId } });
  });

  it('enables row-level security and revokes browser-role access to the erasure ledger', async () => {
    const rows = await prisma.$queryRaw<Array<{ relrowsecurity: boolean }>>`
      select c.relrowsecurity
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = 'account_erasure_requests'
    `;

    expect(rows).toEqual([{ relrowsecurity: true }]);
    const privileges = await prisma.$queryRaw<
      Array<{ anon_select: boolean; authenticated_select: boolean }>
    >`
      select
        has_table_privilege('anon', 'public.account_erasure_requests', 'select') as anon_select,
        has_table_privilege(
          'authenticated',
          'public.account_erasure_requests',
          'select'
        ) as authenticated_select
    `;
    expect(privileges).toEqual([{ anon_select: false, authenticated_select: false }]);
  });
});
