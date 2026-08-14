CREATE TYPE "CalendarEventType" AS ENUM ('WATCH_PLAN', 'RELEASE_REMINDER');
CREATE TYPE "CalendarEventStatus" AS ENUM ('SCHEDULED', 'CANCELLED', 'COMPLETED');

CREATE TABLE "calendar_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "mediaId" UUID,
  "eventType" "CalendarEventType" NOT NULL,
  "status" "CalendarEventStatus" NOT NULL DEFAULT 'SCHEDULED',
  "title" VARCHAR(160) NOT NULL,
  "notes" VARCHAR(2000),
  "startsAt" TIMESTAMPTZ(3) NOT NULL,
  "timezone" VARCHAR(64) NOT NULL,
  "durationMinutes" INTEGER NOT NULL DEFAULT 120,
  "reminderMinutes" INTEGER[] NOT NULL DEFAULT ARRAY[60]::INTEGER[],
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  "deletedAt" TIMESTAMPTZ(3),
  CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "calendar_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "calendar_events_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE SET NULL
);

CREATE INDEX "calendar_events_userId_startsAt_id_idx" ON "calendar_events"("userId", "startsAt", "id");
CREATE INDEX "calendar_events_mediaId_startsAt_idx" ON "calendar_events"("mediaId", "startsAt");
CREATE INDEX "calendar_events_deletedAt_idx" ON "calendar_events"("deletedAt");

UPDATE "feature_flags"
SET "enabled" = TRUE, "rolloutPercentage" = 100, "environments" = ARRAY['development'], "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'CALENDAR_INTEGRATION';
