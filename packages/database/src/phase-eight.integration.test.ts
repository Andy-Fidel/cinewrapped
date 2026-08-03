import { PrismaClient } from '@prisma/client';
import { afterAll, describe, expect, it } from 'vitest';

const databaseUrl = process.env.TEST_DATABASE_URL;
const integration = describe.runIf(databaseUrl !== undefined);

integration('Phase 8 club migration', () => {
  const prisma = new PrismaClient({
    datasourceUrl: databaseUrl ?? 'postgresql://unused:unused@localhost:5432/unused',
  });

  afterAll(async () => prisma.$disconnect());

  it('creates the normalized club collaboration tables and vote constraint', async () => {
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'clubs', 'club_members', 'club_posts', 'club_polls', 'club_poll_options',
          'club_poll_votes', 'club_watchlist_items', 'club_watchlist_votes', 'club_watch_events'
        )
    `;
    expect(tables).toHaveLength(9);
    const constraints = await prisma.$queryRaw<Array<{ constraint_name: string }>>`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'club_watchlist_votes'
        AND constraint_name = 'club_watchlist_votes_value_check'
    `;
    expect(constraints).toHaveLength(1);
  });
});
