import type { StoryPresentation, StorySlideData } from '@cinewrapped/shared-types';

export interface GenerateWrapStoryInput {
  user: {
    userId: string;
    displayName: string;
    username: string;
    avatarUrl?: string | null;
  };
  year?: number;
  totalFilms?: number;
  totalHours?: number;
  longestStreakDays?: number;
  topGenres?: string[];
  topFilms?: Array<{
    rank: number;
    title: string;
    rating?: number | string;
    posterUrl?: string | null;
    tag?: string;
  }>;
  cinemaPersonality?: string;
  topDirector?: string;
  quoteOfTheYear?: {
    line: string;
    movieTitle: string;
    speaker?: string;
    year?: number;
  };
}

export function generateAnnualWrapPresentation(
  input: GenerateWrapStoryInput,
): StoryPresentation {
  const year = input.year ?? new Date().getFullYear();
  const filmsCount = input.totalFilms ?? 142;
  const screenHours = input.totalHours ?? 318;
  const streak = input.longestStreakDays ?? 28;
  const personality = input.cinemaPersonality ?? 'Auteur Visionary';
  const topDirector = input.topDirector ?? 'Christopher Nolan';

  const slides: StorySlideData[] = [
    // Slide 1: Welcome / Introduction
    {
      id: 'slide-1-intro',
      layout: 'HERO_STATS',
      theme: 'MIDNIGHT_GOLD',
      eyebrow: `${year} CINEMA WRAPPED`,
      headline: `${input.user.displayName}'s Year in Film`,
      description: 'Your bespoke 365-day cinematic journey, engineered from your viewing logs and ratings.',
      metric: {
        value: filmsCount,
        label: 'FILMS & SEASONS LOGGED',
        badge: 'TOP 2% CINEPHILE',
      },
      secondaryMetrics: [
        { label: 'Screen Time', value: `${screenHours}h` },
        { label: 'Max Streak', value: `🔥 ${streak}d` },
        { label: 'Ratings', value: '4.2 ★ Avg' },
      ],
      footer: {
        branding: 'CineWrapped Annual Intelligence',
        handle: `@${input.user.username}`,
        badgeText: `${year} Verified Wrap`,
      },
    },

    // Slide 2: Top 5 Masterpieces
    {
      id: 'slide-2-top5',
      layout: 'TOP_FIVE_GRID',
      theme: 'CRIMSON_NOIR',
      eyebrow: 'YOUR PRESTIGE LEADERBOARD',
      headline: 'Top 5 Films of the Year',
      description: 'The definitive ranking of your most acclaimed 5-star viewings in 2026.',
      rankingItems: input.topFilms && input.topFilms.length > 0
        ? input.topFilms.map((f) => ({
            rank: f.rank,
            title: f.title,
            score: f.rating ?? '9.8',
            posterUrl: f.posterUrl ?? 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
            subtitle: f.tag ?? 'Masterpiece Selection',
          }))
        : [
            {
              rank: 1,
              title: 'Oppenheimer',
              subtitle: 'Directed by Christopher Nolan',
              score: '9.9',
              posterUrl: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
            },
            {
              rank: 2,
              title: 'Dune: Part Two',
              subtitle: 'IMAX 70mm Presentation',
              score: '9.8',
              posterUrl: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
            },
            {
              rank: 3,
              title: 'Anatomy of a Fall',
              subtitle: 'Palme d’Or Winner',
              score: '9.5',
              posterUrl: 'https://image.tmdb.org/t/p/w500/5aTCkVRzkgfT8y0fF67dO01jSgX.jpg',
            },
            {
              rank: 4,
              title: 'Past Lives',
              subtitle: 'Romantic Masterclass',
              score: '9.4',
              posterUrl: 'https://image.tmdb.org/t/p/w500/k3waqVXSnvCZWfJYNtdamTgTtTA.jpg',
            },
            {
              rank: 5,
              title: 'Zone of Interest',
              subtitle: 'Grand Prix Laureate',
              score: '9.3',
              posterUrl: 'https://image.tmdb.org/t/p/w500/AbHVsB5YQW4767JgRjPskqF4c2Y.jpg',
            },
          ],
      footer: {
        branding: 'Top Rated Rankings',
        handle: `@${input.user.username}`,
      },
    },

    // Slide 3: Cinematic #1 Spotlight
    {
      id: 'slide-3-spotlight',
      layout: 'CINEMATIC_POSTER',
      theme: 'NEON_CYBER',
      eyebrow: '#1 MOST REWATCHED',
      headline: 'The Film That Defined Your Year',
      description: 'You returned to this cinematic world 3 separate times across IMAX and 4K UHD.',
      media: {
        title: 'Oppenheimer',
        releaseYear: 2023,
        director: topDirector,
        posterUrl: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
        backdropUrl: 'https://image.tmdb.org/t/p/w1280/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg',
      },
      footer: {
        branding: 'Crown Selection',
        handle: `@${input.user.username}`,
        badgeText: 'Obsession of the Year',
      },
    },

    // Slide 4: Taste Radar & Vibe Matrix
    {
      id: 'slide-4-radar',
      layout: 'RADAR_RADIAL',
      theme: 'AMETHYST_DREAM',
      eyebrow: 'NEURAL TASTE RADAR',
      headline: `Persona: ${personality}`,
      description: 'Your aesthetic taste aligns with high-concept auteur thrillers and complex non-linear storytelling.',
      vibeTags: input.topGenres && input.topGenres.length > 0
        ? input.topGenres
        : [
            '🎬 Auteur Cinema (98%)',
            '🤯 Mind-Bending (94%)',
            '🎞️ 70mm IMAX (89%)',
            '🕵️ Neo-Noir (86%)',
            '🌌 Existential Sci-Fi (82%)',
          ],
      footer: {
        branding: 'AI Taste Matrix',
        handle: `@${input.user.username}`,
      },
    },

    // Slide 5: Quote of the Year
    {
      id: 'slide-5-quote',
      layout: 'QUOTE_SPOTLIGHT',
      theme: 'EMERALD_VAULT',
      eyebrow: 'CINEMA LINE OF THE YEAR',
      headline: input.quoteOfTheYear?.line ?? 'Now I am become Death, the destroyer of worlds.',
      media: {
        quote: input.quoteOfTheYear?.line ?? 'Now I am become Death, the destroyer of worlds.',
        title: input.quoteOfTheYear?.movieTitle ?? 'Oppenheimer',
        director: input.quoteOfTheYear?.speaker ?? 'J. Robert Oppenheimer',
        releaseYear: input.quoteOfTheYear?.year ?? 2023,
      },
      description: 'Saved to your private viewing journal on July 21st.',
      footer: {
        branding: 'Journal Highlight',
        handle: `@${input.user.username}`,
      },
    },

    // Slide 6: Summary & Share Card
    {
      id: 'slide-6-summary',
      layout: 'SUMMARY_CARD',
      theme: 'MIDNIGHT_GOLD',
      eyebrow: '2026 RECAP COMPLETED',
      headline: `${input.user.displayName}'s CineWrapped`,
      secondaryMetrics: [
        { label: 'Total Films Watched', value: `${filmsCount}` },
        { label: 'Screen Time', value: `${screenHours} Hours` },
        { label: 'Peak Streak', value: `${streak} Consecutive Days` },
        { label: 'Top Auteur', value: topDirector },
        { label: 'Cinema Archetype', value: personality },
      ],
      vibeTags: ['Auteur Visionary', 'IMAX Loyal', 'Letterboxd Elite'],
      footer: {
        branding: 'CineWrapped App',
        handle: `@${input.user.username}`,
        badgeText: 'Share Your Story',
      },
    },
  ];

  return {
    id: `presentation-wrap-${year}-${input.user.userId}`,
    type: 'ANNUAL_WRAP',
    title: `${year} Cinema Wrapped`,
    subtitle: `${input.user.displayName}'s Year in Review`,
    year,
    author: {
      userId: input.user.userId,
      displayName: input.user.displayName,
      username: input.user.username,
      avatarUrl: input.user.avatarUrl ?? null,
    },
    slides,
    defaultTheme: 'MIDNIGHT_GOLD',
    createdAt: new Date().toISOString(),
  };
}
