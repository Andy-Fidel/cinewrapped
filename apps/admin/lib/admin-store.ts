export type AdminRole =
  | 'SUPER_ADMINISTRATOR'
  | 'CONTENT_MODERATOR'
  | 'COMMUNITY_MODERATOR'
  | 'SUPPORT_AGENT'
  | 'ANALYST';

export interface AdminUserSession {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  activeRole: AdminRole;
}

export interface AuditLogEntry {
  id: string;
  occurredAt: string;
  actorUserId: string;
  actorName: string;
  actorRole: AdminRole;
  action: string;
  targetType: string;
  targetId: string | null;
  targetLabel?: string;
  reason: string;
  metadataJson: Record<string, unknown>;
}

export interface ManagedUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl: string;
  role: AdminRole | 'USER';
  status: 'ACTIVE' | 'WARNED' | 'SUSPENDED' | 'BANNED';
  reputationScore: number;
  totalViewings: number;
  totalReviews: number;
  countryCode: string;
  joinedAt: string;
  lastActiveAt: string;
  suspensionReason?: string | null;
}

export interface ModerationReport {
  id: string;
  targetType: 'REVIEW' | 'COMMENT' | 'USER' | 'CLUB';
  targetId: string;
  targetTitle: string;
  targetSnippet: string;
  authorName: string;
  authorId: string;
  reporterName: string;
  reporterId: string;
  reason: 'SPOILER_UNMARKED' | 'HARASSMENT' | 'HATE_SPEECH' | 'SPAM' | 'EXPLICIT_CONTENT' | 'COPYRIGHT';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
}

export interface ManagedReview {
  id: string;
  mediaId: string;
  mediaTitle: string;
  posterUrl: string;
  authorId: string;
  authorUsername: string;
  authorAvatar: string;
  ratingValue: number | null;
  body: string;
  containsSpoilers: boolean;
  isHidden: boolean;
  flagCount: number;
  likeCount: number;
  createdAt: string;
}

export interface ManagedComment {
  id: string;
  threadType: 'REVIEW' | 'CLUB_POST' | 'ACTIVITY';
  threadTitle: string;
  authorId: string;
  authorUsername: string;
  authorAvatar: string;
  content: string;
  isFlagged: boolean;
  isHidden: boolean;
  isPinned: boolean;
  likeCount: number;
  createdAt: string;
}

export interface ManagedClub {
  id: string;
  name: string;
  slug: string;
  description: string;
  coverImageUrl: string;
  privacy: 'PUBLIC' | 'PRIVATE' | 'SECRET';
  ownerUsername: string;
  ownerId: string;
  memberCount: number;
  discussionCount: number;
  status: 'ACTIVE' | 'FROZEN' | 'DISBANDED';
  isOfficial: boolean;
  createdAt: string;
}

export interface ManagedAchievement {
  id: string;
  code: string;
  title: string;
  description: string;
  iconUrl: string;
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  points: number;
  unlockedCount: number;
  isActive: boolean;
  criteriaDescription: string;
}

export interface ManagedChallenge {
  id: string;
  title: string;
  subtitle: string;
  coverImageUrl: string;
  targetCount: number;
  category: 'GENRE' | 'DIRECTOR' | 'SEASONAL' | 'RUNTIME';
  startDate: string;
  endDate: string;
  participantCount: number;
  completionCount: number;
  status: 'ACTIVE' | 'UPCOMING' | 'COMPLETED';
}

export interface FeaturedList {
  id: string;
  title: string;
  description: string;
  curatorName: string;
  itemCount: number;
  shelfLocation: 'HOME_HERO' | 'DISCOVER_TRENDING' | 'WEEKLY_SPOTLIGHT';
  isPublished: boolean;
  viewCount: number;
  updatedAt: string;
}

export interface CuratedCollection {
  id: string;
  title: string;
  theme: string;
  description: string;
  backdropUrl: string;
  movieCount: number;
  isFeatured: boolean;
  publishedAt: string;
}

export interface NotificationCampaign {
  id: string;
  title: string;
  body: string;
  segment: 'ALL_USERS' | 'PRO_CINEPHILES' | 'INACTIVE_30D' | 'CLUB_CREATORS';
  channel: 'PUSH_AND_IN_APP' | 'PUSH_ONLY' | 'IN_APP_BANNER';
  status: 'DRAFT' | 'SCHEDULED' | 'SENT';
  scheduledFor?: string | null;
  sentAt?: string | null;
  deliveredCount: number;
  openRatePercent: number;
}

export interface ProviderHealth {
  id: string;
  name: string;
  category: 'METADATA' | 'STREAMING_AVAILABILITY' | 'SOUNDTRACKS' | 'AI_VISION';
  status: 'OPERATIONAL' | 'DEGRADED' | 'OUTAGE';
  latencyMs: number;
  errorRate24h: number;
  lastSyncedAt: string;
  dailyApiQuotaUsedPercent: number;
  endpointUrl: string;
}

export interface BackgroundJobQueue {
  id: string;
  queueName: string;
  description: string;
  activeCount: number;
  waitingCount: number;
  completed24h: number;
  failed24h: number;
  avgDurationMs: number;
  status: 'RUNNING' | 'PAUSED' | 'CONGESTED';
}

export interface FeatureFlagConfig {
  key: string;
  name: string;
  description: string;
  isEnabled: boolean;
  rolloutPercentage: number;
  allowedRoles: AdminRole[];
  updatedAt: string;
  updatedBy: string;
}

// Initial Mock Datasets
const INITIAL_USERS: ManagedUser[] = [
  {
    id: 'usr-1',
    username: 'alex_cinema',
    displayName: 'Alex Rivers',
    email: 'alex.rivers@cinewrapped.app',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    role: 'SUPER_ADMINISTRATOR',
    status: 'ACTIVE',
    reputationScore: 98,
    totalViewings: 412,
    totalReviews: 86,
    countryCode: 'US',
    joinedAt: '2025-01-15T10:00:00Z',
    lastActiveAt: '2026-08-19T18:30:00Z',
  },
  {
    id: 'usr-2',
    username: 'sophia_film',
    displayName: 'Sophia Nolan',
    email: 'sophia@cinewrapped.app',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    role: 'CONTENT_MODERATOR',
    status: 'ACTIVE',
    reputationScore: 94,
    totalViewings: 320,
    totalReviews: 64,
    countryCode: 'GB',
    joinedAt: '2025-03-02T12:00:00Z',
    lastActiveAt: '2026-08-19T17:15:00Z',
  },
  {
    id: 'usr-3',
    username: 'marcus_vibe',
    displayName: 'Marcus Sterling',
    email: 'marcus@cinewrapped.app',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    role: 'COMMUNITY_MODERATOR',
    status: 'ACTIVE',
    reputationScore: 91,
    totalViewings: 275,
    totalReviews: 45,
    countryCode: 'CA',
    joinedAt: '2025-04-10T09:00:00Z',
    lastActiveAt: '2026-08-19T16:40:00Z',
  },
  {
    id: 'usr-4',
    username: 'troll_bot99',
    displayName: 'Movie Critic 99',
    email: 'suspicious@fakeemail.com',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    role: 'USER',
    status: 'WARNED',
    reputationScore: 28,
    totalViewings: 12,
    totalReviews: 8,
    countryCode: 'US',
    joinedAt: '2026-07-01T14:20:00Z',
    lastActiveAt: '2026-08-19T11:00:00Z',
    suspensionReason: 'Flagged repeatedly for unmarked ending spoilers in Oppenheimer reviews.',
  },
  {
    id: 'usr-5',
    username: 'elena_rodriguez',
    displayName: 'Elena Rodriguez',
    email: 'elena.cinephile@domain.com',
    avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150',
    role: 'USER',
    status: 'ACTIVE',
    reputationScore: 89,
    totalViewings: 195,
    totalReviews: 32,
    countryCode: 'ES',
    joinedAt: '2025-08-14T08:00:00Z',
    lastActiveAt: '2026-08-19T15:10:00Z',
  },
  {
    id: 'usr-6',
    username: 'spammer_crypto',
    displayName: 'Free Movie Pass',
    email: 'spammer12@botnet.xyz',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    role: 'USER',
    status: 'BANNED',
    reputationScore: 0,
    totalViewings: 0,
    totalReviews: 19,
    countryCode: 'RU',
    joinedAt: '2026-08-10T02:00:00Z',
    lastActiveAt: '2026-08-11T04:12:00Z',
    suspensionReason: 'Automated phishing link distribution in comment sections.',
  },
];

const INITIAL_REPORTS: ModerationReport[] = [
  {
    id: 'rep-101',
    targetType: 'REVIEW',
    targetId: 'rev-201',
    targetTitle: 'Dune: Part Two Review by troll_bot99',
    targetSnippet: 'At the end of the film, Paul does this unexpected duel and completely destroys...',
    authorName: 'troll_bot99',
    authorId: 'usr-4',
    reporterName: 'elena_rodriguez',
    reporterId: 'usr-5',
    reason: 'SPOILER_UNMARKED',
    severity: 'HIGH',
    status: 'PENDING',
    createdAt: '2026-08-19T16:20:00Z',
  },
  {
    id: 'rep-102',
    targetType: 'COMMENT',
    targetId: 'com-301',
    targetTitle: 'Comment in A24 Fanatics Club',
    targetSnippet: 'Anyone who likes this movie is completely clueless and has zero taste in cinema!',
    authorName: 'spammer_crypto',
    authorId: 'usr-6',
    reporterName: 'marcus_vibe',
    reporterId: 'usr-3',
    reason: 'HARASSMENT',
    severity: 'MEDIUM',
    status: 'PENDING',
    createdAt: '2026-08-19T15:45:00Z',
  },
  {
    id: 'rep-103',
    targetType: 'CLUB',
    targetId: 'club-401',
    targetTitle: 'Piracy Cinema Hub',
    targetSnippet: 'Free streaming links and torrent downloads for all 2026 theatrical releases.',
    authorName: 'spammer_crypto',
    authorId: 'usr-6',
    reporterName: 'sophia_film',
    reporterId: 'usr-2',
    reason: 'COPYRIGHT',
    severity: 'HIGH',
    status: 'PENDING',
    createdAt: '2026-08-19T14:10:00Z',
  },
  {
    id: 'rep-104',
    targetType: 'USER',
    targetId: 'usr-4',
    targetTitle: 'Profile bio for troll_bot99',
    targetSnippet: 'Spoiling movies for everyone since 2024!',
    authorName: 'troll_bot99',
    authorId: 'usr-4',
    reporterName: 'alex_cinema',
    reporterId: 'usr-1',
    reason: 'SPAM',
    severity: 'LOW',
    status: 'RESOLVED',
    createdAt: '2026-08-18T10:00:00Z',
    resolvedAt: '2026-08-18T11:00:00Z',
    resolvedBy: 'Sophia Nolan',
  },
];

const INITIAL_REVIEWS: ManagedReview[] = [
  {
    id: 'rev-201',
    mediaId: 'm-dune2',
    mediaTitle: 'Dune: Part Two',
    posterUrl: 'https://image.tmdb.org/t/p/w500/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg',
    authorId: 'usr-4',
    authorUsername: 'troll_bot99',
    authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    ratingValue: 1.5,
    body: 'At the end of the film, Paul does this unexpected duel and completely destroys the emperor...',
    containsSpoilers: false,
    isHidden: false,
    flagCount: 4,
    likeCount: 2,
    createdAt: '2026-08-19T14:30:00Z',
  },
  {
    id: 'rev-202',
    mediaId: 'm-oppenheimer',
    mediaTitle: 'Oppenheimer',
    posterUrl: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
    authorId: 'usr-5',
    authorUsername: 'elena_rodriguez',
    authorAvatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150',
    ratingValue: 5.0,
    body: 'A monumental biographical thriller with sound design that rattles the chest. Cillian Murphy delivers a career-defining turn.',
    containsSpoilers: false,
    isHidden: false,
    flagCount: 0,
    likeCount: 48,
    createdAt: '2026-08-18T20:15:00Z',
  },
  {
    id: 'rev-203',
    mediaId: 'm-pastlives',
    mediaTitle: 'Past Lives',
    posterUrl: 'https://image.tmdb.org/t/p/w500/k3waqVXSnvCZWfJYNtdamTgTtTA.jpg',
    authorId: 'usr-2',
    authorUsername: 'sophia_film',
    authorAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    ratingValue: 4.5,
    body: 'Celine Song weaves an astonishingly quiet, devastating study of In-Yun, diaspora longing, and the parallel lives we leave behind.',
    containsSpoilers: false,
    isHidden: false,
    flagCount: 0,
    likeCount: 62,
    createdAt: '2026-08-17T19:00:00Z',
  },
];

const INITIAL_COMMENTS: ManagedComment[] = [
  {
    id: 'com-301',
    threadType: 'CLUB_POST',
    threadTitle: 'A24 Fanatics Discussion',
    authorId: 'usr-6',
    authorUsername: 'spammer_crypto',
    authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    content: 'Anyone who likes this movie is completely clueless and has zero taste in cinema!',
    isFlagged: true,
    isHidden: false,
    isPinned: false,
    likeCount: 0,
    createdAt: '2026-08-19T15:40:00Z',
  },
  {
    id: 'com-302',
    threadType: 'REVIEW',
    threadTitle: 'Oppenheimer Review Thread',
    authorId: 'usr-3',
    authorUsername: 'marcus_vibe',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    content: 'The 70mm IMAX sequence during Trinity was absolutely breathtaking. Complete silence in our theater.',
    isFlagged: false,
    isHidden: false,
    isPinned: true,
    likeCount: 29,
    createdAt: '2026-08-18T21:00:00Z',
  },
];

const INITIAL_CLUBS: ManagedClub[] = [
  {
    id: 'club-401',
    name: 'A24 Film Society',
    slug: 'a24-film-society',
    description: 'A sanctuary for lovers of avant-garde, indie cinema and visionary auteur directors.',
    coverImageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600',
    privacy: 'PUBLIC',
    ownerUsername: 'sophia_film',
    ownerId: 'usr-2',
    memberCount: 1420,
    discussionCount: 380,
    status: 'ACTIVE',
    isOfficial: true,
    createdAt: '2025-05-10T12:00:00Z',
  },
  {
    id: 'club-402',
    name: 'Midnight Horror Club',
    slug: 'midnight-horror-club',
    description: 'Psychological terror, body horror, cosmic dread, and cult classics screened after dark.',
    coverImageUrl: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=600',
    privacy: 'PUBLIC',
    ownerUsername: 'marcus_vibe',
    ownerId: 'usr-3',
    memberCount: 890,
    discussionCount: 195,
    status: 'ACTIVE',
    isOfficial: false,
    createdAt: '2025-06-20T18:00:00Z',
  },
  {
    id: 'club-403',
    name: 'Criterion 4K Collectors',
    slug: 'criterion-4k-collectors',
    description: 'Restoration quality, packaging reviews, supplements, and physical disc collectors lounge.',
    coverImageUrl: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=600',
    privacy: 'PUBLIC',
    ownerUsername: 'alex_cinema',
    ownerId: 'usr-1',
    memberCount: 650,
    discussionCount: 140,
    status: 'ACTIVE',
    isOfficial: true,
    createdAt: '2025-07-04T10:00:00Z',
  },
];

const INITIAL_ACHIEVEMENTS: ManagedAchievement[] = [
  {
    id: 'ach-1',
    code: 'CENTURION',
    title: 'Cinema Centurion',
    description: 'Log 100 films in a single calendar year.',
    iconUrl: '💯',
    tier: 'GOLD',
    points: 100,
    unlockedCount: 342,
    isActive: true,
    criteriaDescription: 'User viewing log count >= 100 within current year',
  },
  {
    id: 'ach-2',
    code: 'DIRECTOR_DEEP_DIVE',
    title: 'Auteur Devotee',
    description: 'Complete 5 filmographies of featured directors.',
    iconUrl: '🎬',
    tier: 'PLATINUM',
    points: 250,
    unlockedCount: 88,
    isActive: true,
    criteriaDescription: 'Complete all catalog titles for 5 distinct directors',
  },
  {
    id: 'ach-3',
    code: 'MIDNIGHT_WATCHER',
    title: 'Night Owl Screening',
    description: 'Log 10 movies between 1:00 AM and 5:00 AM.',
    iconUrl: '🌙',
    tier: 'SILVER',
    points: 50,
    unlockedCount: 810,
    isActive: true,
    criteriaDescription: '10 screenings logged with local start time between 01:00 and 05:00',
  },
];

const INITIAL_CHALLENGES: ManagedChallenge[] = [
  {
    id: 'ch-1',
    title: 'Noir August 2026',
    subtitle: 'Dive deep into shadows, private eyes, and smoky jazz bars.',
    coverImageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600',
    targetCount: 8,
    category: 'GENRE',
    startDate: '2026-08-01T00:00:00Z',
    endDate: '2026-08-31T23:59:59Z',
    participantCount: 2450,
    completionCount: 680,
    status: 'ACTIVE',
  },
  {
    id: 'ch-2',
    title: 'Spooky Season 31 for 31',
    subtitle: '31 horror movies across the 31 days of October.',
    coverImageUrl: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=600',
    targetCount: 31,
    category: 'SEASONAL',
    startDate: '2026-10-01T00:00:00Z',
    endDate: '2026-10-31T23:59:59Z',
    participantCount: 4200,
    completionCount: 0,
    status: 'UPCOMING',
  },
];

const INITIAL_FEATURED_LISTS: FeaturedList[] = [
  {
    id: 'list-1',
    title: 'Essential Neo-Noir Masterworks',
    description: 'From Chinatown and Blade Runner to Drive and Decision to Leave.',
    curatorName: 'CineWrapped Editorial',
    itemCount: 25,
    shelfLocation: 'HOME_HERO',
    isPublished: true,
    viewCount: 18450,
    updatedAt: '2026-08-15T12:00:00Z',
  },
  {
    id: 'list-2',
    title: 'Palme d’Or Champions of the 21st Century',
    description: 'Every Cannes top prize winner ranked and curated with deep context.',
    curatorName: 'Sophia Nolan',
    itemCount: 24,
    shelfLocation: 'DISCOVER_TRENDING',
    isPublished: true,
    viewCount: 12900,
    updatedAt: '2026-08-10T14:30:00Z',
  },
];

const INITIAL_COLLECTIONS: CuratedCollection[] = [
  {
    id: 'col-1',
    title: 'The A24 Vault',
    theme: 'Contemporary Auteur',
    description: 'Uncompromising independent storytelling that redefined modern cinema aesthetics.',
    backdropUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800',
    movieCount: 42,
    isFeatured: true,
    publishedAt: '2025-11-20T00:00:00Z',
  },
  {
    id: 'col-2',
    title: 'Cyberpunk & Dystopian Futures',
    theme: 'Sci-Fi / Cyberpunk',
    description: 'High tech, low life: Neon metropolis nightmares and AI existentialism.',
    backdropUrl: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=800',
    movieCount: 30,
    isFeatured: true,
    publishedAt: '2026-01-05T00:00:00Z',
  },
];

const INITIAL_CAMPAIGNS: NotificationCampaign[] = [
  {
    id: 'camp-1',
    title: '🏆 Your CineWrapped Mid-Year Recap is Ready!',
    body: 'Discover your top genres, peak screening nights, and cinema persona for the first half of 2026.',
    segment: 'ALL_USERS',
    channel: 'PUSH_AND_IN_APP',
    status: 'SENT',
    sentAt: '2026-07-01T15:00:00Z',
    deliveredCount: 48920,
    openRatePercent: 41.6,
  },
  {
    id: 'camp-2',
    title: '🍿 Spooky Season 31 for 31 Challenge Early Signups Open',
    body: 'Lock in your horror marathon watchlist and earn the exclusive Blood Moon badge.',
    segment: 'PRO_CINEPHILES',
    channel: 'PUSH_ONLY',
    status: 'SCHEDULED',
    scheduledFor: '2026-09-15T18:00:00Z',
    deliveredCount: 0,
    openRatePercent: 0,
  },
];

const INITIAL_PROVIDERS: ProviderHealth[] = [
  {
    id: 'prov-1',
    name: 'The Movie Database (TMDB API v3/v4)',
    category: 'METADATA',
    status: 'OPERATIONAL',
    latencyMs: 142,
    errorRate24h: 0.02,
    lastSyncedAt: '2026-08-19T18:45:00Z',
    dailyApiQuotaUsedPercent: 62.4,
    endpointUrl: 'https://api.themoviedb.org/3',
  },
  {
    id: 'prov-2',
    name: 'JustWatch Streaming Availability Engine',
    category: 'STREAMING_AVAILABILITY',
    status: 'OPERATIONAL',
    latencyMs: 210,
    errorRate24h: 0.08,
    lastSyncedAt: '2026-08-19T18:30:00Z',
    dailyApiQuotaUsedPercent: 78.1,
    endpointUrl: 'https://apis.justwatch.com/content',
  },
  {
    id: 'prov-3',
    name: 'Apple Music Soundtrack Matcher',
    category: 'SOUNDTRACKS',
    status: 'OPERATIONAL',
    latencyMs: 185,
    errorRate24h: 0.04,
    lastSyncedAt: '2026-08-19T17:50:00Z',
    dailyApiQuotaUsedPercent: 34.0,
    endpointUrl: 'https://api.music.apple.com/v1',
  },
  {
    id: 'prov-4',
    name: 'OpenAI GPT-4o Vision Scene Radar',
    category: 'AI_VISION',
    status: 'OPERATIONAL',
    latencyMs: 820,
    errorRate24h: 0.12,
    lastSyncedAt: '2026-08-19T18:15:00Z',
    dailyApiQuotaUsedPercent: 51.5,
    endpointUrl: 'https://api.openai.com/v1/chat/completions',
  },
];

const INITIAL_JOBS: BackgroundJobQueue[] = [
  {
    id: 'job-1',
    queueName: 'recommendation-refresher',
    description: 'Nightly re-computation of high-dimensional vector embeddings and personalized radar shelves.',
    activeCount: 14,
    waitingCount: 42,
    completed24h: 38900,
    failed24h: 6,
    avgDurationMs: 450,
    status: 'RUNNING',
  },
  {
    id: 'job-2',
    queueName: 'scene-radar-indexer',
    description: 'Processes uploaded screenshots, performs OCR/vector matching, and annotates timestamps.',
    activeCount: 2,
    waitingCount: 5,
    completed24h: 1240,
    failed24h: 2,
    avgDurationMs: 1200,
    status: 'RUNNING',
  },
  {
    id: 'job-3',
    queueName: 'notification-digest-dispatcher',
    description: 'Batches weekly activity summaries, club discussion digests, and release countdown alerts.',
    activeCount: 0,
    waitingCount: 0,
    completed24h: 52000,
    failed24h: 0,
    avgDurationMs: 80,
    status: 'RUNNING',
  },
];

const INITIAL_FLAGS: FeatureFlagConfig[] = [
  {
    key: 'CALENDAR_INTEGRATION',
    name: 'Calendar & Movie Night Scheduling',
    description: 'Enables 1-tap Google Calendar & Apple/iOS Calendar sync, RFC-5545 .ics exports, and screening countdowns.',
    isEnabled: true,
    rolloutPercentage: 100,
    allowedRoles: ['SUPER_ADMINISTRATOR', 'CONTENT_MODERATOR', 'COMMUNITY_MODERATOR', 'SUPPORT_AGENT', 'ANALYST'],
    updatedAt: '2026-08-19T18:00:00Z',
    updatedBy: 'Alex Rivers',
  },
  {
    key: 'MOVIE_JOURNAL',
    name: 'Private Cinema Journaling',
    description: 'Rich journal logs with theater viewing formats, favorite quotes, and cinema vibe tags.',
    isEnabled: true,
    rolloutPercentage: 100,
    allowedRoles: ['SUPER_ADMINISTRATOR', 'CONTENT_MODERATOR', 'COMMUNITY_MODERATOR', 'SUPPORT_AGENT', 'ANALYST'],
    updatedAt: '2026-08-18T10:00:00Z',
    updatedBy: 'Alex Rivers',
  },
  {
    key: 'SOUNDTRACKS',
    name: 'Apple Music Soundtrack Explorer',
    description: 'Displays official score soundtracks, tracklists, and 30s audio previews on movie detail pages.',
    isEnabled: true,
    rolloutPercentage: 100,
    allowedRoles: ['SUPER_ADMINISTRATOR', 'CONTENT_MODERATOR', 'COMMUNITY_MODERATOR', 'SUPPORT_AGENT', 'ANALYST'],
    updatedAt: '2026-08-17T12:00:00Z',
    updatedBy: 'Sophia Nolan',
  },
  {
    key: 'AI_SCENE_RADAR',
    name: 'AI Scene Identification Radar',
    description: 'Upload screenshots to automatically identify exact film titles and timestamp positions.',
    isEnabled: true,
    rolloutPercentage: 80,
    allowedRoles: ['SUPER_ADMINISTRATOR', 'CONTENT_MODERATOR'],
    updatedAt: '2026-08-19T14:00:00Z',
    updatedBy: 'Alex Rivers',
  },
  {
    key: 'COMMUNITY_CLUBS',
    name: 'Cinema Community Clubs',
    description: 'Allows cinephiles to create public and private film clubs with member discussions.',
    isEnabled: true,
    rolloutPercentage: 100,
    allowedRoles: ['SUPER_ADMINISTRATOR', 'CONTENT_MODERATOR', 'COMMUNITY_MODERATOR'],
    updatedAt: '2026-08-16T15:00:00Z',
    updatedBy: 'Marcus Sterling',
  },
];

const INITIAL_AUDITS: AuditLogEntry[] = [
  {
    id: 'aud-1',
    occurredAt: '2026-08-19T18:32:10Z',
    actorUserId: 'usr-1',
    actorName: 'Alex Rivers',
    actorRole: 'SUPER_ADMINISTRATOR',
    action: 'FLAG_UPDATED',
    targetType: 'FEATURE_FLAG',
    targetId: 'CALENDAR_INTEGRATION',
    targetLabel: 'Calendar & Movie Night Scheduling',
    reason: 'Enabled 100% rollout for global production launch.',
    metadataJson: { previousRollout: 50, newRollout: 100 },
  },
  {
    id: 'aud-2',
    occurredAt: '2026-08-19T17:15:40Z',
    actorUserId: 'usr-2',
    actorName: 'Sophia Nolan',
    actorRole: 'CONTENT_MODERATOR',
    action: 'REVIEW_SPOILER_FLAGGED',
    targetType: 'REVIEW',
    targetId: 'rev-201',
    targetLabel: 'Dune: Part Two Review by troll_bot99',
    reason: 'Review revealed climactic ending duel without spoiler tag.',
    metadataJson: { containsSpoilers: true },
  },
  {
    id: 'aud-3',
    occurredAt: '2026-08-19T16:05:22Z',
    actorUserId: 'usr-3',
    actorName: 'Marcus Sterling',
    actorRole: 'COMMUNITY_MODERATOR',
    action: 'USER_WARNED',
    targetType: 'USER',
    targetId: 'usr-4',
    targetLabel: 'troll_bot99',
    reason: 'Repeatedly posting unmarked spoilers despite initial warning.',
    metadataJson: { previousStatus: 'ACTIVE', newStatus: 'WARNED' },
  },
  {
    id: 'aud-4',
    occurredAt: '2026-08-19T14:40:15Z',
    actorUserId: 'usr-1',
    actorName: 'Alex Rivers',
    actorRole: 'SUPER_ADMINISTRATOR',
    action: 'USER_BANNED',
    targetType: 'USER',
    targetId: 'usr-6',
    targetLabel: 'spammer_crypto',
    reason: 'Distributing phishing URLs and spamming club discussions.',
    metadataJson: { previousStatus: 'ACTIVE', newStatus: 'BANNED' },
  },
];

// In-Memory Persistent Store for Admin Application
class AdminStore {
  public users: ManagedUser[] = [...INITIAL_USERS];
  public reports: ModerationReport[] = [...INITIAL_REPORTS];
  public reviews: ManagedReview[] = [...INITIAL_REVIEWS];
  public comments: ManagedComment[] = [...INITIAL_COMMENTS];
  public clubs: ManagedClub[] = [...INITIAL_CLUBS];
  public achievements: ManagedAchievement[] = [...INITIAL_ACHIEVEMENTS];
  public challenges: ManagedChallenge[] = [...INITIAL_CHALLENGES];
  public featuredLists: FeaturedList[] = [...INITIAL_FEATURED_LISTS];
  public collections: CuratedCollection[] = [...INITIAL_COLLECTIONS];
  public campaigns: NotificationCampaign[] = [...INITIAL_CAMPAIGNS];
  public providers: ProviderHealth[] = [...INITIAL_PROVIDERS];
  public jobs: BackgroundJobQueue[] = [...INITIAL_JOBS];
  public flags: FeatureFlagConfig[] = [...INITIAL_FLAGS];
  public audits: AuditLogEntry[] = [...INITIAL_AUDITS];

  private logAudit(
    actor: AdminUserSession,
    action: string,
    targetType: string,
    targetId: string | null,
    targetLabel: string,
    reason: string,
    metadataJson: Record<string, unknown> = {},
  ) {
    const entry: AuditLogEntry = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      occurredAt: new Date().toISOString(),
      actorUserId: actor.id,
      actorName: actor.name,
      actorRole: actor.activeRole,
      action,
      targetType,
      targetId,
      targetLabel,
      reason: reason || 'Administrative action executed via CineWrapped Admin Portal',
      metadataJson,
    };
    this.audits.unshift(entry);
    return entry;
  }

  // User Actions
  public updateUserStatus(
    actor: AdminUserSession,
    userId: string,
    status: ManagedUser['status'],
    reason: string,
  ) {
    const user = this.users.find((u) => u.id === userId);
    if (!user) throw new Error('User not found');
    const prevStatus = user.status;
    user.status = status;
    if (reason) user.suspensionReason = reason;
    this.logAudit(
      actor,
      `USER_STATUS_${status}`,
      'USER',
      userId,
      user.username,
      reason,
      { prevStatus, newStatus: status },
    );
    return user;
  }

  public updateUserRole(
    actor: AdminUserSession,
    userId: string,
    role: ManagedUser['role'],
    reason: string,
  ) {
    const user = this.users.find((u) => u.id === userId);
    if (!user) throw new Error('User not found');
    const prevRole = user.role;
    user.role = role;
    this.logAudit(
      actor,
      'USER_ROLE_ASSIGNED',
      'USER',
      userId,
      user.username,
      reason,
      { prevRole, newRole: role },
    );
    return user;
  }

  // Moderation Reports
  public resolveReport(
    actor: AdminUserSession,
    reportId: string,
    action: 'RESOLVED' | 'DISMISSED',
    reason: string,
  ) {
    const report = this.reports.find((r) => r.id === reportId);
    if (!report) throw new Error('Report not found');
    report.status = action;
    report.resolvedAt = new Date().toISOString();
    report.resolvedBy = actor.name;
    this.logAudit(
      actor,
      `REPORT_${action}`,
      'MODERATION_REPORT',
      reportId,
      report.targetTitle,
      reason,
      { previousStatus: 'PENDING', newStatus: action, targetType: report.targetType },
    );
    return report;
  }

  // Reviews Moderation
  public toggleReviewSpoiler(actor: AdminUserSession, reviewId: string, reason: string) {
    const review = this.reviews.find((r) => r.id === reviewId);
    if (!review) throw new Error('Review not found');
    review.containsSpoilers = !review.containsSpoilers;
    this.logAudit(
      actor,
      'REVIEW_SPOILER_TOGGLED',
      'REVIEW',
      reviewId,
      `${review.mediaTitle} review by ${review.authorUsername}`,
      reason,
      { containsSpoilers: review.containsSpoilers },
    );
    return review;
  }

  public toggleReviewVisibility(actor: AdminUserSession, reviewId: string, reason: string) {
    const review = this.reviews.find((r) => r.id === reviewId);
    if (!review) throw new Error('Review not found');
    review.isHidden = !review.isHidden;
    this.logAudit(
      actor,
      review.isHidden ? 'REVIEW_HIDDEN' : 'REVIEW_RESTORED',
      'REVIEW',
      reviewId,
      `${review.mediaTitle} review by ${review.authorUsername}`,
      reason,
      { isHidden: review.isHidden },
    );
    return review;
  }

  public deleteReview(actor: AdminUserSession, reviewId: string, reason: string) {
    const idx = this.reviews.findIndex((r) => r.id === reviewId);
    if (idx === -1) throw new Error('Review not found');
    const [deleted] = this.reviews.splice(idx, 1);
    if (!deleted) throw new Error('Review could not be deleted');
    this.logAudit(
      actor,
      'REVIEW_DELETED',
      'REVIEW',
      reviewId,
      `${deleted.mediaTitle} review by ${deleted.authorUsername}`,
      reason,
      { deletedAuthor: deleted.authorUsername, mediaId: deleted.mediaId },
    );
    return deleted;
  }

  // Comments Moderation
  public toggleCommentVisibility(actor: AdminUserSession, commentId: string, reason: string) {
    const comment = this.comments.find((c) => c.id === commentId);
    if (!comment) throw new Error('Comment not found');
    comment.isHidden = !comment.isHidden;
    this.logAudit(
      actor,
      comment.isHidden ? 'COMMENT_HIDDEN' : 'COMMENT_RESTORED',
      'COMMENT',
      commentId,
      `Comment by ${comment.authorUsername}`,
      reason,
      { isHidden: comment.isHidden },
    );
    return comment;
  }

  public toggleCommentPin(actor: AdminUserSession, commentId: string, reason: string) {
    const comment = this.comments.find((c) => c.id === commentId);
    if (!comment) throw new Error('Comment not found');
    comment.isPinned = !comment.isPinned;
    this.logAudit(
      actor,
      comment.isPinned ? 'COMMENT_PINNED' : 'COMMENT_UNPINNED',
      'COMMENT',
      commentId,
      `Comment by ${comment.authorUsername}`,
      reason,
      { isPinned: comment.isPinned },
    );
    return comment;
  }

  public deleteComment(actor: AdminUserSession, commentId: string, reason: string) {
    const idx = this.comments.findIndex((c) => c.id === commentId);
    if (idx === -1) throw new Error('Comment not found');
    const [deleted] = this.comments.splice(idx, 1);
    if (!deleted) throw new Error('Comment could not be deleted');
    this.logAudit(
      actor,
      'COMMENT_DELETED',
      'COMMENT',
      commentId,
      `Comment by ${deleted.authorUsername}`,
      reason,
      { deletedAuthor: deleted.authorUsername },
    );
    return deleted;
  }

  // Club Moderation
  public updateClubStatus(
    actor: AdminUserSession,
    clubId: string,
    status: ManagedClub['status'],
    reason: string,
  ) {
    const club = this.clubs.find((c) => c.id === clubId);
    if (!club) throw new Error('Club not found');
    const prevStatus = club.status;
    club.status = status;
    this.logAudit(
      actor,
      `CLUB_STATUS_${status}`,
      'CLUB',
      clubId,
      club.name,
      reason,
      { prevStatus, newStatus: status },
    );
    return club;
  }

  // Achievements
  public addAchievement(actor: AdminUserSession, payload: Omit<ManagedAchievement, 'id' | 'unlockedCount'>, reason: string) {
    const ach: ManagedAchievement = {
      ...payload,
      id: `ach-${Date.now()}`,
      unlockedCount: 0,
    };
    this.achievements.push(ach);
    this.logAudit(
      actor,
      'ACHIEVEMENT_CREATED',
      'ACHIEVEMENT',
      ach.id,
      ach.title,
      reason,
      { code: ach.code, tier: ach.tier, points: ach.points },
    );
    return ach;
  }

  public toggleAchievement(actor: AdminUserSession, achId: string, reason: string) {
    const ach = this.achievements.find((a) => a.id === achId);
    if (!ach) throw new Error('Achievement not found');
    ach.isActive = !ach.isActive;
    this.logAudit(
      actor,
      ach.isActive ? 'ACHIEVEMENT_ENABLED' : 'ACHIEVEMENT_DISABLED',
      'ACHIEVEMENT',
      achId,
      ach.title,
      reason,
      { isActive: ach.isActive },
    );
    return ach;
  }

  // Challenges
  public addChallenge(actor: AdminUserSession, payload: Omit<ManagedChallenge, 'id' | 'participantCount' | 'completionCount'>, reason: string) {
    const ch: ManagedChallenge = {
      ...payload,
      id: `ch-${Date.now()}`,
      participantCount: 0,
      completionCount: 0,
    };
    this.challenges.push(ch);
    this.logAudit(
      actor,
      'CHALLENGE_CREATED',
      'CHALLENGE',
      ch.id,
      ch.title,
      reason,
      { targetCount: ch.targetCount, category: ch.category },
    );
    return ch;
  }

  // Featured Lists & Collections
  public toggleListPublish(actor: AdminUserSession, listId: string, reason: string) {
    const list = this.featuredLists.find((l) => l.id === listId);
    if (!list) throw new Error('List not found');
    list.isPublished = !list.isPublished;
    this.logAudit(
      actor,
      list.isPublished ? 'FEATURED_LIST_PUBLISHED' : 'FEATURED_LIST_UNPUBLISHED',
      'FEATURED_LIST',
      listId,
      list.title,
      reason,
      { isPublished: list.isPublished },
    );
    return list;
  }

  public toggleCollectionFeatured(actor: AdminUserSession, colId: string, reason: string) {
    const col = this.collections.find((c) => c.id === colId);
    if (!col) throw new Error('Collection not found');
    col.isFeatured = !col.isFeatured;
    this.logAudit(
      actor,
      col.isFeatured ? 'COLLECTION_FEATURED' : 'COLLECTION_UNFEATURED',
      'COLLECTION',
      colId,
      col.title,
      reason,
      { isFeatured: col.isFeatured },
    );
    return col;
  }

  // Campaigns
  public createCampaign(actor: AdminUserSession, payload: Omit<NotificationCampaign, 'id' | 'deliveredCount' | 'openRatePercent'>, reason: string) {
    const camp: NotificationCampaign = {
      ...payload,
      id: `camp-${Date.now()}`,
      deliveredCount: payload.status === 'SENT' ? 42500 : 0,
      openRatePercent: payload.status === 'SENT' ? 38.4 : 0,
      sentAt: payload.status === 'SENT' ? new Date().toISOString() : null,
    };
    this.campaigns.unshift(camp);
    this.logAudit(
      actor,
      'CAMPAIGN_CREATED',
      'CAMPAIGN',
      camp.id,
      camp.title,
      reason,
      { segment: camp.segment, channel: camp.channel, status: camp.status },
    );
    return camp;
  }

  // Operations: Sync Providers & Retrying Jobs
  public triggerProviderSync(actor: AdminUserSession, providerId: string, reason: string) {
    const prov = this.providers.find((p) => p.id === providerId);
    if (!prov) throw new Error('Provider not found');
    prov.lastSyncedAt = new Date().toISOString();
    prov.status = 'OPERATIONAL';
    prov.errorRate24h = Math.max(0, prov.errorRate24h - 0.02);
    this.logAudit(
      actor,
      'PROVIDER_SYNC_TRIGGERED',
      'PROVIDER',
      providerId,
      prov.name,
      reason || 'Manual provider delta synchronization initiated by admin',
      { providerCategory: prov.category },
    );
    return prov;
  }

  public retryQueueJob(actor: AdminUserSession, queueId: string, reason: string) {
    const job = this.jobs.find((j) => j.id === queueId);
    if (!job) throw new Error('Queue not found');
    const failedToRetry = job.failed24h;
    job.failed24h = 0;
    job.activeCount += Math.min(5, failedToRetry);
    this.logAudit(
      actor,
      'BACKGROUND_JOB_RETRIED',
      'BACKGROUND_QUEUE',
      queueId,
      job.queueName,
      reason || 'Batch retry executed for failed background jobs',
      { retriedJobsCount: failedToRetry },
    );
    return job;
  }

  // Feature Flags
  public toggleFeatureFlag(
    actor: AdminUserSession,
    key: string,
    isEnabled: boolean,
    rolloutPercentage: number,
    reason: string,
  ) {
    const flag = this.flags.find((f) => f.key === key);
    if (!flag) throw new Error('Flag not found');
    const prev = { isEnabled: flag.isEnabled, rollout: flag.rolloutPercentage };
    flag.isEnabled = isEnabled;
    flag.rolloutPercentage = rolloutPercentage;
    flag.updatedAt = new Date().toISOString();
    flag.updatedBy = actor.name;
    this.logAudit(
      actor,
      'FLAG_UPDATED',
      'FEATURE_FLAG',
      key,
      flag.name,
      reason,
      { previous: prev, updated: { isEnabled, rolloutPercentage } },
    );
    return flag;
  }
}

// Global Singleton Instance
export const adminStore = new AdminStore();

export function hasPermission(role: AdminRole, module: string): boolean {
  if (role === 'SUPER_ADMINISTRATOR') return true;

  switch (module) {
    case 'dashboard':
      return true;
    case 'users':
      return role === 'SUPPORT_AGENT';
    case 'moderation':
    case 'reports':
    case 'reviews':
      return role === 'CONTENT_MODERATOR' || role === 'COMMUNITY_MODERATOR';
    case 'comments':
    case 'clubs':
      return role === 'COMMUNITY_MODERATOR' || role === 'CONTENT_MODERATOR';
    case 'gamification':
    case 'achievements':
    case 'challenges':
    case 'curation':
    case 'featured-lists':
    case 'collections':
      return role === 'CONTENT_MODERATOR';
    case 'campaigns':
      return role === 'CONTENT_MODERATOR';
    case 'providers':
    case 'jobs':
    case 'analytics':
      return role === 'ANALYST';
    case 'audit-logs':
    case 'feature-flags':
      return false;
    default:
      return true;
  }
}
