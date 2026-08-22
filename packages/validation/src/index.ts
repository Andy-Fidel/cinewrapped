import { z } from 'zod';

const reservedUsernames = new Set([
  'admin',
  'api',
  'auth',
  'cinewrapped',
  'help',
  'moderator',
  'notifications',
  'root',
  'security',
  'settings',
  'support',
]);

export const uuidSchema = z.uuid();
export const countryCodeSchema = z.string().regex(/^[A-Z]{2}$/u);
export const languageTagSchema = z.string().min(2).max(16);
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,30}$/u)
  .refine((value) => !reservedUsernames.has(value), 'This username is reserved.');
export const cursorLimitSchema = z.coerce.number().int().min(1).max(50).default(20);
export const idempotencyKeySchema = z
  .string()
  .min(16)
  .max(128)
  .regex(/^[\x21-\x7e]+$/u);

const appleMusicUrlSchema = z
  .url()
  .max(2_048)
  .refine((value) => new URL(value).hostname.endsWith('.apple.com'), 'Use an Apple Music URL.');
const appleArtworkUrlSchema = z
  .url()
  .max(2_048)
  .refine((value) => new URL(value).hostname.endsWith('.mzstatic.com'), 'Use Apple artwork.');

export const saveSoundtrackSchema = z.object({
  provider: z.literal('APPLE_MUSIC'),
  providerAlbumId: z.string().trim().regex(/^\d+$/u).max(128),
  title: z.string().trim().min(1).max(300),
  artistName: z.string().trim().min(1).max(200),
  artworkUrl: appleArtworkUrlSchema.nullable().optional(),
  providerUrl: appleMusicUrlSchema,
  releaseDate: z.iso.date().nullable().optional(),
  trackCount: z.number().int().min(0).max(10_000).nullable().optional(),
});

export const identifySceneSchema = z.object({
  storagePath: z
    .string()
    .trim()
    .min(1)
    .max(1_024)
    .regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(?:jpe?g|png|webp)$/iu),
  signedImageUrl: z.url({ protocol: /^https$/ }).max(4_096),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  byteSize: z
    .number()
    .int()
    .min(1)
    .max(10 * 1024 * 1024),
  language: languageTagSchema.default('en-US'),
  countryCode: countryCodeSchema.default('US'),
  privacyAcknowledged: z.literal(true),
});

export const sceneIdentificationFeedbackSchema = z
  .object({
    action: z.enum(['CONFIRM', 'REJECT']),
    mediaId: uuidSchema.nullable().optional(),
  })
  .refine((value) => value.action === 'REJECT' || value.mediaId != null, {
    path: ['mediaId'],
    message: 'Choose the confirmed title.',
  });

export function normalizeUsername(value: string): string {
  return usernameSchema.parse(value);
}

export const bootstrapSchema = z.object({
  timezone: z.string().min(1).max(64),
  locale: languageTagSchema,
  installationId: z.string().min(1).max(255).optional(),
  platform: z.enum(['IOS', 'ANDROID', 'WEB', 'UNKNOWN']).default('UNKNOWN'),
  deviceName: z.string().min(1).max(120).optional(),
});

export const updateProfileSchema = z
  .object({
    expectedVersion: z.number().int().min(1),
    username: usernameSchema.optional(),
    displayName: z.string().trim().min(1).max(80).optional(),
    avatarUrl: z.url().nullable().optional(),
    bio: z.string().trim().max(500).nullable().optional(),
    countryCode: countryCodeSchema.optional(),
    preferredLanguage: languageTagSchema.optional(),
    timezone: z.string().min(1).max(64).optional(),
    profileVisibility: z.enum(['PUBLIC', 'FRIENDS', 'PRIVATE']).optional(),
    recommendationOptIn: z.boolean().optional(),
    analyticsOptIn: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 1, 'At least one profile field is required.');

export const updatePreferencesSchema = z
  .object({
    preferredGenreIds: z.array(uuidSchema).max(50).optional(),
    dislikedGenreIds: z.array(uuidSchema).max(50).optional(),
    preferredLanguages: z.array(languageTagSchema).max(30).optional(),
    preferredCountries: z.array(countryCodeSchema).max(30).optional(),
    preferredDecades: z
      .array(z.number().int().min(1880).max(2200).multipleOf(10))
      .max(20)
      .optional(),
    preferredRuntimeMin: z.number().int().min(1).max(1440).nullable().optional(),
    preferredRuntimeMax: z.number().int().min(1).max(1440).nullable().optional(),
    preferredRatingSystem: z.enum(['FIVE_STAR', 'TEN_POINT', 'LIKE_DISLIKE']).optional(),
    contentTypes: z
      .array(z.enum(['MOVIE', 'TV', 'ANIME', 'DOCUMENTARY', 'SHORT_FILM']))
      .min(1)
      .optional(),
    spoilerPreference: z.enum(['ALWAYS_HIDE', 'HIDE_UNTIL_REVEALED', 'SHOW']).optional(),
    adultContentEnabled: z.boolean().optional(),
    notificationPreferences: z.record(z.string(), z.boolean()).optional(),
    theme: z.enum(['SYSTEM', 'LIGHT', 'DARK']).optional(),
    defaultCountryForStreaming: countryCodeSchema.optional(),
    autoplayTrailers: z.boolean().optional(),
    reduceMotion: z.boolean().optional(),
    mainstreamPreferencePercent: z.number().int().min(0).max(100).optional(),
    streamingProviderIds: z.array(uuidSchema).max(30).optional(),
    favoriteMediaIds: z.array(uuidSchema).min(5).max(20).optional(),
  })
  .refine((value) => {
    if (value.preferredRuntimeMin == null || value.preferredRuntimeMax == null) return true;
    return value.preferredRuntimeMin <= value.preferredRuntimeMax;
  }, 'Minimum runtime cannot exceed maximum runtime.')
  .refine((value) => {
    const preferred = new Set(value.preferredGenreIds ?? []);
    return (value.dislikedGenreIds ?? []).every((id) => !preferred.has(id));
  }, 'A genre cannot be both preferred and disliked.');

export const onboardingStepSchema = z.enum([
  'PROFILE',
  'CONTENT_TYPES',
  'GENRES',
  'FAVORITES',
  'DISLIKES',
  'STREAMING',
  'RECOMMENDATIONS',
  'SOCIAL',
  'NOTIFICATIONS',
]);

export const updateOnboardingSchema = z.object({
  step: onboardingStepSchema,
});

export const updatePrivacySchema = z
  .object({
    watchHistoryVisibility: z.enum(['PUBLIC', 'FRIENDS', 'PRIVATE', 'CLUB_ONLY']).optional(),
    ratingsVisibility: z.enum(['PUBLIC', 'FRIENDS', 'PRIVATE', 'CLUB_ONLY']).optional(),
    reviewsVisibility: z.enum(['PUBLIC', 'FRIENDS', 'PRIVATE', 'CLUB_ONLY']).optional(),
    listsVisibility: z.enum(['PUBLIC', 'FRIENDS', 'PRIVATE', 'CLUB_ONLY']).optional(),
    friendListVisibility: z.enum(['PUBLIC', 'FRIENDS', 'PRIVATE', 'CLUB_ONLY']).optional(),
    wrapsVisibility: z.enum(['PUBLIC', 'FRIENDS', 'PRIVATE', 'CLUB_ONLY']).optional(),
    onlineStatusVisibility: z.enum(['PUBLIC', 'FRIENDS', 'PRIVATE', 'CLUB_ONLY']).optional(),
    shareWatchActivity: z.boolean().optional(),
    shareRatingActivity: z.boolean().optional(),
    shareReviewActivity: z.boolean().optional(),
    shareListActivity: z.boolean().optional(),
    shareAchievementActivity: z.boolean().optional(),
    leaderboardVisibility: z.enum(['PUBLIC', 'FRIENDS', 'PRIVATE']).optional(),
    passportVisibility: z.enum(['PUBLIC', 'FRIENDS', 'PRIVATE']).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one privacy field is required.');

export const completeOnboardingSchema = z.object({
  acceptedPrivacyVersion: z.string().min(1).max(40),
  acceptedTermsVersion: z.string().min(1).max(40),
  expectedProfileVersion: z.number().int().min(1),
});

export const watchStatusSchema = z.enum([
  'PLANNED',
  'WATCHING',
  'COMPLETED',
  'PAUSED',
  'DROPPED',
  'REWATCHING',
]);

export const updateWatchStatusSchema = z.object({
  status: watchStatusSchema,
  progressPercent: z.number().min(0).max(100).optional(),
  progressSeconds: z.number().int().min(0).max(86_400_000).nullable().optional(),
  expectedVersion: z.number().int().min(1).optional(),
});

export const logViewingSchema = z.object({
  clientOperationId: uuidSchema,
  watchedAt: z.iso.datetime({ offset: true }),
  completed: z.boolean().default(true),
  durationWatchedMin: z.number().int().min(0).max(100_000).nullable().optional(),
  viewingPlatform: z.string().trim().min(1).max(120).nullable().optional(),
  notes: z.string().trim().max(5_000).nullable().optional(),
});

export const updateEpisodeProgressSchema = z.object({
  clientOperationId: uuidSchema.optional(),
  completed: z.boolean(),
  progressSeconds: z.number().int().min(0).max(86_400).nullable().optional(),
  watchedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  expectedVersion: z.number().int().min(1).optional(),
});

export const upsertRatingSchema = z
  .object({
    ratingValue: z.number().min(0).max(10).optional(),
    ratingScale: z.union([z.literal(5), z.literal(10)]).optional(),
    liked: z.boolean().optional(),
    emotionalTags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
    expectedVersion: z.number().int().min(1).optional(),
  })
  .superRefine((value, context) => {
    const numeric = value.ratingValue !== undefined || value.ratingScale !== undefined;
    if (numeric && (value.ratingValue === undefined || value.ratingScale === undefined)) {
      context.addIssue({
        code: 'custom',
        message: 'Rating value and scale must be provided together.',
      });
    }
    if (
      value.ratingValue !== undefined &&
      value.ratingScale !== undefined &&
      value.ratingValue > value.ratingScale
    ) {
      context.addIssue({ code: 'custom', message: 'Rating value cannot exceed its scale.' });
    }
    if (!numeric && value.liked === undefined) {
      context.addIssue({
        code: 'custom',
        message: 'Provide a numeric rating or like/dislike value.',
      });
    }
  });

export const createReviewSchema = z.object({
  title: z.string().trim().min(1).max(160).nullable().optional(),
  body: z.string().trim().min(1).max(20_000),
  containsSpoilers: z.boolean().default(false),
  visibility: z.enum(['PUBLIC', 'FRIENDS', 'PRIVATE', 'CLUB_ONLY']).default('PUBLIC'),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
});

const journalTextListSchema = z.array(z.string().trim().min(1).max(300)).max(20);
const journalMoodSchema = z.string().trim().min(1).max(40).nullable();

export const createJournalEntrySchema = z.object({
  mediaId: uuidSchema,
  viewingId: uuidSchema.nullable().optional(),
  status: z.enum(['DRAFT', 'COMPLETED']).default('DRAFT'),
  title: z.string().trim().min(1).max(160).nullable().optional(),
  notes: z.string().trim().max(20_000).nullable().optional(),
  viewingLocation: z.string().trim().max(200).nullable().optional(),
  companionNames: journalTextListSchema.default([]),
  memorableQuotes: journalTextListSchema.default([]),
  moodBefore: journalMoodSchema.optional(),
  moodAfter: journalMoodSchema.optional(),
  watchedAt: z.iso.datetime({ offset: true }).nullable().optional(),
});

export const updateJournalEntrySchema = createJournalEntrySchema
  .omit({ mediaId: true })
  .partial()
  .extend({ expectedVersion: z.number().int().min(1) })
  .refine((value) => Object.keys(value).length > 1, 'At least one journal field is required.');

export const registerJournalAttachmentSchema = z
  .object({
    attachmentType: z.enum(['TICKET', 'PERSONAL_PHOTO']),
    storagePath: z
      .string()
      .min(38)
      .max(1_024)
      .regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.[a-z0-9]{1,10}$/iu),
    signedUrl: z.url({ protocol: /^https$/ }).max(4_096),
    fileName: z.string().trim().min(1).max(255),
    mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']),
    byteSize: z.number().int().min(1).max(10_485_760),
  })
  .refine((value) => value.attachmentType === 'TICKET' || value.mimeType !== 'application/pdf', {
    message: 'Personal photos must use an image format.',
    path: ['mimeType'],
  });

export const createCalendarEventSchema = z.object({
  mediaId: uuidSchema.nullable().optional(),
  eventType: z.enum(['WATCH_PLAN', 'RELEASE_REMINDER']).default('WATCH_PLAN'),
  title: z.string().trim().min(1).max(160),
  notes: z.string().trim().max(2_000).nullable().optional(),
  startsAt: z.iso.datetime({ offset: true }),
  timezone: z.string().trim().min(1).max(64),
  durationMinutes: z.number().int().min(15).max(1_440).default(120),
  reminderMinutes: z.array(z.number().int().min(0).max(43_200)).max(5).default([60]),
});

export const updateCalendarEventSchema = createCalendarEventSchema
  .partial()
  .extend({
    expectedVersion: z.number().int().min(1),
    status: z.enum(['SCHEDULED', 'CANCELLED', 'COMPLETED']).optional(),
  })
  .refine((value) => Object.keys(value).length > 1, 'At least one calendar field is required.');

export const updateReviewSchema = createReviewSchema
  .partial()
  .extend({
    expectedVersion: z.number().int().min(1),
  })
  .refine((value) => Object.keys(value).length > 1, 'At least one review field is required.');

export const createWatchlistSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1_000).nullable().optional(),
  visibility: z.enum(['PUBLIC', 'FRIENDS', 'PRIVATE', 'CLUB_ONLY']).default('PRIVATE'),
});

export const updateWatchlistSchema = createWatchlistSchema
  .partial()
  .extend({
    expectedVersion: z.number().int().min(1),
  })
  .refine((value) => Object.keys(value).length > 1, 'At least one watchlist field is required.');

export const addWatchlistItemSchema = z.object({
  mediaId: uuidSchema,
  note: z.string().trim().max(500).nullable().optional(),
});

export const recommendationFeedbackSchema = z.object({
  feedbackType: z.enum(['VIEWED', 'SAVED', 'DISMISSED', 'SELECTED']),
});

const searchListValue = (value: unknown) =>
  typeof value === 'string'
    ? value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
    : value;
const searchCategoryListSchema = z.preprocess(
  searchListValue,
  z.array(z.enum(['MEDIA', 'USER', 'PERSON', 'LIST', 'CLUB'])).max(5),
);
const searchUuidListSchema = z.preprocess(searchListValue, z.array(uuidSchema).max(20));

const searchBooleanSchema = z.preprocess(
  (value) => (value === 'true' ? true : value === 'false' ? false : value),
  z.boolean(),
);

export const unifiedSearchSchema = z
  .object({
    q: z.string().trim().max(120).default(''),
    language: languageTagSchema.default('en-US'),
    countryCode: countryCodeSchema.default('US'),
    categories: searchCategoryListSchema.default(['MEDIA', 'USER', 'PERSON', 'LIST', 'CLUB']),
    mediaType: z.enum(['MOVIE', 'TV']).optional(),
    genreIds: searchUuidListSchema.optional(),
    releaseYear: z.coerce.number().int().min(1870).max(2200).optional(),
    decade: z.coerce.number().int().min(1870).max(2200).multipleOf(10).optional(),
    runtimeMinimum: z.coerce.number().int().min(1).max(1_000).optional(),
    runtimeMaximum: z.coerce.number().int().min(1).max(1_000).optional(),
    originalLanguage: z.string().trim().min(2).max(16).optional(),
    productionCountry: countryCodeSchema.optional(),
    streamingProviderIds: searchUuidListSchema.optional(),
    minimumRating: z.coerce.number().min(0).max(10).optional(),
    minimumPopularity: z.coerce.number().min(0).max(1_000_000).optional(),
    friendsWatched: searchBooleanSchema.default(false),
    friendsRatedHighly: searchBooleanSchema.default(false),
    unwatchedOnly: searchBooleanSchema.default(false),
    limit: z.coerce.number().int().min(1).max(20).default(8),
  })
  .refine(
    (value) =>
      value.runtimeMinimum === undefined ||
      value.runtimeMaximum === undefined ||
      value.runtimeMinimum <= value.runtimeMaximum,
    { message: 'Minimum runtime cannot exceed maximum runtime.', path: ['runtimeMaximum'] },
  );

export const searchSuggestionsSchema = z.object({
  q: z.string().trim().min(1).max(120),
  limit: z.coerce.number().int().min(1).max(12).default(8),
});

export const searchHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export const intelligentDiscoverySchema = z.object({
  query: z.string().trim().min(3).max(500),
  language: languageTagSchema.default('en-US'),
  countryCode: countryCodeSchema.default('US'),
});

export const conversationalRecommendationSchema = intelligentDiscoverySchema.extend({
  turns: z
    .array(
      z.object({
        role: z.enum(['USER', 'ASSISTANT']),
        content: z.string().trim().min(1).max(1_000),
      }),
    )
    .max(12)
    .default([]),
});

export const reviewAssistantSchema = z.object({
  mediaId: uuidSchema,
  notes: z.string().trim().min(3).max(5_000),
  style: z.enum(['SHORT', 'DETAILED', 'FUNNY', 'SPOILER_FREE', 'SOCIAL_CAPTION']),
  containsSpoilers: z.boolean().default(false),
});

export const createFriendshipSchema = z.object({ addresseeUserId: uuidSchema });
export const respondFriendshipSchema = z.object({ action: z.enum(['ACCEPT', 'DECLINE']) });
export const createCommentSchema = z.object({
  body: z.string().trim().min(1).max(5_000),
  containsSpoilers: z.boolean().default(false),
  parentCommentId: uuidSchema.nullable().optional(),
});
export const blockUserSchema = z
  .object({
    reason: z.string().trim().max(500).nullable().optional(),
  })
  .default({});

export const reportContentSchema = z.object({
  entityType: z.enum(['REVIEW', 'COMMENT', 'CLUB', 'USER']),
  entityId: uuidSchema,
  reason: z.enum(['SPAM', 'HARASSMENT', 'EXPLICIT', 'SPOILERS', 'OTHER']),
  details: z.string().trim().max(1_000).optional(),
  blockAuthor: z.boolean().default(false),
});

export const notificationInboxQuerySchema = z.object({
  filter: z.enum(['all', 'unread']).default('all'),
});

export const registerPushDeviceSchema = z.object({
  installationId: z.string().trim().min(1).max(255),
  platform: z.enum(['IOS', 'ANDROID', 'WEB', 'UNKNOWN']),
  pushToken: z.string().trim().min(16).max(4_096).regex(/^\S+$/u),
  locale: languageTagSchema.optional(),
  timezone: z.string().trim().min(1).max(64).optional(),
});

export const statisticsPeriodSchema = z
  .object({
    periodStart: z.iso.datetime({ offset: true }),
    periodEnd: z.iso.datetime({ offset: true }),
    timezone: z.string().trim().min(1).max(64),
  })
  .refine((value) => new Date(value.periodStart) < new Date(value.periodEnd), {
    message: 'The period end must be after the period start.',
    path: ['periodEnd'],
  });

export const createWrapSchema = z
  .object({
    type: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']),
    periodStart: z.iso.datetime({ offset: true }).optional(),
    periodEnd: z.iso.datetime({ offset: true }).optional(),
    timezone: z.string().trim().min(1).max(64),
    inputVersion: z.number().int().min(1).max(10).default(1),
  })
  .refine((value) => (value.periodStart === undefined) === (value.periodEnd === undefined), {
    message: 'Period start and end must be supplied together.',
    path: ['periodEnd'],
  })
  .refine(
    (value) =>
      value.periodStart === undefined ||
      new Date(value.periodStart) < new Date(value.periodEnd ?? ''),
    { message: 'The period end must be after the period start.', path: ['periodEnd'] },
  );

export const createWrapShareSchema = z.object({
  expiresInMinutes: z.union([z.literal(15), z.literal(60), z.literal(1_440), z.literal(10_080)]),
  slideIndex: z.number().int().min(0).max(30).default(0),
  privacyAcknowledged: z.literal(true),
});

export const createClubSchema = z.object({
  name: z.string().trim().min(3).max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)
    .max(120)
    .optional(),
  description: z.string().trim().min(1).max(2_000),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).default('PUBLIC'),
  membershipType: z.enum(['OPEN', 'APPROVAL', 'INVITE_ONLY']).default('OPEN'),
  category: z.string().trim().min(1).max(80).nullable().optional(),
});

export const updateClubMembershipSchema = z.object({
  action: z.enum(['APPROVE', 'REMOVE']),
  role: z.enum(['ADMIN', 'MODERATOR', 'MEMBER']).optional(),
});

export const createClubPostSchema = z.object({
  postType: z.enum(['DISCUSSION', 'ANNOUNCEMENT']).default('DISCUSSION'),
  title: z.string().trim().min(1).max(160).nullable().optional(),
  body: z.string().trim().min(1).max(10_000),
  containsSpoilers: z.boolean().default(false),
});

export const createClubPollSchema = z
  .object({
    question: z.string().trim().min(1).max(500),
    allowMultiple: z.boolean().default(false),
    closesAt: z.iso.datetime({ offset: true }).nullable().optional(),
    options: z
      .array(
        z.object({
          label: z.string().trim().min(1).max(200),
          mediaId: uuidSchema.nullable().optional(),
        }),
      )
      .min(2)
      .max(10),
  })
  .refine(
    (value) =>
      new Set(value.options.map((option) => option.label.toLocaleLowerCase())).size ===
      value.options.length,
    { message: 'Poll option labels must be unique.', path: ['options'] },
  );

export const voteClubPollSchema = z.object({ optionId: uuidSchema });

export const addClubWatchlistItemSchema = z.object({
  mediaId: uuidSchema,
  note: z.string().trim().max(500).nullable().optional(),
});

export const voteClubWatchlistItemSchema = z.object({
  value: z.union([z.literal(-1), z.literal(1)]),
});

export const createClubWatchEventSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2_000).nullable().optional(),
  mediaId: uuidSchema.nullable().optional(),
  startsAt: z.iso.datetime({ offset: true }),
  timezone: z.string().trim().min(1).max(64),
  locationUrl: z.url().max(2_048).nullable().optional(),
});
