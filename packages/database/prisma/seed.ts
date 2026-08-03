import { ExternalProvider, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const genres = [
  ['28', 'Action', 'action'],
  ['12', 'Adventure', 'adventure'],
  ['16', 'Animation', 'animation'],
  ['35', 'Comedy', 'comedy'],
  ['80', 'Crime', 'crime'],
  ['99', 'Documentary', 'documentary'],
  ['18', 'Drama', 'drama'],
  ['10751', 'Family', 'family'],
  ['14', 'Fantasy', 'fantasy'],
  ['36', 'History', 'history'],
  ['27', 'Horror', 'horror'],
  ['10402', 'Music', 'music'],
  ['9648', 'Mystery', 'mystery'],
  ['10749', 'Romance', 'romance'],
  ['878', 'Science Fiction', 'science-fiction'],
  ['53', 'Thriller', 'thriller'],
  ['10752', 'War', 'war'],
  ['37', 'Western', 'western'],
] as const;

const streamingProviders = [
  ['8', 'Netflix', 'netflix', 10],
  ['119', 'Amazon Prime Video', 'amazon-prime-video', 20],
  ['337', 'Disney Plus', 'disney-plus', 30],
  ['1899', 'Max', 'max', 40],
  ['350', 'Apple TV Plus', 'apple-tv-plus', 50],
  ['15', 'Hulu', 'hulu', 60],
  ['283', 'Crunchyroll', 'crunchyroll', 70],
] as const;

const achievements = [
  [
    'first-watch',
    'Opening Scene',
    'Log your first viewing.',
    'VIEWING',
    'VIEWINGS',
    1,
    'BRONZE',
    10,
  ],
  [
    'ten-titles',
    'Top Ten',
    'Watch ten unique titles.',
    'VIEWING',
    'UNIQUE_TITLES',
    10,
    'SILVER',
    25,
  ],
  [
    'hundred-hours',
    'Century Club',
    'Watch one hundred hours.',
    'VIEWING',
    'MINUTES_WATCHED',
    6_000,
    'GOLD',
    100,
  ],
  ['rewatch-five', 'Encore', 'Log five rewatches.', 'VIEWING', 'REWATCHES', 5, 'SILVER', 30],
  ['rate-ten', 'The Critic', 'Rate ten titles.', 'COMMUNITY', 'RATINGS', 10, 'SILVER', 30],
  [
    'streak-seven',
    'Seven-Day Screening',
    'Watch on seven consecutive days.',
    'STREAK',
    'STREAK_DAYS',
    7,
    'GOLD',
    75,
  ],
  [
    'passport-ten',
    'World Cinema Traveler',
    'Watch titles from ten countries.',
    'PASSPORT',
    'COUNTRIES',
    10,
    'GOLD',
    100,
  ],
] as const;

const challenges = [
  [
    'summer-screen-2026',
    'Summer Screen',
    'Log twelve viewings during the season.',
    'VIEWINGS',
    12,
    50,
    '2026-07-01T00:00:00.000Z',
    '2026-09-01T00:00:00.000Z',
  ],
  [
    'world-tour-2026',
    'World Tour',
    'Watch titles from five production countries.',
    'COUNTRIES',
    5,
    75,
    '2026-01-01T00:00:00.000Z',
    '2027-01-01T00:00:00.000Z',
  ],
] as const;

async function seed(): Promise<void> {
  await prisma.$transaction([
    ...genres.map(([externalId, name, slug]) =>
      prisma.genre.upsert({
        where: { provider_externalId: { provider: ExternalProvider.TMDB, externalId } },
        update: { name, slug },
        create: { provider: ExternalProvider.TMDB, externalId, name, slug },
      }),
    ),
    ...streamingProviders.map(([externalId, name, slug, displayPriority]) =>
      prisma.streamingProvider.upsert({
        where: {
          externalProvider_externalId: { externalProvider: ExternalProvider.TMDB, externalId },
        },
        update: { name, slug, displayPriority },
        create: {
          externalProvider: ExternalProvider.TMDB,
          externalId,
          name,
          slug,
          displayPriority,
        },
      }),
    ),
    ...achievements.map(([code, name, description, category, metric, target, tier, points]) =>
      prisma.achievement.upsert({
        where: { code },
        update: { name, description, category, criteriaJson: { metric, target }, tier, points },
        create: {
          code,
          name,
          description,
          category,
          criteriaJson: { metric, target },
          tier,
          points,
        },
      }),
    ),
    ...challenges.map(([code, name, description, metric, target, points, startsAt, endsAt]) =>
      prisma.challenge.upsert({
        where: { code },
        update: { name, description, metric, target, points, startsAt, endsAt },
        create: { code, name, description, metric, target, points, startsAt, endsAt },
      }),
    ),
  ]);
}

seed()
  .catch((error: unknown) => {
    console.error('Database seed failed.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
