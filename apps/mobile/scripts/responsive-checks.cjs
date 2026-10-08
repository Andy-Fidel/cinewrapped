// Browser-only fixture checks: all remote traffic is intercepted; no account writes occur.
const fs = require('node:fs'),
  http = require('node:http'),
  path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');
const root = path.resolve(__dirname, '../../..'),
  dist = root + '/apps/mobile/dist',
  out =
    process.env.RESPONSIVE_OUTPUT_DIR ||
    require('node:os').tmpdir() + '/cinewrapped-responsive-results';
fs.mkdirSync(out, { recursive: true });
const userId = '10000000-0000-4000-8000-000000000001',
  mediaId = '20000000-0000-4000-8000-000000000001',
  wrapId = '30000000-0000-4000-8000-000000000001',
  now = new Date().toISOString();
const user = {
  id: userId,
  username: 'cinema_enthusiast_abcdefghijkl',
  displayName: 'A member with a deliberately long display name',
  avatarUrl: null,
  bio: 'A thoughtful movie enthusiast.',
  countryCode: 'GH',
  preferredLanguage: 'en-US',
  timezone: 'Africa/Accra',
  profileVisibility: 'PUBLIC',
  onboardingCompleted: true,
  recommendationOptIn: true,
  analyticsOptIn: false,
  version: 1,
  createdAt: now,
  updatedAt: now,
};
const genres = [
  { id: '18', name: 'Drama', slug: 'drama' },
  { id: '28', name: 'Action and Adventure', slug: 'action' },
];
const media = {
  id: mediaId,
  provider: 'TMDB',
  externalId: '1',
  mediaType: 'MOVIE',
  title: 'A Very Long Film Title About an Extraordinary Cinematic Journey',
  releaseYear: 2026,
  runtimeMinutes: 160,
  posterUrl: 'http://127.0.0.1:4179/poster.svg',
  backdropUrl: 'http://127.0.0.1:4179/poster.svg',
  overview:
    'A long descriptive synopsis with enough text to exercise wrapping on narrow screens. '.repeat(
      6,
    ),
  genreIds: ['18', '28'],
  averageProviderRating: 8.4,
};
const library = Array.from({ length: 12 }, (_, i) => ({
  media: {
    ...media,
    id: mediaId.slice(0, -2) + String(i + 1).padStart(2, '0'),
    title: media.title + ' ' + (i + 1),
  },
  status: 'WATCHING',
  startedAt: now,
  completedAt: null,
  progressPercent: 67,
  progressSeconds: 5000,
  watchCount: 1,
  lastWatchedAt: now,
  version: 1,
  inDefaultWatchlist: true,
  rating: {
    id: 'r',
    ratingValue: 4.5,
    ratingScale: 5,
    normalizedScore: 90,
    liked: true,
    emotionalTags: [],
    version: 1,
    updatedAt: now,
  },
  latestReview: null,
  updatedAt: now,
}));
const preferences = {
  preferredGenreIds: ['18'],
  dislikedGenreIds: [],
  preferredLanguages: ['en'],
  preferredCountries: ['GH'],
  preferredDecades: [2020],
  preferredRuntimeMin: 60,
  preferredRuntimeMax: 240,
  preferredRatingSystem: 'FIVE_STAR',
  contentTypes: ['MOVIE', 'TV'],
  spoilerPreference: 'HIDE',
  adultContentEnabled: false,
  notificationPreferences: {},
  theme: 'DARK',
  defaultCountryForStreaming: 'GH',
  autoplayTrailers: false,
  reduceMotion: true,
  mainstreamPreferencePercent: 50,
  streamingProviderIds: [],
  favoriteMediaIds: [],
};
const stats = {
  periodStart: '2026-01-01T00:00:00Z',
  periodEnd: '2027-01-01T00:00:00Z',
  timezone: 'Africa/Accra',
  uniqueTitles: 10000,
  viewingCount: 10000,
  totalMinutes: 25000000,
  totalHours: 416666.7,
  rewatchCount: 50,
  averageRatingPercent: 90,
  ratedTitleCount: 100,
  activeDays: 90,
  longestStreakDays: 28,
  movieViewings: 8000,
  tvViewings: 2000,
  topGenres: [{ id: '18', label: 'Drama', count: 8000 }],
  topTitles: [
    {
      mediaId,
      title: media.title,
      posterUrl: media.posterUrl,
      viewingCount: 28,
      minutesWatched: 10000,
    },
  ],
};
const wrap = {
  id: wrapId,
  wrapType: 'YEARLY',
  periodStart: stats.periodStart,
  periodEnd: stats.periodEnd,
  timezone: 'Africa/Accra',
  status: 'COMPLETED',
  inputVersion: 1,
  revision: 123,
  canRetry: false,
  headline: 'A deliberately long archive headline describing a year of cinema',
  generatedAt: now,
  statistics: stats,
  highlights: null,
  failureCode: null,
  storySlides: [
    {
      id: 'intro',
      kind: 'INTRO',
      eyebrow: 'YOUR YEARLY WRAP',
      title: 'Your entire cinematic year, ready to explore',
      body: media.overview,
      statValue: null,
      statLabel: null,
      accent: 'GOLD',
      media: null,
    },
    {
      id: 'total',
      kind: 'TOTALS',
      eyebrow: 'YOUR WATCH TIME',
      title: 'The full picture',
      body: media.overview,
      statValue: '25000000',
      statLabel: 'minutes watched',
      accent: 'TEAL',
      media: null,
    },
    {
      id: 'poster',
      kind: 'TOP_TITLE',
      eyebrow: 'MOST WATCHED TITLE',
      title: media.title,
      body: media.overview,
      statValue: null,
      statLabel: null,
      accent: 'CORAL',
      media: { id: mediaId, title: media.title, posterUrl: media.posterUrl },
    },
  ],
};
const days = Array.from({ length: 365 }, (_, i) => ({
  date: new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10),
  count: i % 3 === 0 ? 2 : 0,
  minutesWatched: i % 3 === 0 ? 240 : 0,
  level: i % 3 === 0 ? 2 : 0,
}));
const heatmap = {
  year: 2026,
  totalViewings: 244,
  totalMinutesWatched: 29280,
  activeDaysCount: 122,
  currentStreakDays: 2,
  longestStreakDays: 28,
  mostActiveWeekday: { name: 'Friday', index: 5, count: 40, percent: 16 },
  weekdayDistribution: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => ({
    day,
    fullDay: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][i],
    count: 30,
    percent: 14,
  })),
  circadianRhythm: {
    persona: 'Prime Evening Cinephile',
    peakHourLabel: '8:00 PM',
    morningPercent: 10,
    afternoonPercent: 20,
    eveningPercent: 60,
    nightPercent: 10,
  },
  days,
};
const event = {
  id: '40000000-0000-4000-8000-000000000001',
  media,
  eventType: 'WATCH_PLAN',
  status: 'SCHEDULED',
  title: 'A long upcoming viewing plan with friends and family',
  notes: media.overview,
  startsAt: new Date(Date.now() + 86400000).toISOString(),
  timezone: 'Africa/Accra',
  durationMinutes: 160,
  reminderMinutes: [60],
  version: 1,
  createdAt: now,
  updatedAt: now,
};
const featureKeys = [
  'AI_DISCOVERY_ADVANCED',
  'MOVIE_JOURNAL',
  'WATCH_PARTIES',
  'CLUB_INSIGHTS',
  'CALENDAR_HEATMAP',
  'CALENDAR_INTEGRATION',
  'DATA_IMPORT_EXPORT',
  'HOME_WIDGETS',
  'SOUNDTRACKS',
  'SCENE_IDENTIFICATION',
  'PREDICTION_LEAGUE',
];
function dataFor(p, q) {
  if (p === 'auth/bootstrap' || p === 'users/me') return user;
  if (p === 'users/me/preferences') return preferences;
  if (p === 'feature-flags')
    return {
      flags: Object.fromEntries(featureKeys.map((k) => [k, { enabled: true, source: 'DEFAULT' }])),
      fetchedAt: now,
    };
  if (p === 'notifications') return { items: [], unreadCount: 2, totalCount: 2 };
  if (p === 'recommendations/taste-profile')
    return {
      topGenres: [{ genreId: '18', name: 'Drama', affinity: 0.9 }],
      dislikedGenreIds: [],
      preferredLanguages: ['en'],
      preferredDecades: [2020],
      runtimeRange: { minimum: 60, maximum: 240 },
      mainstreamPreferencePercent: 50,
      signalCounts: { favorites: 100, ratings: 100, completedTitles: 100, feedbackEvents: 10 },
      confidence: 'HIGH',
      modelVersion: 'fixture',
      generatedAt: now,
    };
  if (p === 'recommendations')
    return library.slice(0, 8).map((l, i) => ({
      id: 'rec' + i,
      media: l.media,
      score: 0.95,
      recommendationType: 'PERSONALIZED',
      explanation: media.overview,
      reasonCodes: ['FAVORITE_GENRE'],
      modelVersion: 'fixture',
      generatedAt: now,
      expiresAt: now,
      feedback: [],
    }));
  if (p === 'statistics/summary')
    return {
      ...stats,
      periodStart: q.get('periodStart') || stats.periodStart,
      periodEnd: q.get('periodEnd') || stats.periodEnd,
    };
  if (p === 'statistics/heatmap') return heatmap;
  if (p === 'statistics/monthly')
    return Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      label: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][
        i
      ],
      viewingCount: 1000,
      totalMinutes: 100000,
      uniqueTitles: 100,
    }));
  if (p === 'statistics/taste')
    return {
      ...stats,
      sampleSize: 10000,
      genres: stats.topGenres,
      languages: [],
      decades: [],
      runtimeBuckets: [{ id: 'long', label: '180 minutes or longer', count: 1000 }],
    };
  if (p === 'ai/movie-dna')
    return {
      label: 'An eclectic explorer with a thoughtful cinematic personality',
      confidence: 'HIGH',
      sampleSize: 1000,
      traits: [
        {
          key: 'genre',
          label: 'Preferred genre',
          value: 'Thoughtful character-driven dramas',
          evidenceCount: 100,
          explanation: media.overview,
        },
      ],
      generatedAt: now,
      modelVersion: 'grounded-dna-v1',
      notice: 'Calculated from saved activity.',
    };
  if (p === 'wraps') return [wrap];
  if (p.startsWith('wraps/')) return wrap;
  if (p === 'gamification')
    return {
      totalPoints: 12345678,
      unlockedCount: 12,
      achievementCount: 24,
      achievements: [],
      challenges: [],
      streak: {
        currentDays: 2,
        longestDays: 28,
        lastActiveDate: '2026-10-08',
        timezone: 'Africa/Accra',
      },
      passport: {
        countriesVisited: 10,
        languagesExplored: 12,
        decadesExplored: 8,
        totalStamps: 30,
        stamps: [],
      },
    };
  if (p === 'leaderboards')
    return {
      metric: 'POINTS',
      visibilityNote: 'Fixture leaderboard',
      entries: [],
      viewerEntry: null,
    };
  if (p === 'library') return library;
  if (p === 'watchlists')
    return [
      {
        id: 'list-1',
        name: 'Your default watchlist with a long descriptive title',
        description: null,
        visibility: 'PRIVATE',
        isDefault: true,
        itemCount: 12,
        version: 1,
        createdAt: now,
        updatedAt: now,
      },
    ];
  if (p.startsWith('watchlists/'))
    return {
      id: 'list-1',
      name: 'Default list',
      isDefault: true,
      items: library.map((l, i) => ({
        id: 'wi' + i,
        position: i,
        note: null,
        createdAt: now,
        media: l.media,
      })),
    };
  if (p === 'calendar') return [event];
  if (p === 'genres') return genres;
  if (p === 'streaming-providers') return [];
  if (p === 'media/trending' || p === 'media/featured') return library.map((l) => l.media);
  if (p === 'search/trending') return [{ query: media.title, searchCount: 100 }];
  if (p === 'search')
    return {
      media: library.map((l) => l.media),
      users: [],
      people: [],
      lists: [],
      clubs: [],
      totalCount: 12,
    };
  if (/^media\/[^/]+$/.test(p))
    return {
      ...media,
      originalTitle: media.title,
      releaseDate: '2026-01-01',
      originalLanguage: 'en',
      countryCodes: ['GH'],
      trailerUrl: null,
      status: 'Released',
      ageRating: 'PG-13',
      genres,
      cast: [],
      crew: [],
      seasons: [],
      streamingAvailability: null,
      lastSyncedAt: now,
    };
  if (p.startsWith('library/media/') || p.endsWith('/tracking'))
    return { library: library[0], watchlists: [], rating: library[0].rating, latestReview: null };
  if (p === 'feed')
    return [
      {
        id: 'feed-1',
        actor: user,
        activityType: 'USER_WATCHED_MEDIA',
        media,
        visibility: 'PUBLIC',
        occurredAt: now,
        commentCount: 0,
        reactions: { counts: { LIKE: 10 }, mine: [] },
      },
    ];
  if (p === 'users/me/privacy')
    return {
      watchHistoryVisibility: 'PRIVATE',
      ratingsVisibility: 'PUBLIC',
      reviewsVisibility: 'PUBLIC',
      listsVisibility: 'PUBLIC',
      friendListVisibility: 'FRIENDS',
      wrapsVisibility: 'PRIVATE',
      onlineStatusVisibility: 'PRIVATE',
      leaderboardVisibility: 'PUBLIC',
      passportVisibility: 'PUBLIC',
      shareWatchActivity: true,
      shareRatingActivity: true,
      shareReviewActivity: true,
      shareListActivity: true,
      shareAchievementActivity: true,
    };
  if (p === 'auth/sessions')
    return [
      {
        id: 's',
        installationId: null,
        platform: 'WEB',
        deviceName: 'A long descriptive device name used to test session settings',
        lastSeenAt: now,
        expiresAt: now,
        current: true,
      },
    ];
  if (p.endsWith('/soundtracks') || p.startsWith('soundtracks/discover/'))
    return { albums: [], tracks: [], notice: 'No saved albums', source: 'APPLE_MUSIC' };
  return [];
}
const env = fs.readFileSync(root + '/.env', 'utf8');
const supabaseUrl = env.match(/^EXPO_PUBLIC_SUPABASE_URL=["']?([^\s"']+)/m)?.[1];
if (!supabaseUrl) throw Error('Missing public Supabase host');
const storageKey = 'sb-' + new URL(supabaseUrl).hostname.split('.')[0] + '-auth-token';
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/poster.svg') {
    res.setHeader('content-type', 'image/svg+xml');
    res.end(
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600"><rect width="400" height="600" fill="#172554"/><text x="30" y="300" fill="white" font-size="28">Fixture poster</text></svg>',
    );
    return;
  }
  let f = path.join(dist, decodeURIComponent(url.pathname));
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = dist + '/index.html';
  res.setHeader(
    'content-type',
    f.endsWith('.js')
      ? 'text/javascript'
      : f.endsWith('.ttf')
        ? 'font/ttf'
        : f.endsWith('.png')
          ? 'image/png'
          : f.endsWith('.json')
            ? 'application/json'
            : f.endsWith('.css')
              ? 'text/css'
              : 'text/html',
  );
  res.end(fs.readFileSync(f));
});
(async () => {
  await new Promise((r) => server.listen(4179, '127.0.0.1', r));
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 320, height: 568 },
    serviceWorkers: 'block',
  });
  const session = {
    access_token:
      Buffer.from('{"alg":"HS256"}').toString('base64url') +
      '.' +
      Buffer.from(
        JSON.stringify({
          sub: userId,
          aud: 'authenticated',
          exp: Math.floor(Date.now() / 1000) + 36000,
        }),
      ).toString('base64url') +
      '.fixture',
    refresh_token: 'fixture-only',
    token_type: 'bearer',
    expires_at: Math.floor(Date.now() / 1000) + 36000,
    expires_in: 36000,
    user: {
      id: userId,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'fixture@example.test',
      app_metadata: {},
      user_metadata: {},
      created_at: now,
    },
  };
  await context.addInitScript(
    ({ key, session }) => {
      localStorage.setItem(key, JSON.stringify(session));
    },
    { key: storageKey, session },
  );
  const requested = [];
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/api/v1/')) {
      const p = url.pathname.slice(8);
      requested.push(p);
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: dataFor(p, url.searchParams),
          meta: { requestId: 'fixture', page: { hasMore: false, nextCursor: null, limit: 30 } },
        }),
      });
    }
    if (url.origin === 'http://127.0.0.1:4179') return route.continue();
    if (url.hostname === new URL(supabaseUrl).hostname)
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(session.user) });
    return route.abort();
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const routes = (
    process.env.RESPONSIVE_ROUTES ||
    '/,/discover,/library,/social,/settings,/insights,/calendar,/media/' +
      mediaId +
      ',/wraps/' +
      wrapId +
      ',/settings/profile,/settings/preferences,/settings/privacy,/settings/security,/settings/notifications,/settings/legal,/journal,/clubs,/soundtracks'
  ).split(',');
  const matrix = JSON.parse(
    process.env.RESPONSIVE_MATRIX ||
      '[[280,653],[320,568],[390,844],[568,320],[768,1024],[1024,768],[1440,900],[2560,1440]]',
  );
  const results = [];
  for (const [width, height] of matrix) {
    await page.setViewportSize({ width, height });
    for (const pathname of routes) {
      errors.length = 0;
      if (!page.url().startsWith('http://127.0.0.1:4179/')) {
        await page.goto('http://127.0.0.1:4179/');
        await page.waitForTimeout(2000);
      }
      await page.goto('http://127.0.0.1:4179' + pathname);
      await page.waitForFunction(() => document.querySelector('[role="button"]'));
      await page
        .getByRole('progressbar', { name: 'CineWrapped is loading' })
        .waitFor({ state: 'hidden' });
      await page.waitForTimeout(200);
      const dismiss = page.getByRole('button', { name: 'Dismiss', exact: true });
      if (await dismiss.count()) await dismiss.click();
      const layout = await page.evaluate(() => {
        const clips = [];
        for (const e of document.querySelectorAll('[dir="auto"]')) {
          if (!e.textContent?.trim() || getComputedStyle(e).visibility === 'hidden') continue;
          const b = e.getBoundingClientRect();
          if (!b.width || !b.height) continue;
          let p = e.parentElement;
          let intentional = false;
          while (p && p !== document.body) {
            const s = getComputedStyle(p);
            if (['auto', 'scroll'].includes(s.overflowX)) {
              intentional = true;
              break;
            }
            p = p.parentElement;
          }
          if (intentional) continue;
          if ((b.left < -0.5 || b.right > innerWidth + 0.5) && clips.length < 10)
            clips.push({
              text: e.textContent.slice(0, 90),
              left: Math.round(b.left),
              right: Math.round(b.right),
            });
        }
        return {
          actualPath: location.pathname,
          viewportHeight: parseFloat(
            getComputedStyle(document.documentElement).getPropertyValue('--app-visible-height'),
          ),
          width: innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          clips,
          text: document.body.innerText.slice(0, 100),
        };
      });
      const result = { path: pathname, width, height, ...layout, errors: [...errors] };
      results.push(result);
      console.log(JSON.stringify(result));
      if (
        (pathname === '/' && width >= 1440) ||
        pathname.startsWith('/wraps/') ||
        errors.length ||
        layout.scrollWidth > width + 1 ||
        layout.clips.length
      )
        await page.screenshot({
          path:
            out + '/issue-' + width + 'x' + height + '-' + pathname.replace(/\W/g, '_') + '.png',
        });
      if (pathname === '/settings/security') {
        await page.getByRole('button', { name: 'Sign Out Other Devices', exact: true }).click();
        await page.getByRole('button', { name: 'Cancel', exact: true }).click();
      }
      if (pathname.startsWith('/wraps/')) {
        await page.getByRole('button', { name: 'Next slide', exact: true }).click();
        await page.getByRole('button', { name: 'Share presentation slide', exact: true }).click();
        await page.waitForTimeout(300);
        const close = page.getByRole('button', { name: 'Close export', exact: true });
        await close.click();
        await page.getByRole('button', { name: 'Previous slide', exact: true }).click();
      }
    }
  }
  fs.writeFileSync(out + '/results.json', JSON.stringify({ results, requested }, null, 2));
  await browser.close();
  await new Promise((r) => server.close(r));
  const failures = results.filter(
    (r) =>
      r.errors.length ||
      r.clips.length ||
      r.scrollWidth > r.width + 1 ||
      r.actualPath !== r.path ||
      Math.abs(r.viewportHeight - r.height) > 1,
  );
  console.log(JSON.stringify({ checks: results.length, failures: failures.length }));
  if (failures.length) process.exitCode = 1;
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
