import { PrismaClient } from '@prisma/client';

// One-time launch operation, deliberately separate from startup/seed so later
// administrator changes and emergency feature shutdowns survive redeployments.
const keys = ['MOVIE_JOURNAL', 'CALENDAR_INTEGRATION', 'SOUNDTRACKS', 'SCENE_IDENTIFICATION'];
const prisma = new PrismaClient();

async function release(): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    const flags = await transaction.featureFlag.findMany({ where: { key: { in: keys } } });
    if (flags.length !== keys.length)
      throw new Error('Apply all database migrations before releasing features.');
    for (const flag of flags) {
      await transaction.featureFlag.update({
        where: { key: flag.key },
        data: {
          enabled: true,
          rolloutPercentage: 100,
          environments:
            flag.environments.length === 0
              ? []
              : [...new Set([...flag.environments, 'staging', 'production'])],
        },
      });
    }
  });
  console.log('Production rollout enabled:', keys.join(', '));
}

release()
  .catch((error: unknown) => {
    console.error('Feature release failed.', error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
