CREATE TYPE "ChallengeMetric" AS ENUM (
  'VIEWINGS',
  'UNIQUE_TITLES',
  'MINUTES_WATCHED',
  'REWATCHES',
  'RATINGS',
  'REVIEWS',
  'STREAK_DAYS',
  'COUNTRIES'
);

ALTER TABLE "privacy_settings"
  ADD COLUMN "leaderboardVisibility" "ContentVisibility" NOT NULL DEFAULT 'PRIVATE',
  ADD COLUMN "passportVisibility" "ContentVisibility" NOT NULL DEFAULT 'PRIVATE';

CREATE TABLE "challenges" (
  "id" UUID NOT NULL,
  "code" VARCHAR(80) NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "description" VARCHAR(500) NOT NULL,
  "metric" "ChallengeMetric" NOT NULL,
  "target" INTEGER NOT NULL,
  "points" INTEGER NOT NULL DEFAULT 0,
  "startsAt" TIMESTAMPTZ(3) NOT NULL,
  "endsAt" TIMESTAMPTZ(3) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "challenges_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "challenges_period_chk" CHECK ("startsAt" < "endsAt"),
  CONSTRAINT "challenges_target_chk" CHECK ("target" > 0),
  CONSTRAINT "challenges_points_chk" CHECK ("points" >= 0)
);

CREATE TABLE "user_challenges" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "challengeId" UUID NOT NULL,
  "progress" INTEGER NOT NULL DEFAULT 0,
  "joinedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMPTZ(3),
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "user_challenges_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_challenges_progress_chk" CHECK ("progress" >= 0),
  CONSTRAINT "user_challenges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "user_challenges_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "challenges"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "challenges_code_key" ON "challenges"("code");
CREATE INDEX "challenges_isActive_startsAt_endsAt_idx" ON "challenges"("isActive", "startsAt", "endsAt");
CREATE UNIQUE INDEX "user_challenges_userId_challengeId_key" ON "user_challenges"("userId", "challengeId");
CREATE INDEX "user_challenges_challengeId_completedAt_userId_idx" ON "user_challenges"("challengeId", "completedAt", "userId");
CREATE INDEX "user_challenges_userId_updatedAt_idx" ON "user_challenges"("userId", "updatedAt" DESC);
