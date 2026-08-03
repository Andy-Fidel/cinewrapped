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
