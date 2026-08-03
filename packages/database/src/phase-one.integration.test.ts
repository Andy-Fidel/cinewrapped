import { PrismaClient } from '@prisma/client';
import { afterAll, describe, expect, it } from 'vitest';

const databaseUrl = process.env.TEST_DATABASE_URL;
const integration = describe.runIf(databaseUrl !== undefined);

integration('Phase 1 PostgreSQL migration', () => {
  const prisma = new PrismaClient({
    datasourceUrl: databaseUrl ?? 'postgresql://unused:unused@localhost:5432/unused',
  });

  afterAll(async () => prisma.$disconnect());

  it('creates the auth and onboarding tables with seeded discovery data', async () => {
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('auth_sessions', 'onboarding_progress', 'genres', 'streaming_providers')
    `;
    expect(tables.map(({ table_name: name }) => name).sort()).toEqual([
      'auth_sessions',
      'genres',
      'onboarding_progress',
      'streaming_providers',
    ]);
    await expect(prisma.genre.count()).resolves.toBeGreaterThanOrEqual(18);
    await expect(prisma.streamingProvider.count()).resolves.toBeGreaterThanOrEqual(7);
  });
});
