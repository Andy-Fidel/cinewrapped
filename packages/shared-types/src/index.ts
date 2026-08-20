export type RequestId = string;

export interface RequestMeta {
  requestId: RequestId;
}

export interface PageMeta {
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
}

export interface SuccessResponse<TData> {
  success: true;
  data: TData;
  meta: RequestMeta;
}

export interface CollectionResponse<TItem> {
  success: true;
  data: TItem[];
  meta: RequestMeta & { page: PageMeta };
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details: Record<string, unknown> | null;
  requestId: RequestId;
}

export interface ErrorResponse {
  success: false;
  error: ApiErrorBody;
}

export type ApiResponse<TData> = SuccessResponse<TData> | ErrorResponse;

export type MediaType = 'MOVIE' | 'TV';
export type WatchStatus =
  'PLANNED' | 'WATCHING' | 'COMPLETED' | 'PAUSED' | 'DROPPED' | 'REWATCHING';

export type ProfileVisibility = 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
export type ThemePreference = 'SYSTEM' | 'LIGHT' | 'DARK';
export type SpoilerPreference = 'ALWAYS_HIDE' | 'HIDE_UNTIL_REVEALED' | 'SHOW';
export type RatingSystem = 'FIVE_STAR' | 'TEN_POINT' | 'LIKE_DISLIKE';
export type ContentType = 'MOVIE' | 'TV' | 'ANIME' | 'DOCUMENTARY' | 'SHORT_FILM';
export type OnboardingStep =
  | 'PROFILE'
  | 'CONTENT_TYPES'
  | 'GENRES'
  | 'FAVORITES'
  | 'DISLIKES'
  | 'STREAMING'
  | 'RECOMMENDATIONS'
  | 'SOCIAL'
  | 'NOTIFICATIONS';

export interface CurrentUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  countryCode: string;
  preferredLanguage: string;
  timezone: string;
  profileVisibility: ProfileVisibility;
  onboardingCompleted: boolean;
  recommendationOptIn: boolean;
  analyticsOptIn: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  preferredGenreIds: string[];
  dislikedGenreIds: string[];
  preferredLanguages: string[];
  preferredCountries: string[];
  preferredDecades: number[];
  preferredRuntimeMin: number | null;
  preferredRuntimeMax: number | null;
  preferredRatingSystem: RatingSystem;
  contentTypes: ContentType[];
  spoilerPreference: SpoilerPreference;
  adultContentEnabled: boolean;
  notificationPreferences: Record<string, boolean>;
  theme: ThemePreference;
  defaultCountryForStreaming: string;
  autoplayTrailers: boolean;
  reduceMotion: boolean;
  mainstreamPreferencePercent: number;
  streamingProviderIds: string[];
  favoriteMediaIds: string[];
}

export interface PrivacySettingsSummary {
  watchHistoryVisibility: ProfileVisibility;
  ratingsVisibility: ProfileVisibility;
  reviewsVisibility: ProfileVisibility;
  listsVisibility: ProfileVisibility;
  friendListVisibility: ProfileVisibility;
  wrapsVisibility: ProfileVisibility;
  onlineStatusVisibility: ProfileVisibility;
  leaderboardVisibility: ProfileVisibility;
  passportVisibility: ProfileVisibility;
  shareWatchActivity: boolean;
  shareRatingActivity: boolean;
  shareReviewActivity: boolean;
  shareListActivity: boolean;
  shareAchievementActivity: boolean;
}

export interface OnboardingState {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  validationGaps: string[];
  completed: boolean;
}

export interface SessionSummary {
  id: string;
  installationId: string | null;
  platform: 'IOS' | 'ANDROID' | 'WEB' | 'UNKNOWN';
  deviceName: string | null;
  lastSeenAt: string;
  expiresAt: string | null;
  current: boolean;
}

export interface GenreSummary {
  id: string;
  name: string;
  slug: string;
}

export interface StreamingProviderSummary {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
}

export interface MediaSummary {
  id: string;
  provider: 'TMDB';
  externalId: string;
  mediaType: MediaType;
  title: string;
  releaseYear: number | null;
  runtimeMinutes: number | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  overview: string | null;
  genreIds: string[];
  averageProviderRating: number | null;
}

export type SearchSuggestionCategory = 'RECENT' | 'MEDIA' | 'USER' | 'PERSON' | 'LIST' | 'CLUB';

export interface SearchSuggestion {
  text: string;
  category: SearchSuggestionCategory;
}

export interface SearchPersonSummary {
  id: string;
  name: string;
  profileUrl: string | null;
  knownFor: MediaSummary[];
}

export interface SearchListSummary {
  id: string;
  name: string;
  description: string | null;
  visibility: 'PUBLIC' | 'FRIENDS' | 'PRIVATE' | 'CLUB_ONLY';
  itemCount: number;
  owner: UserSummary;
  updatedAt: string;
}

export interface SearchListDetails extends SearchListSummary {
  items: Array<{
    id: string;
    position: number;
    note: string | null;
    createdAt: string;
    media: MediaSummary;
  }>;
}

export interface SearchResults {
  media: MediaSummary[];
  users: UserSummary[];
  people: SearchPersonSummary[];
  lists: SearchListSummary[];
  clubs: ClubSummary[];
  totalCount: number;
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  resultCount: number;
  searchCount: number;
  lastSearchedAt: string;
}

export interface TrendingSearch {
  query: string;
  searchCount: number;
}

export interface CreditSummary {
  id: string;
  personId: string;
  name: string;
  profileUrl: string | null;
  creditType: 'CAST' | 'CREW';
  department: string | null;
  job: string | null;
  character: string | null;
  position: number | null;
}

export interface SeasonSummary {
  id: string;
  seasonNumber: number;
  name: string;
  overview: string | null;
  airDate: string | null;
  episodeCount: number | null;
  posterUrl: string | null;
}

export interface StreamingAvailabilityItem {
  providerId: string;
  providerName: string;
  logoUrl: string | null;
  monetizationType: 'FLATRATE' | 'FREE' | 'ADS' | 'RENT' | 'BUY';
  providerUrl: string | null;
  displayPriority: number | null;
}

export interface StreamingAvailability {
  countryCode: string;
  fetchedAt: string;
  expiresAt: string;
  items: StreamingAvailabilityItem[];
}

export interface MediaDetails extends MediaSummary {
  originalTitle: string;
  releaseDate: string | null;
  originalLanguage: string | null;
  countryCodes: string[];
  trailerUrl: string | null;
  status: string;
  ageRating: string | null;
  genres: GenreSummary[];
  cast: CreditSummary[];
  crew: CreditSummary[];
  seasons: SeasonSummary[];
  streamingAvailability: StreamingAvailability | null;
  lastSyncedAt: string | null;
}

export interface RatingSummary {
  id: string;
  ratingValue: number | null;
  ratingScale: number | null;
  normalizedScore: number | null;
  liked: boolean | null;
  emotionalTags: string[];
  version: number;
  updatedAt: string;
}

export interface ReviewSummary {
  id: string;
  mediaId: string;
  title: string | null;
  body: string;
  containsSpoilers: boolean;
  visibility: 'PUBLIC' | 'FRIENDS' | 'PRIVATE' | 'CLUB_ONLY';
  status: 'DRAFT' | 'PUBLISHED' | 'HIDDEN' | 'REMOVED';
  publishedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface PublicReviewItem {
  id: string;
  mediaId: string;
  title: string | null;
  body: string;
  containsSpoilers: boolean;
  likeCount: number;
  commentCount: number;
  publishedAt: string | null;
  createdAt: string;
  ratingValue: number | null;
  user: {
    id: string;
    handle: string;
    displayName: string;
    avatarUrl: string | null;
  };
  vibeTags?: string[];
  quote?: string | null;
}

export interface LibraryItem {
  media: MediaSummary;
  status: WatchStatus;
  startedAt: string | null;
  completedAt: string | null;
  progressPercent: number;
  progressSeconds: number | null;
  watchCount: number;
  lastWatchedAt: string | null;
  version: number;
  inDefaultWatchlist: boolean;
  rating: RatingSummary | null;
  latestReview: ReviewSummary | null;
  updatedAt: string;
}

export interface ViewingSummary {
  id: string;
  mediaId: string;
  watchedAt: string;
  completedAt: string | null;
  durationWatchedMin: number | null;
  viewingPlatform: string | null;
  notes: string | null;
  isRewatch: boolean;
  createdAt: string;
}

export interface EpisodeProgressSummary {
  episodeId: string;
  seasonId: string;
  seasonNumber: number;
  episodeNumber: number;
  name: string;
  overview: string | null;
  airDate: string | null;
  runtimeMinutes: number | null;
  stillUrl: string | null;
  completed: boolean;
  progressSeconds: number | null;
  watchedAt: string | null;
  watchCount: number;
  version: number | null;
}

export interface WatchlistSummary {
  id: string;
  name: string;
  description: string | null;
  visibility: 'PUBLIC' | 'FRIENDS' | 'PRIVATE' | 'CLUB_ONLY';
  isDefault: boolean;
  itemCount: number;
  version: number;
  updatedAt: string;
}

export interface WatchlistDetails extends WatchlistSummary {
  items: Array<{
    id: string;
    position: number;
    note: string | null;
    createdAt: string;
    media: MediaSummary;
  }>;
}

export interface MediaTrackingState {
  library: LibraryItem | null;
  watchlists: Array<{ id: string; name: string; isDefault: boolean }>;
  rating: RatingSummary | null;
  latestReview: ReviewSummary | null;
}

export type RecommendationType =
  | 'PERSONALIZED'
  | 'TRENDING'
  | 'FRIEND_BASED'
  | 'MOOD_BASED'
  | 'SIMILAR_MEDIA'
  | 'HIDDEN_GEM'
  | 'CONTINUE_WATCHING'
  | 'BECAUSE_YOU_WATCHED';

export type RecommendationFeedbackType = 'VIEWED' | 'SAVED' | 'DISMISSED' | 'SELECTED';

export interface TasteGenreAffinity {
  genreId: string;
  name: string;
  weight: number;
  signalCount: number;
}

export interface TasteProfile {
  topGenres: TasteGenreAffinity[];
  dislikedGenreIds: string[];
  preferredLanguages: string[];
  preferredDecades: number[];
  runtimeRange: { minimum: number | null; maximum: number | null };
  mainstreamPreferencePercent: number;
  signalCounts: {
    favorites: number;
    ratings: number;
    completedTitles: number;
    feedbackEvents: number;
  };
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  modelVersion: string;
  generatedAt: string;
}

export interface RecommendationSummary {
  id: string;
  media: MediaSummary;
  score: number;
  recommendationType: RecommendationType;
  explanation: string;
  reasonCodes: string[];
  modelVersion: string;
  generatedAt: string;
  expiresAt: string;
  feedback: RecommendationFeedbackType[];
}

export type DiscoveryMood =
  'FUNNY' | 'COZY' | 'ROMANTIC' | 'TENSE' | 'THOUGHTFUL' | 'UPLIFTING' | 'SCARY' | 'ADVENTUROUS';

export interface DiscoveryInterpretation {
  originalQuery: string;
  mediaType: MediaType;
  moods: DiscoveryMood[];
  genres: string[];
  originalLanguage: string | null;
  releaseYearMinimum: number | null;
  releaseYearMaximum: number | null;
  runtimeMaximum: number | null;
  minimumRating: number | null;
  hiddenGemsOnly: boolean;
  streamingServices: string[];
  companions: 'SOLO' | 'PARTNER' | 'FRIENDS' | 'FAMILY' | 'CHILDREN' | null;
  endingPreference: 'HAPPY' | 'NOT_SAD' | null;
  explanation: string;
  unsupportedConstraints: string[];
}

export interface IntelligentDiscoveryResult {
  interpretation: DiscoveryInterpretation;
  results: MediaSummary[];
  source: 'LOCAL_GROUNDED';
  notice: string;
}

export interface ConversationTurn {
  role: 'USER' | 'ASSISTANT';
  content: string;
}

export interface ConversationalRecommendationResult extends IntelligentDiscoveryResult {
  reply: string;
  suggestedFollowUps: string[];
}

export type ReviewAssistantStyle =
  'SHORT' | 'DETAILED' | 'FUNNY' | 'SPOILER_FREE' | 'SOCIAL_CAPTION';

export interface ReviewAssistantResult {
  draft: string;
  style: ReviewAssistantStyle;
  source: 'LOCAL_GROUNDED';
  requiresApproval: true;
  notice: string;
}

export interface MovieDnaTrait {
  key: string;
  label: string;
  value: string;
  evidenceCount: number;
  explanation: string;
}

export interface MovieDnaProfile {
  label: string;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  sampleSize: number;
  traits: MovieDnaTrait[];
  generatedAt: string;
  modelVersion: 'grounded-dna-v1';
  notice: string;
}

export interface UserSummary {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
}

export interface RelationshipState {
  following: boolean;
  followedBy: boolean;
  friendshipId: string | null;
  friendshipStatus: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'BLOCKED' | null;
  friendshipDirection: 'INCOMING' | 'OUTGOING' | null;
  muted: boolean;
}

export interface PublicProfile extends UserSummary {
  profileVisibility: ProfileVisibility;
  createdAt: string;
  counts: { followers: number; following: number; friends: number; reviews: number };
  relationship: RelationshipState;
}

export interface FriendshipSummary {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'BLOCKED';
  direction: 'INCOMING' | 'OUTGOING';
  otherUser: UserSummary;
  createdAt: string;
  updatedAt: string;
}

export interface ReactionSummary {
  counts: Partial<Record<'LIKE' | 'LOVE' | 'LAUGH' | 'WOW' | 'SAD', number>>;
  mine: Array<'LIKE' | 'LOVE' | 'LAUGH' | 'WOW' | 'SAD'>;
}

export interface CommentSummary {
  id: string;
  author: UserSummary;
  parentType: 'REVIEW' | 'FEED_ACTIVITY';
  parentId: string;
  parentCommentId: string | null;
  body: string;
  containsSpoilers: boolean;
  createdAt: string;
  updatedAt: string;
  replyCount: number;
  reactions: ReactionSummary;
}

export interface FeedActivitySummary {
  id: string;
  actor: UserSummary;
  activityType:
    | 'USER_WATCHED_MEDIA'
    | 'USER_RATED_MEDIA'
    | 'USER_REVIEWED_MEDIA'
    | 'USER_CREATED_LIST'
    | 'USER_UNLOCKED_ACHIEVEMENT'
    | 'USER_JOINED_CLUB'
    | 'USER_SHARED_WRAP';
  media: MediaSummary | null;
  visibility: 'PUBLIC' | 'FRIENDS' | 'PRIVATE' | 'CLUB_ONLY';
  occurredAt: string;
  commentCount: number;
  reactions: ReactionSummary;
}

export interface ShareReceipt {
  mediaId: string;
  deepLink: string;
  webUrl: string;
  title: string;
}

export interface StatisticsPeriod {
  periodStart: string;
  periodEnd: string;
  timezone: string;
}

export interface RankedStatistic {
  id: string;
  label: string;
  count: number;
}

export interface TopTitleStatistic {
  mediaId: string;
  title: string;
  posterUrl: string | null;
  viewingCount: number;
  minutesWatched: number;
}

export interface StatisticsSummary extends StatisticsPeriod {
  uniqueTitles: number;
  viewingCount: number;
  totalMinutes: number;
  totalHours: number;
  rewatchCount: number;
  averageRatingPercent: number | null;
  ratedTitleCount: number;
  activeDays: number;
  longestStreakDays: number;
  movieViewings: number;
  tvViewings: number;
  topGenres: RankedStatistic[];
  topTitles: TopTitleStatistic[];
}

export interface MonthlyWatchCount {
  month: number;
  label: string;
  viewingCount: number;
  uniqueTitles: number;
  minutesWatched: number;
}

export interface ActivityHeatmapDay {
  date: string;
  count: number;
  minutesWatched: number;
  intensity: 0 | 1 | 2 | 3 | 4;
  viewings: Array<{
    id: string;
    mediaId: string;
    title: string;
    posterUrl: string | null;
    watchedAt: string;
    mediaType: 'MOVIE' | 'TV';
  }>;
}

export interface ActivityHeatmapSummary {
  year: number;
  totalViewings: number;
  totalMinutesWatched: number;
  activeDaysCount: number;
  currentStreakDays: number;
  longestStreakDays: number;
  mostActiveWeekday: {
    name: string;
    index: number;
    count: number;
    percent: number;
  };
  weekdayDistribution: Array<{
    day: string;
    fullDay: string;
    count: number;
    percent: number;
  }>;
  circadianRhythm: {
    persona: string;
    peakHourLabel: string;
    morningPercent: number;
    afternoonPercent: number;
    eveningPercent: number;
    nightPercent: number;
  };
  days: ActivityHeatmapDay[];
}

export interface TasteStatistics extends StatisticsPeriod {
  sampleSize: number;
  genres: RankedStatistic[];
  languages: RankedStatistic[];
  decades: RankedStatistic[];
  runtimeBuckets: RankedStatistic[];
}

export type WrapType = 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'CUSTOM';
export type WrapStatus = 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';

export interface WrapStorySlide {
  id: string;
  kind: 'INTRO' | 'TOTALS' | 'FAVORITE_GENRE' | 'TOP_TITLE' | 'RATINGS' | 'OUTRO';
  eyebrow: string;
  title: string;
  body: string;
  statValue: string | null;
  statLabel: string | null;
  accent: 'VIOLET' | 'CORAL' | 'GOLD' | 'TEAL';
  media: { id: string; title: string; posterUrl: string | null } | null;
}

export interface WrapHighlights {
  headline: string;
  topTitle: TopTitleStatistic | null;
  favoriteGenre: RankedStatistic | null;
  totalHours: number;
}

export interface WrapSummary {
  id: string;
  wrapType: WrapType;
  periodStart: string;
  periodEnd: string;
  timezone: string;
  status: WrapStatus;
  inputVersion: number;
  headline: string | null;
  generatedAt: string | null;
}

export interface WrapDetail extends WrapSummary {
  statistics: StatisticsSummary | null;
  highlights: WrapHighlights | null;
  storySlides: WrapStorySlide[] | null;
  failureCode: string | null;
}

export interface WrapShareCard {
  wrapId: string;
  title: string;
  subtitle: string;
  statValue: string;
  statLabel: string;
  accent: WrapStorySlide['accent'];
  deepLink: string;
  webUrl: string;
  expiresAt: string;
}

export type GamificationMetric =
  | 'VIEWINGS'
  | 'UNIQUE_TITLES'
  | 'MINUTES_WATCHED'
  | 'REWATCHES'
  | 'RATINGS'
  | 'REVIEWS'
  | 'STREAK_DAYS'
  | 'COUNTRIES';

export interface AchievementSummary {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  points: number;
  progress: number;
  target: number;
  unlockedAt: string | null;
}

export interface ChallengeSummary {
  id: string;
  code: string;
  name: string;
  description: string;
  metric: GamificationMetric;
  target: number;
  points: number;
  startsAt: string;
  endsAt: string;
  joined: boolean;
  progress: number;
  completedAt: string | null;
}

export interface StreakSummary {
  currentDays: number;
  longestDays: number;
  lastActiveDate: string | null;
  timezone: string;
}

export interface PassportStamp {
  countryCode: string;
  viewingCount: number;
  uniqueTitles: number;
  firstVisitedAt: string;
  lastVisitedAt: string;
}

export interface MoviePassport {
  countriesVisited: number;
  languagesExplored: number;
  decadesExplored: number;
  totalStamps: number;
  stamps: PassportStamp[];
}

export type LeaderboardMetric = 'POINTS' | 'VIEWINGS' | 'STREAK';

export interface LeaderboardEntry {
  rank: number;
  user: UserSummary;
  score: number;
  isViewer: boolean;
}

export interface LeaderboardSummary {
  metric: LeaderboardMetric;
  visibilityNote: string;
  entries: LeaderboardEntry[];
  viewerEntry: LeaderboardEntry | null;
}

export interface GamificationDashboard {
  totalPoints: number;
  unlockedCount: number;
  achievementCount: number;
  achievements: AchievementSummary[];
  challenges: ChallengeSummary[];
  streak: StreakSummary;
  passport: MoviePassport;
}

export type ClubVisibility = 'PUBLIC' | 'PRIVATE';
export type ClubMembershipType = 'OPEN' | 'APPROVAL' | 'INVITE_ONLY';
export type ClubRole = 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER';
export type ClubMemberStatus = 'PENDING' | 'ACTIVE' | 'REMOVED';

export interface ClubMembershipSummary {
  id: string;
  role: ClubRole;
  status: ClubMemberStatus;
  joinedAt: string | null;
  user: UserSummary;
}

export interface ClubSummary {
  id: string;
  name: string;
  slug: string;
  description: string;
  coverImageUrl: string | null;
  visibility: ClubVisibility;
  membershipType: ClubMembershipType;
  category: string | null;
  memberCount: number;
  membership: Pick<ClubMembershipSummary, 'id' | 'role' | 'status'> | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClubPostSummary {
  id: string;
  postType: 'DISCUSSION' | 'ANNOUNCEMENT';
  title: string | null;
  body: string;
  containsSpoilers: boolean;
  author: UserSummary;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClubPollOptionSummary {
  id: string;
  label: string;
  position: number;
  media: MediaSummary | null;
  voteCount: number;
  selectedByViewer: boolean;
}

export interface ClubPollSummary {
  id: string;
  question: string;
  allowMultiple: boolean;
  status: 'OPEN' | 'CLOSED';
  closesAt: string | null;
  totalVotes: number;
  options: ClubPollOptionSummary[];
  createdAt: string;
}

export interface ClubWatchlistItemSummary {
  id: string;
  media: MediaSummary;
  suggestedBy: UserSummary;
  note: string | null;
  score: number;
  viewerVote: -1 | 0 | 1;
  selectedAt: string | null;
  createdAt: string;
}

export interface ClubWatchEventSummary {
  id: string;
  title: string;
  description: string | null;
  media: MediaSummary | null;
  startsAt: string;
  timezone: string;
  locationUrl: string | null;
  status: 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';
  createdBy: UserSummary;
}

export interface ClubDetails extends ClubSummary {
  members: ClubMembershipSummary[];
  posts: ClubPostSummary[];
  polls: ClubPollSummary[];
  watchlist: ClubWatchlistItemSummary[];
  watchEvents: ClubWatchEventSummary[];
}

export const advancedFeatureKeys = [
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
] as const;

export type AdvancedFeatureKey = (typeof advancedFeatureKeys)[number];
export type FeatureFlagSource = 'DEFAULT' | 'ROLLOUT' | 'USER_OVERRIDE';

export interface FeatureFlagEvaluation {
  enabled: boolean;
  source: FeatureFlagSource;
}

export interface FeatureFlagsResponse {
  flags: Record<AdvancedFeatureKey, FeatureFlagEvaluation>;
  fetchedAt: string;
}

export type MusicProvider = 'APPLE_MUSIC';
export type MusicService = 'APPLE_MUSIC' | 'SPOTIFY';

export interface MusicServiceLink {
  service: MusicService;
  url: string;
}

export interface SoundtrackAlbumSummary {
  provider: MusicProvider;
  providerAlbumId: string;
  title: string;
  artistName: string;
  artworkUrl: string | null;
  providerUrl: string;
  releaseDate: string | null;
  trackCount: number | null;
  explicit: boolean;
  serviceLinks: MusicServiceLink[];
  saveId: string | null;
}

export interface SoundtrackTrackSummary {
  providerTrackId: string;
  title: string;
  artistName: string;
  trackNumber: number | null;
  durationMs: number | null;
  previewUrl: string | null;
  providerUrl: string;
  explicit: boolean;
}

export interface SoundtrackDiscoverySummary {
  mediaId: string;
  query: string;
  attribution: 'Apple';
  albums: SoundtrackAlbumSummary[];
}

export interface SavedSoundtrackSummary extends SoundtrackAlbumSummary {
  id: string;
  media: MediaSummary;
  savedAt: string;
}

export type SceneIdentificationStatus = 'MATCHED' | 'UNCERTAIN' | 'NO_MATCH';
export type SceneIdentificationFeedback = 'PENDING' | 'CONFIRMED' | 'REJECTED';

export interface SceneIdentificationCandidate {
  suggestedTitle: string;
  suggestedYear: number | null;
  suggestedMediaType: MediaType | null;
  confidence: number;
  evidence: string[];
  media: MediaSummary | null;
}

export interface SceneIdentificationSummary {
  id: string;
  status: SceneIdentificationStatus;
  feedback: SceneIdentificationFeedback;
  confidence: number;
  sceneDescription: string;
  candidates: SceneIdentificationCandidate[];
  matchedMedia: MediaSummary | null;
  model: string;
  processingMs: number;
  confirmedAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
  notice: string;
}

export const privateStorageBuckets = [
  'journal-attachments',
  'scene-identification',
  'data-exports',
  'data-imports',
  'club-covers',
] as const;

export type PrivateStorageBucket = (typeof privateStorageBuckets)[number];

export type JournalEntryStatus = 'DRAFT' | 'COMPLETED';
export type JournalAttachmentType = 'TICKET' | 'PERSONAL_PHOTO';

export interface JournalAttachmentSummary {
  id: string;
  attachmentType: JournalAttachmentType;
  storageBucket: 'journal-attachments';
  storagePath: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  createdAt: string;
}

export interface JournalEntrySummary {
  id: string;
  media: MediaSummary;
  viewingId: string | null;
  status: JournalEntryStatus;
  title: string | null;
  notes: string | null;
  viewingLocation: string | null;
  companionNames: string[];
  memorableQuotes: string[];
  moodBefore: string | null;
  moodAfter: string | null;
  watchedAt: string | null;
  attachments: JournalAttachmentSummary[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export type CalendarEventType = 'WATCH_PLAN' | 'RELEASE_REMINDER';
export type CalendarEventStatus = 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';

export interface CalendarEventSummary {
  id: string;
  media: MediaSummary | null;
  eventType: CalendarEventType;
  status: CalendarEventStatus;
  title: string;
  notes: string | null;
  startsAt: string;
  timezone: string;
  durationMinutes: number;
  reminderMinutes: number[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export type NotificationType =
  | 'FRIEND_REQUEST'
  | 'FRIEND_REQUEST_ACCEPTED'
  | 'COMMENT'
  | 'REACTION'
  | 'NEW_FOLLOWER'
  | 'WRAP_READY'
  | 'ACHIEVEMENT_UNLOCKED'
  | 'SHARED_TITLE';

export type NotificationEntityType =
  | 'USER'
  | 'FRIENDSHIP'
  | 'COMMENT'
  | 'REACTION'
  | 'REVIEW'
  | 'MEDIA'
  | 'WRAP'
  | 'ACHIEVEMENT';

export interface NotificationSummary {
  id: string;
  userId: string;
  type: NotificationType;
  actorUserId: string | null;
  actor?: {
    id: string;
    displayName: string;
    handle: string;
    avatarUrl: string | null;
  } | null;
  entityType: NotificationEntityType;
  entityId: string;
  title: string;
  body: string;
  deepLink: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationInboxResponse {
  items: NotificationSummary[];
  unreadCount: number;
  totalCount: number;
}

export interface RegisterPushDeviceDto {
  installationId: string;
  platform: 'IOS' | 'ANDROID' | 'WEB';
  pushToken: string;
  locale?: string;
  timezone?: string;
}

