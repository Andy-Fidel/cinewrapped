-- Additive rollout: keep the legacy wrap identity index until the new API is ready.
ALTER TABLE "viewings" ADD COLUMN "episodeId" UUID;
ALTER TABLE "viewings" ADD CONSTRAINT "viewings_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "tv_episodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "viewings_userId_episodeId_watchedAt_idx" ON "viewings"("userId", "episodeId", "watchedAt" DESC);
ALTER TABLE "wraps" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "generationAttemptId" UUID,
  ADD COLUMN "generationStartedAt" TIMESTAMPTZ(3);
ALTER TABLE "wraps" ADD CONSTRAINT "wraps_revision_positive" CHECK ("revision" > 0);
CREATE UNIQUE INDEX "wraps_snapshot_identity_key" ON "wraps"("userId", "wrapType", "periodStart", "periodEnd", "timezone", "inputVersion", "revision");

-- Existing episode progress retains only its latest known completion date.
-- Recover that occurrence; never invent dates or multiply by historical watchCount.
INSERT INTO "viewings" ("id", "userId", "mediaId", "watchHistoryId", "episodeId", "watchedAt", "completedAt", "durationWatchedMin", "isRewatch", "source", "createdAt", "updatedAt")
SELECT gen_random_uuid(), ewh."userId", season."mediaId", history."id", episode."id", ewh."watchedAt", ewh."watchedAt", episode."runtimeMinutes", ewh."watchCount" > 1, 'MANUAL'::"WatchSource", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "episode_watch_history" ewh
JOIN "tv_episodes" episode ON episode."id" = ewh."episodeId"
JOIN "tv_seasons" season ON season."id" = episode."seasonId"
JOIN "watch_history" history ON history."userId" = ewh."userId" AND history."mediaId" = season."mediaId"
WHERE ewh."completed" = TRUE AND ewh."watchedAt" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "viewings" v WHERE v."userId" = ewh."userId" AND v."episodeId" = ewh."episodeId" AND v."deletedAt" IS NULL);
