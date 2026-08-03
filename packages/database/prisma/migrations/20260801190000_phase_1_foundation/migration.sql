-- CreateEnum
CREATE TYPE "ProfileVisibility" AS ENUM ('PUBLIC', 'FRIENDS', 'PRIVATE');

-- CreateEnum
CREATE TYPE "ContentVisibility" AS ENUM ('PUBLIC', 'FRIENDS', 'PRIVATE', 'CLUB_ONLY');

-- CreateEnum
CREATE TYPE "ThemePreference" AS ENUM ('SYSTEM', 'LIGHT', 'DARK');

-- CreateEnum
CREATE TYPE "SpoilerPreference" AS ENUM ('ALWAYS_HIDE', 'HIDE_UNTIL_REVEALED', 'SHOW');

-- CreateEnum
CREATE TYPE "RatingSystem" AS ENUM ('FIVE_STAR', 'TEN_POINT', 'LIKE_DISLIKE');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('MOVIE', 'TV', 'ANIME', 'DOCUMENTARY', 'SHORT_FILM');

-- CreateEnum
CREATE TYPE "GenrePreferenceType" AS ENUM ('PREFERRED', 'DISLIKED');

-- CreateEnum
CREATE TYPE "OnboardingStep" AS ENUM ('PROFILE', 'CONTENT_TYPES', 'GENRES', 'FAVORITES', 'DISLIKES', 'STREAMING', 'RECOMMENDATIONS', 'SOCIAL', 'NOTIFICATIONS');

-- CreateEnum
CREATE TYPE "SessionPlatform" AS ENUM ('IOS', 'ANDROID', 'WEB', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('MOVIE', 'TV');

-- CreateEnum
CREATE TYPE "ExternalProvider" AS ENUM ('TMDB');

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('RUMORED', 'PLANNED', 'IN_PRODUCTION', 'POST_PRODUCTION', 'RELEASED', 'RETURNING_SERIES', 'ENDED', 'CANCELED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "CreditType" AS ENUM ('CAST', 'CREW');

-- CreateEnum
CREATE TYPE "StreamingMonetizationType" AS ENUM ('FLATRATE', 'FREE', 'ADS', 'RENT', 'BUY');

-- CreateEnum
CREATE TYPE "WatchStatus" AS ENUM ('PLANNED', 'WATCHING', 'COMPLETED', 'PAUSED', 'DROPPED', 'REWATCHING');

-- CreateEnum
CREATE TYPE "WatchSource" AS ENUM ('MANUAL', 'IMPORT', 'API', 'OFFLINE_SYNC');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'HIDDEN', 'REMOVED');

-- CreateEnum
CREATE TYPE "FollowStatus" AS ENUM ('ACTIVE');

-- CreateEnum
CREATE TYPE "FriendshipStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "FeedActivityType" AS ENUM ('USER_WATCHED_MEDIA', 'USER_RATED_MEDIA', 'USER_REVIEWED_MEDIA', 'USER_CREATED_LIST', 'USER_UNLOCKED_ACHIEVEMENT', 'USER_JOINED_CLUB', 'USER_SHARED_WRAP');

-- CreateEnum
CREATE TYPE "ActivityEntityType" AS ENUM ('VIEWING', 'RATING', 'REVIEW', 'WATCHLIST', 'COLLECTION', 'ACHIEVEMENT', 'CLUB', 'WRAP');

-- CreateEnum
CREATE TYPE "CommentParentType" AS ENUM ('REVIEW', 'WATCHLIST', 'COLLECTION', 'FEED_ACTIVITY', 'CLUB_POST', 'WRAP');

-- CreateEnum
CREATE TYPE "ReactionTargetType" AS ENUM ('REVIEW', 'COMMENT', 'WATCHLIST', 'COLLECTION', 'FEED_ACTIVITY', 'CLUB_POST', 'WRAP');

-- CreateEnum
CREATE TYPE "ReactionType" AS ENUM ('LIKE', 'LOVE', 'LAUGH', 'WOW', 'SAD');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('FRIEND_REQUEST', 'FRIEND_REQUEST_ACCEPTED', 'COMMENT', 'REACTION', 'NEW_FOLLOWER', 'WRAP_READY', 'ACHIEVEMENT_UNLOCKED', 'SHARED_TITLE');

-- CreateEnum
CREATE TYPE "NotificationEntityType" AS ENUM ('USER', 'FRIENDSHIP', 'COMMENT', 'REACTION', 'REVIEW', 'MEDIA', 'WRAP', 'ACHIEVEMENT');

-- CreateEnum
CREATE TYPE "DeliveryChannel" AS ENUM ('IN_APP', 'PUSH', 'EMAIL');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "DevicePlatform" AS ENUM ('IOS', 'ANDROID', 'WEB');

-- CreateEnum
CREATE TYPE "AchievementTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');

-- CreateEnum
CREATE TYPE "WrapType" AS ENUM ('WEEKLY', 'MONTHLY', 'YEARLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "WrapStatus" AS ENUM ('PENDING', 'GENERATING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "RecommendationType" AS ENUM ('PERSONALIZED', 'TRENDING', 'FRIEND_BASED', 'MOOD_BASED', 'SIMILAR_MEDIA', 'HIDDEN_GEM', 'CONTINUE_WATCHING', 'BECAUSE_YOU_WATCHED');

-- CreateEnum
CREATE TYPE "RecommendationFeedbackType" AS ENUM ('VIEWED', 'SAVED', 'DISMISSED', 'SELECTED');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMINISTRATOR', 'CONTENT_MODERATOR', 'COMMUNITY_MODERATOR', 'SUPPORT_AGENT', 'ANALYST');

-- CreateEnum
CREATE TYPE "AuditActorType" AS ENUM ('USER', 'ADMIN', 'SYSTEM');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "IdempotencyStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "authProvider" VARCHAR(32) NOT NULL DEFAULT 'supabase',
    "authSubject" VARCHAR(255) NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "emailNormalized" VARCHAR(320) NOT NULL,
    "username" VARCHAR(30) NOT NULL,
    "usernameNormalized" VARCHAR(30) NOT NULL,
    "displayName" VARCHAR(80) NOT NULL,
    "avatarUrl" VARCHAR(2048),
    "bio" VARCHAR(500),
    "countryCode" CHAR(2) NOT NULL,
    "preferredLanguage" VARCHAR(16) NOT NULL,
    "timezone" VARCHAR(64) NOT NULL,
    "dateOfBirth" DATE,
    "profileVisibility" "ProfileVisibility" NOT NULL DEFAULT 'PRIVATE',
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "recommendationOptIn" BOOLEAN NOT NULL DEFAULT true,
    "analyticsOptIn" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" VARCHAR(255) NOT NULL,
    "userId" UUID NOT NULL,
    "installationId" VARCHAR(255),
    "platform" "SessionPlatform" NOT NULL DEFAULT 'UNKNOWN',
    "deviceName" VARCHAR(120),
    "userAgent" VARCHAR(500),
    "ipAddressHash" CHAR(64),
    "expiresAt" TIMESTAMPTZ(3),
    "lastSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_progress" (
    "userId" UUID NOT NULL,
    "currentStep" "OnboardingStep" NOT NULL DEFAULT 'PROFILE',
    "completedSteps" "OnboardingStep"[] DEFAULT ARRAY[]::"OnboardingStep"[],
    "acceptedPrivacyVersion" VARCHAR(40),
    "acceptedTermsVersion" VARCHAR(40),
    "completedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "onboarding_progress_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "userId" UUID NOT NULL,
    "preferredLanguages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredCountries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredDecades" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "preferredRuntimeMin" INTEGER,
    "preferredRuntimeMax" INTEGER,
    "preferredRatingSystem" "RatingSystem" NOT NULL DEFAULT 'FIVE_STAR',
    "contentTypes" "ContentType"[] DEFAULT ARRAY['MOVIE', 'TV']::"ContentType"[],
    "spoilerPreference" "SpoilerPreference" NOT NULL DEFAULT 'HIDE_UNTIL_REVEALED',
    "adultContentEnabled" BOOLEAN NOT NULL DEFAULT false,
    "notificationPreferences" JSONB NOT NULL DEFAULT '{}',
    "theme" "ThemePreference" NOT NULL DEFAULT 'SYSTEM',
    "defaultCountryForStreaming" CHAR(2) NOT NULL,
    "autoplayTrailers" BOOLEAN NOT NULL DEFAULT false,
    "reduceMotion" BOOLEAN NOT NULL DEFAULT false,
    "mainstreamPreferencePercent" INTEGER NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "user_genre_preferences" (
    "userId" UUID NOT NULL,
    "genreId" UUID NOT NULL,
    "preferenceType" "GenrePreferenceType" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_genre_preferences_pkey" PRIMARY KEY ("userId","genreId")
);

-- CreateTable
CREATE TABLE "privacy_settings" (
    "userId" UUID NOT NULL,
    "watchHistoryVisibility" "ContentVisibility" NOT NULL DEFAULT 'PRIVATE',
    "ratingsVisibility" "ContentVisibility" NOT NULL DEFAULT 'FRIENDS',
    "reviewsVisibility" "ContentVisibility" NOT NULL DEFAULT 'PUBLIC',
    "listsVisibility" "ContentVisibility" NOT NULL DEFAULT 'FRIENDS',
    "friendListVisibility" "ContentVisibility" NOT NULL DEFAULT 'FRIENDS',
    "wrapsVisibility" "ContentVisibility" NOT NULL DEFAULT 'PRIVATE',
    "onlineStatusVisibility" "ContentVisibility" NOT NULL DEFAULT 'PRIVATE',
    "shareWatchActivity" BOOLEAN NOT NULL DEFAULT false,
    "shareRatingActivity" BOOLEAN NOT NULL DEFAULT false,
    "shareReviewActivity" BOOLEAN NOT NULL DEFAULT false,
    "shareListActivity" BOOLEAN NOT NULL DEFAULT false,
    "shareAchievementActivity" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "privacy_settings_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "genres" (
    "id" UUID NOT NULL,
    "provider" "ExternalProvider" NOT NULL,
    "externalId" VARCHAR(64) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "genres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" UUID NOT NULL,
    "externalProvider" "ExternalProvider" NOT NULL,
    "externalId" VARCHAR(64) NOT NULL,
    "mediaType" "MediaType" NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "originalTitle" VARCHAR(300) NOT NULL,
    "overview" TEXT,
    "releaseDate" DATE,
    "releaseYear" INTEGER,
    "runtimeMinutes" INTEGER,
    "originalLanguage" VARCHAR(16),
    "countryCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "posterUrl" VARCHAR(2048),
    "backdropUrl" VARCHAR(2048),
    "trailerUrl" VARCHAR(2048),
    "status" "MediaStatus" NOT NULL DEFAULT 'UNKNOWN',
    "averageProviderRating" DECIMAL(4,2),
    "providerPopularity" DECIMAL(12,4),
    "ageRating" VARCHAR(32),
    "metadataJson" JSONB NOT NULL DEFAULT '{}',
    "lastSyncedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_genres" (
    "mediaId" UUID NOT NULL,
    "genreId" UUID NOT NULL,

    CONSTRAINT "media_genres_pkey" PRIMARY KEY ("mediaId","genreId")
);

-- CreateTable
CREATE TABLE "people" (
    "id" UUID NOT NULL,
    "externalProvider" "ExternalProvider" NOT NULL,
    "externalId" VARCHAR(64) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "profileUrl" VARCHAR(2048),
    "metadataJson" JSONB NOT NULL DEFAULT '{}',
    "lastSyncedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "people_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credits" (
    "id" UUID NOT NULL,
    "mediaId" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "creditType" "CreditType" NOT NULL,
    "department" VARCHAR(100),
    "job" VARCHAR(120),
    "character" VARCHAR(300),
    "position" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_companies" (
    "id" UUID NOT NULL,
    "externalProvider" "ExternalProvider" NOT NULL,
    "externalId" VARCHAR(64) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "logoUrl" VARCHAR(2048),
    "countryCode" CHAR(2),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "production_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_production_companies" (
    "mediaId" UUID NOT NULL,
    "companyId" UUID NOT NULL,

    CONSTRAINT "media_production_companies_pkey" PRIMARY KEY ("mediaId","companyId")
);

-- CreateTable
CREATE TABLE "tv_seasons" (
    "id" UUID NOT NULL,
    "mediaId" UUID NOT NULL,
    "externalProvider" "ExternalProvider" NOT NULL,
    "externalId" VARCHAR(64) NOT NULL,
    "seasonNumber" INTEGER NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "overview" TEXT,
    "airDate" DATE,
    "episodeCount" INTEGER,
    "posterUrl" VARCHAR(2048),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tv_seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tv_episodes" (
    "id" UUID NOT NULL,
    "seasonId" UUID NOT NULL,
    "externalProvider" "ExternalProvider" NOT NULL,
    "externalId" VARCHAR(64) NOT NULL,
    "episodeNumber" INTEGER NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "overview" TEXT,
    "airDate" DATE,
    "runtimeMinutes" INTEGER,
    "stillUrl" VARCHAR(2048),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tv_episodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "streaming_providers" (
    "id" UUID NOT NULL,
    "externalProvider" "ExternalProvider" NOT NULL,
    "externalId" VARCHAR(64) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(140) NOT NULL,
    "logoUrl" VARCHAR(2048),
    "displayPriority" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "streaming_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_streaming_availability" (
    "id" UUID NOT NULL,
    "mediaId" UUID NOT NULL,
    "streamingProviderId" UUID NOT NULL,
    "countryCode" CHAR(2) NOT NULL,
    "monetizationType" "StreamingMonetizationType" NOT NULL,
    "providerUrl" VARCHAR(2048),
    "displayPriority" INTEGER,
    "fetchedAt" TIMESTAMPTZ(3) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "media_streaming_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_favorite_media" (
    "userId" UUID NOT NULL,
    "mediaId" UUID NOT NULL,
    "position" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_favorite_media_pkey" PRIMARY KEY ("userId","mediaId")
);

-- CreateTable
CREATE TABLE "user_streaming_preferences" (
    "userId" UUID NOT NULL,
    "streamingProviderId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_streaming_preferences_pkey" PRIMARY KEY ("userId","streamingProviderId")
);

-- CreateTable
CREATE TABLE "watch_history" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "mediaId" UUID NOT NULL,
    "status" "WatchStatus" NOT NULL DEFAULT 'PLANNED',
    "startedAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),
    "progressPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "progressSeconds" INTEGER,
    "watchCount" INTEGER NOT NULL DEFAULT 0,
    "lastWatchedAt" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "watch_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viewings" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "mediaId" UUID NOT NULL,
    "watchHistoryId" UUID NOT NULL,
    "clientOperationId" UUID,
    "watchedAt" TIMESTAMPTZ(3) NOT NULL,
    "completedAt" TIMESTAMPTZ(3),
    "durationWatchedMin" INTEGER,
    "viewingPlatform" VARCHAR(120),
    "viewingLocation" VARCHAR(200),
    "source" "WatchSource" NOT NULL DEFAULT 'MANUAL',
    "notes" TEXT,
    "isRewatch" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "viewings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viewing_companions" (
    "viewingId" UUID NOT NULL,
    "companionUserId" UUID NOT NULL,

    CONSTRAINT "viewing_companions_pkey" PRIMARY KEY ("viewingId","companionUserId")
);

-- CreateTable
CREATE TABLE "episode_watch_history" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "episodeId" UUID NOT NULL,
    "clientOperationId" UUID,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "progressSeconds" INTEGER,
    "watchedAt" TIMESTAMPTZ(3),
    "watchCount" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "episode_watch_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlists" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(1000),
    "visibility" "ContentVisibility" NOT NULL DEFAULT 'PRIVATE',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isCollaborative" BOOLEAN NOT NULL DEFAULT false,
    "coverImageUrl" VARCHAR(2048),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "watchlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlist_items" (
    "id" UUID NOT NULL,
    "watchlistId" UUID NOT NULL,
    "mediaId" UUID NOT NULL,
    "addedByUserId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "note" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ratings" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "mediaId" UUID NOT NULL,
    "ratingValue" DECIMAL(4,2),
    "ratingScale" INTEGER,
    "normalizedScore" DECIMAL(5,2),
    "liked" BOOLEAN,
    "emotionalTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "mediaId" UUID NOT NULL,
    "title" VARCHAR(160),
    "body" TEXT NOT NULL,
    "containsSpoilers" BOOLEAN NOT NULL DEFAULT false,
    "visibility" "ContentVisibility" NOT NULL DEFAULT 'PUBLIC',
    "status" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follows" (
    "followerId" UUID NOT NULL,
    "followingId" UUID NOT NULL,
    "status" "FollowStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("followerId","followingId")
);

-- CreateTable
CREATE TABLE "friendships" (
    "id" UUID NOT NULL,
    "userAId" UUID NOT NULL,
    "userBId" UUID NOT NULL,
    "requesterId" UUID NOT NULL,
    "addresseeId" UUID NOT NULL,
    "status" "FriendshipStatus" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "friendships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_blocks" (
    "blockerId" UUID NOT NULL,
    "blockedId" UUID NOT NULL,
    "reason" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("blockerId","blockedId")
);

-- CreateTable
CREATE TABLE "user_mutes" (
    "muterId" UUID NOT NULL,
    "mutedId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_mutes_pkey" PRIMARY KEY ("muterId","mutedId")
);

-- CreateTable
CREATE TABLE "feed_activities" (
    "id" UUID NOT NULL,
    "actorUserId" UUID NOT NULL,
    "activityType" "FeedActivityType" NOT NULL,
    "entityType" "ActivityEntityType" NOT NULL,
    "entityId" UUID NOT NULL,
    "mediaId" UUID,
    "visibility" "ContentVisibility" NOT NULL DEFAULT 'FRIENDS',
    "metadataJson" JSONB NOT NULL DEFAULT '{}',
    "occurredAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "feed_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "parentType" "CommentParentType" NOT NULL,
    "parentId" UUID NOT NULL,
    "parentCommentId" UUID,
    "body" VARCHAR(5000) NOT NULL,
    "containsSpoilers" BOOLEAN NOT NULL DEFAULT false,
    "visibility" "ContentVisibility" NOT NULL DEFAULT 'PUBLIC',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reactions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "targetType" "ReactionTargetType" NOT NULL,
    "targetId" UUID NOT NULL,
    "reactionType" "ReactionType" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "actorUserId" UUID,
    "entityType" "NotificationEntityType" NOT NULL,
    "entityId" UUID NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "body" VARCHAR(500) NOT NULL,
    "deepLink" VARCHAR(1000),
    "readAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_devices" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "installationId" VARCHAR(255) NOT NULL,
    "platform" "DevicePlatform" NOT NULL,
    "pushTokenHash" VARCHAR(128) NOT NULL,
    "encryptedToken" TEXT NOT NULL,
    "locale" VARCHAR(16),
    "timezone" VARCHAR(64),
    "lastSeenAt" TIMESTAMPTZ(3) NOT NULL,
    "disabledAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "push_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_deliveries" (
    "id" UUID NOT NULL,
    "notificationId" UUID NOT NULL,
    "channel" "DeliveryChannel" NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "providerMessageId" VARCHAR(255),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMPTZ(3),
    "deliveredAt" TIMESTAMPTZ(3),
    "errorCode" VARCHAR(100),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" UUID NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "category" VARCHAR(80) NOT NULL,
    "iconUrl" VARCHAR(2048),
    "criteriaJson" JSONB NOT NULL,
    "tier" "AchievementTier" NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_achievements" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "achievementId" UUID NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "target" INTEGER NOT NULL,
    "unlockedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wraps" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "wrapType" "WrapType" NOT NULL,
    "periodStart" TIMESTAMPTZ(3) NOT NULL,
    "periodEnd" TIMESTAMPTZ(3) NOT NULL,
    "timezone" VARCHAR(64) NOT NULL,
    "status" "WrapStatus" NOT NULL DEFAULT 'PENDING',
    "inputVersion" INTEGER NOT NULL DEFAULT 1,
    "statisticsJson" JSONB,
    "highlightsJson" JSONB,
    "storySlidesJson" JSONB,
    "shareImageUrl" VARCHAR(2048),
    "failureCode" VARCHAR(100),
    "generatedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "wraps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "mediaId" UUID NOT NULL,
    "score" DECIMAL(7,6) NOT NULL,
    "recommendationType" "RecommendationType" NOT NULL,
    "explanation" VARCHAR(500) NOT NULL,
    "reasonCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "contextJson" JSONB NOT NULL DEFAULT '{}',
    "modelVersion" VARCHAR(64) NOT NULL,
    "generatedAt" TIMESTAMPTZ(3) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "dismissedAt" TIMESTAMPTZ(3),
    "viewedAt" TIMESTAMPTZ(3),
    "selectedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_feedback" (
    "id" UUID NOT NULL,
    "recommendationId" UUID NOT NULL,
    "feedbackType" "RecommendationFeedbackType" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendation_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_role_assignments" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "AdminRole" NOT NULL,
    "grantedById" UUID,
    "grantedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMPTZ(3),

    CONSTRAINT "user_role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorType" "AuditActorType" NOT NULL,
    "actorUserId" UUID,
    "actorSubject" VARCHAR(255),
    "action" VARCHAR(120) NOT NULL,
    "targetType" VARCHAR(120) NOT NULL,
    "targetId" UUID,
    "requestId" VARCHAR(100),
    "ipHash" VARCHAR(128),
    "userAgentHash" VARCHAR(128),
    "reason" VARCHAR(500),
    "metadataJson" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL,
    "aggregateType" VARCHAR(100) NOT NULL,
    "aggregateId" UUID NOT NULL,
    "eventType" VARCHAR(160) NOT NULL,
    "eventVersion" INTEGER NOT NULL DEFAULT 1,
    "payloadJson" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMPTZ(3),
    "publishedAt" TIMESTAMPTZ(3),
    "lastErrorCode" VARCHAR(100),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_records" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "idempotencyKey" VARCHAR(128) NOT NULL,
    "requestMethod" VARCHAR(10) NOT NULL,
    "requestPath" VARCHAR(500) NOT NULL,
    "requestHash" VARCHAR(128) NOT NULL,
    "status" "IdempotencyStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "responseStatus" INTEGER,
    "responseJson" JSONB,
    "errorCode" VARCHAR(100),
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_authSubject_key" ON "users"("authSubject");

-- CreateIndex
CREATE UNIQUE INDEX "users_emailNormalized_key" ON "users"("emailNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "users_usernameNormalized_key" ON "users"("usernameNormalized");

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");

-- CreateIndex
CREATE INDEX "users_createdAt_id_idx" ON "users"("createdAt", "id");

-- CreateIndex
CREATE INDEX "auth_sessions_userId_revokedAt_lastSeenAt_idx" ON "auth_sessions"("userId", "revokedAt", "lastSeenAt" DESC);

-- CreateIndex
CREATE INDEX "auth_sessions_expiresAt_idx" ON "auth_sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "onboarding_progress_currentStep_updatedAt_idx" ON "onboarding_progress"("currentStep", "updatedAt");

-- CreateIndex
CREATE INDEX "user_genre_preferences_genreId_preferenceType_userId_idx" ON "user_genre_preferences"("genreId", "preferenceType", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "genres_slug_key" ON "genres"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "genres_provider_externalId_key" ON "genres"("provider", "externalId");

-- CreateIndex
CREATE INDEX "media_mediaType_providerPopularity_idx" ON "media"("mediaType", "providerPopularity" DESC);

-- CreateIndex
CREATE INDEX "media_mediaType_releaseDate_idx" ON "media"("mediaType", "releaseDate" DESC);

-- CreateIndex
CREATE INDEX "media_lastSyncedAt_idx" ON "media"("lastSyncedAt");

-- CreateIndex
CREATE INDEX "media_title_idx" ON "media"("title");

-- CreateIndex
CREATE UNIQUE INDEX "media_externalProvider_externalId_mediaType_key" ON "media"("externalProvider", "externalId", "mediaType");

-- CreateIndex
CREATE INDEX "media_genres_genreId_mediaId_idx" ON "media_genres"("genreId", "mediaId");

-- CreateIndex
CREATE INDEX "people_name_idx" ON "people"("name");

-- CreateIndex
CREATE UNIQUE INDEX "people_externalProvider_externalId_key" ON "people"("externalProvider", "externalId");

-- CreateIndex
CREATE INDEX "credits_personId_creditType_mediaId_idx" ON "credits"("personId", "creditType", "mediaId");

-- CreateIndex
CREATE INDEX "credits_mediaId_creditType_position_idx" ON "credits"("mediaId", "creditType", "position");

-- CreateIndex
CREATE UNIQUE INDEX "credits_mediaId_personId_creditType_job_character_key" ON "credits"("mediaId", "personId", "creditType", "job", "character");

-- CreateIndex
CREATE UNIQUE INDEX "production_companies_externalProvider_externalId_key" ON "production_companies"("externalProvider", "externalId");

-- CreateIndex
CREATE INDEX "media_production_companies_companyId_mediaId_idx" ON "media_production_companies"("companyId", "mediaId");

-- CreateIndex
CREATE INDEX "tv_seasons_mediaId_seasonNumber_idx" ON "tv_seasons"("mediaId", "seasonNumber");

-- CreateIndex
CREATE UNIQUE INDEX "tv_seasons_mediaId_seasonNumber_key" ON "tv_seasons"("mediaId", "seasonNumber");

-- CreateIndex
CREATE UNIQUE INDEX "tv_seasons_externalProvider_externalId_key" ON "tv_seasons"("externalProvider", "externalId");

-- CreateIndex
CREATE INDEX "tv_episodes_seasonId_episodeNumber_idx" ON "tv_episodes"("seasonId", "episodeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "tv_episodes_seasonId_episodeNumber_key" ON "tv_episodes"("seasonId", "episodeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "tv_episodes_externalProvider_externalId_key" ON "tv_episodes"("externalProvider", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "streaming_providers_slug_key" ON "streaming_providers"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "streaming_providers_externalProvider_externalId_key" ON "streaming_providers"("externalProvider", "externalId");

-- CreateIndex
CREATE INDEX "media_streaming_availability_countryCode_streamingProviderI_idx" ON "media_streaming_availability"("countryCode", "streamingProviderId", "monetizationType", "mediaId");

-- CreateIndex
CREATE INDEX "media_streaming_availability_expiresAt_idx" ON "media_streaming_availability"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "media_streaming_availability_mediaId_streamingProviderId_co_key" ON "media_streaming_availability"("mediaId", "streamingProviderId", "countryCode", "monetizationType");

-- CreateIndex
CREATE INDEX "user_favorite_media_userId_position_idx" ON "user_favorite_media"("userId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "user_favorite_media_userId_position_key" ON "user_favorite_media"("userId", "position");

-- CreateIndex
CREATE INDEX "user_streaming_preferences_streamingProviderId_userId_idx" ON "user_streaming_preferences"("streamingProviderId", "userId");

-- CreateIndex
CREATE INDEX "watch_history_userId_status_updatedAt_idx" ON "watch_history"("userId", "status", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "watch_history_userId_lastWatchedAt_idx" ON "watch_history"("userId", "lastWatchedAt" DESC);

-- CreateIndex
CREATE INDEX "watch_history_mediaId_status_idx" ON "watch_history"("mediaId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "watch_history_userId_mediaId_key" ON "watch_history"("userId", "mediaId");

-- CreateIndex
CREATE INDEX "viewings_userId_watchedAt_id_idx" ON "viewings"("userId", "watchedAt" DESC, "id");

-- CreateIndex
CREATE INDEX "viewings_mediaId_watchedAt_idx" ON "viewings"("mediaId", "watchedAt" DESC);

-- CreateIndex
CREATE INDEX "viewings_watchHistoryId_watchedAt_idx" ON "viewings"("watchHistoryId", "watchedAt" DESC);

-- CreateIndex
CREATE INDEX "viewings_deletedAt_idx" ON "viewings"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "viewings_userId_clientOperationId_key" ON "viewings"("userId", "clientOperationId");

-- CreateIndex
CREATE INDEX "viewing_companions_companionUserId_viewingId_idx" ON "viewing_companions"("companionUserId", "viewingId");

-- CreateIndex
CREATE INDEX "episode_watch_history_userId_watchedAt_idx" ON "episode_watch_history"("userId", "watchedAt" DESC);

-- CreateIndex
CREATE INDEX "episode_watch_history_episodeId_completed_idx" ON "episode_watch_history"("episodeId", "completed");

-- CreateIndex
CREATE UNIQUE INDEX "episode_watch_history_userId_episodeId_key" ON "episode_watch_history"("userId", "episodeId");

-- CreateIndex
CREATE UNIQUE INDEX "episode_watch_history_userId_clientOperationId_key" ON "episode_watch_history"("userId", "clientOperationId");

-- CreateIndex
CREATE INDEX "watchlists_userId_updatedAt_idx" ON "watchlists"("userId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "watchlists_userId_isDefault_idx" ON "watchlists"("userId", "isDefault");

-- CreateIndex
CREATE INDEX "watchlists_deletedAt_idx" ON "watchlists"("deletedAt");

-- CreateIndex
CREATE INDEX "watchlist_items_mediaId_createdAt_idx" ON "watchlist_items"("mediaId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "watchlist_items_watchlistId_mediaId_key" ON "watchlist_items"("watchlistId", "mediaId");

-- CreateIndex
CREATE UNIQUE INDEX "watchlist_items_watchlistId_position_key" ON "watchlist_items"("watchlistId", "position");

-- CreateIndex
CREATE INDEX "ratings_userId_updatedAt_idx" ON "ratings"("userId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "ratings_mediaId_normalizedScore_idx" ON "ratings"("mediaId", "normalizedScore" DESC);

-- CreateIndex
CREATE INDEX "ratings_deletedAt_idx" ON "ratings"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ratings_userId_mediaId_key" ON "ratings"("userId", "mediaId");

-- CreateIndex
CREATE INDEX "reviews_userId_status_updatedAt_idx" ON "reviews"("userId", "status", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "reviews_mediaId_status_publishedAt_id_idx" ON "reviews"("mediaId", "status", "publishedAt" DESC, "id");

-- CreateIndex
CREATE INDEX "reviews_visibility_status_publishedAt_id_idx" ON "reviews"("visibility", "status", "publishedAt" DESC, "id");

-- CreateIndex
CREATE INDEX "reviews_deletedAt_idx" ON "reviews"("deletedAt");

-- CreateIndex
CREATE INDEX "follows_followingId_createdAt_idx" ON "follows"("followingId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "friendships_requesterId_status_createdAt_idx" ON "friendships"("requesterId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "friendships_addresseeId_status_createdAt_idx" ON "friendships"("addresseeId", "status", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "friendships_userAId_userBId_key" ON "friendships"("userAId", "userBId");

-- CreateIndex
CREATE INDEX "user_blocks_blockedId_blockerId_idx" ON "user_blocks"("blockedId", "blockerId");

-- CreateIndex
CREATE INDEX "user_mutes_mutedId_muterId_idx" ON "user_mutes"("mutedId", "muterId");

-- CreateIndex
CREATE INDEX "feed_activities_actorUserId_occurredAt_id_idx" ON "feed_activities"("actorUserId", "occurredAt" DESC, "id");

-- CreateIndex
CREATE INDEX "feed_activities_visibility_occurredAt_id_idx" ON "feed_activities"("visibility", "occurredAt" DESC, "id");

-- CreateIndex
CREATE INDEX "feed_activities_mediaId_occurredAt_idx" ON "feed_activities"("mediaId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "feed_activities_deletedAt_idx" ON "feed_activities"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "feed_activities_activityType_entityType_entityId_key" ON "feed_activities"("activityType", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "comments_parentType_parentId_createdAt_id_idx" ON "comments"("parentType", "parentId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "comments_userId_createdAt_idx" ON "comments"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "comments_parentCommentId_createdAt_id_idx" ON "comments"("parentCommentId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "comments_deletedAt_idx" ON "comments"("deletedAt");

-- CreateIndex
CREATE INDEX "reactions_targetType_targetId_reactionType_idx" ON "reactions"("targetType", "targetId", "reactionType");

-- CreateIndex
CREATE INDEX "reactions_userId_createdAt_idx" ON "reactions"("userId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "reactions_userId_targetType_targetId_reactionType_key" ON "reactions"("userId", "targetType", "targetId", "reactionType");

-- CreateIndex
CREATE INDEX "notifications_userId_readAt_createdAt_id_idx" ON "notifications"("userId", "readAt", "createdAt" DESC, "id");

-- CreateIndex
CREATE INDEX "notifications_actorUserId_createdAt_idx" ON "notifications"("actorUserId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "notifications_deletedAt_idx" ON "notifications"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "push_devices_pushTokenHash_key" ON "push_devices"("pushTokenHash");

-- CreateIndex
CREATE INDEX "push_devices_userId_disabledAt_idx" ON "push_devices"("userId", "disabledAt");

-- CreateIndex
CREATE UNIQUE INDEX "push_devices_userId_installationId_key" ON "push_devices"("userId", "installationId");

-- CreateIndex
CREATE INDEX "notification_deliveries_status_createdAt_idx" ON "notification_deliveries"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "notification_deliveries_notificationId_channel_key" ON "notification_deliveries"("notificationId", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "achievements_code_key" ON "achievements"("code");

-- CreateIndex
CREATE INDEX "achievements_isActive_category_tier_idx" ON "achievements"("isActive", "category", "tier");

-- CreateIndex
CREATE INDEX "user_achievements_userId_unlockedAt_idx" ON "user_achievements"("userId", "unlockedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "user_achievements_userId_achievementId_key" ON "user_achievements"("userId", "achievementId");

-- CreateIndex
CREATE INDEX "wraps_userId_periodEnd_id_idx" ON "wraps"("userId", "periodEnd" DESC, "id");

-- CreateIndex
CREATE INDEX "wraps_status_createdAt_idx" ON "wraps"("status", "createdAt");

-- CreateIndex
CREATE INDEX "wraps_deletedAt_idx" ON "wraps"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "wraps_userId_wrapType_periodStart_periodEnd_inputVersion_key" ON "wraps"("userId", "wrapType", "periodStart", "periodEnd", "inputVersion");

-- CreateIndex
CREATE INDEX "recommendations_userId_recommendationType_expiresAt_score_idx" ON "recommendations"("userId", "recommendationType", "expiresAt", "score" DESC);

-- CreateIndex
CREATE INDEX "recommendations_userId_dismissedAt_expiresAt_score_idx" ON "recommendations"("userId", "dismissedAt", "expiresAt", "score" DESC);

-- CreateIndex
CREATE INDEX "recommendations_mediaId_generatedAt_idx" ON "recommendations"("mediaId", "generatedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "recommendations_userId_mediaId_recommendationType_modelVers_key" ON "recommendations"("userId", "mediaId", "recommendationType", "modelVersion", "generatedAt");

-- CreateIndex
CREATE INDEX "recommendation_feedback_feedbackType_createdAt_idx" ON "recommendation_feedback"("feedbackType", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "recommendation_feedback_recommendationId_feedbackType_key" ON "recommendation_feedback"("recommendationId", "feedbackType");

-- CreateIndex
CREATE INDEX "user_role_assignments_role_revokedAt_idx" ON "user_role_assignments"("role", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_role_assignments_userId_role_key" ON "user_role_assignments"("userId", "role");

-- CreateIndex
CREATE INDEX "audit_logs_actorUserId_occurredAt_idx" ON "audit_logs"("actorUserId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_targetType_targetId_occurredAt_idx" ON "audit_logs"("targetType", "targetId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_action_occurredAt_idx" ON "audit_logs"("action", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_requestId_idx" ON "audit_logs"("requestId");

-- CreateIndex
CREATE INDEX "outbox_events_status_availableAt_createdAt_idx" ON "outbox_events"("status", "availableAt", "createdAt");

-- CreateIndex
CREATE INDEX "outbox_events_aggregateType_aggregateId_createdAt_idx" ON "outbox_events"("aggregateType", "aggregateId", "createdAt");

-- CreateIndex
CREATE INDEX "outbox_events_publishedAt_idx" ON "outbox_events"("publishedAt");

-- CreateIndex
CREATE INDEX "idempotency_records_expiresAt_idx" ON "idempotency_records"("expiresAt");

-- CreateIndex
CREATE INDEX "idempotency_records_status_createdAt_idx" ON "idempotency_records"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_records_userId_idempotencyKey_key" ON "idempotency_records"("userId", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_progress" ADD CONSTRAINT "onboarding_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_genre_preferences" ADD CONSTRAINT "user_genre_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_genre_preferences" ADD CONSTRAINT "user_genre_preferences_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "genres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "privacy_settings" ADD CONSTRAINT "privacy_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_genres" ADD CONSTRAINT "media_genres_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_genres" ADD CONSTRAINT "media_genres_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "genres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credits" ADD CONSTRAINT "credits_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credits" ADD CONSTRAINT "credits_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_production_companies" ADD CONSTRAINT "media_production_companies_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_production_companies" ADD CONSTRAINT "media_production_companies_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "production_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tv_seasons" ADD CONSTRAINT "tv_seasons_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tv_episodes" ADD CONSTRAINT "tv_episodes_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "tv_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_streaming_availability" ADD CONSTRAINT "media_streaming_availability_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_streaming_availability" ADD CONSTRAINT "media_streaming_availability_streamingProviderId_fkey" FOREIGN KEY ("streamingProviderId") REFERENCES "streaming_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_favorite_media" ADD CONSTRAINT "user_favorite_media_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_favorite_media" ADD CONSTRAINT "user_favorite_media_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_streaming_preferences" ADD CONSTRAINT "user_streaming_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_streaming_preferences" ADD CONSTRAINT "user_streaming_preferences_streamingProviderId_fkey" FOREIGN KEY ("streamingProviderId") REFERENCES "streaming_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watch_history" ADD CONSTRAINT "watch_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watch_history" ADD CONSTRAINT "watch_history_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viewings" ADD CONSTRAINT "viewings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viewings" ADD CONSTRAINT "viewings_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viewings" ADD CONSTRAINT "viewings_watchHistoryId_fkey" FOREIGN KEY ("watchHistoryId") REFERENCES "watch_history"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viewing_companions" ADD CONSTRAINT "viewing_companions_viewingId_fkey" FOREIGN KEY ("viewingId") REFERENCES "viewings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viewing_companions" ADD CONSTRAINT "viewing_companions_companionUserId_fkey" FOREIGN KEY ("companionUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episode_watch_history" ADD CONSTRAINT "episode_watch_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episode_watch_history" ADD CONSTRAINT "episode_watch_history_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "tv_episodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlists" ADD CONSTRAINT "watchlists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_watchlistId_fkey" FOREIGN KEY ("watchlistId") REFERENCES "watchlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_addedByUserId_fkey" FOREIGN KEY ("addedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_addresseeId_fkey" FOREIGN KEY ("addresseeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_mutes" ADD CONSTRAINT "user_mutes_muterId_fkey" FOREIGN KEY ("muterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_mutes" ADD CONSTRAINT "user_mutes_mutedId_fkey" FOREIGN KEY ("mutedId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_activities" ADD CONSTRAINT "feed_activities_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_activities" ADD CONSTRAINT "feed_activities_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_devices" ADD CONSTRAINT "push_devices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "achievements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wraps" ADD CONSTRAINT "wraps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_feedback" ADD CONSTRAINT "recommendation_feedback_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "recommendations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idempotency_records" ADD CONSTRAINT "idempotency_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
