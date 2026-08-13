-- CreateTable
CREATE TABLE "feature_flags" (
    "key" VARCHAR(80) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "rolloutPercentage" INTEGER NOT NULL DEFAULT 0,
    "environments" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("key"),
    CONSTRAINT "feature_flags_rollout_percentage_check"
      CHECK ("rolloutPercentage" >= 0 AND "rolloutPercentage" <= 100)
);

-- CreateTable
CREATE TABLE "user_feature_flag_overrides" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "featureKey" VARCHAR(80) NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "expiresAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_feature_flag_overrides_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "feature_flags_enabled_idx" ON "feature_flags"("enabled");
CREATE INDEX "user_feature_flag_overrides_expiresAt_idx"
  ON "user_feature_flag_overrides"("expiresAt");
CREATE UNIQUE INDEX "user_feature_flag_overrides_userId_featureKey_key"
  ON "user_feature_flag_overrides"("userId", "featureKey");

ALTER TABLE "user_feature_flag_overrides"
  ADD CONSTRAINT "user_feature_flag_overrides_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_feature_flag_overrides"
  ADD CONSTRAINT "user_feature_flag_overrides_featureKey_fkey"
  FOREIGN KEY ("featureKey") REFERENCES "feature_flags"("key") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "feature_flags" ("key", "description", "updatedAt") VALUES
  ('AI_DISCOVERY_ADVANCED', 'Advanced conversational discovery controls and experiments.', CURRENT_TIMESTAMP),
  ('MOVIE_JOURNAL', 'Private rich-text journal entries and attachments.', CURRENT_TIMESTAMP),
  ('WATCH_PARTIES', 'Realtime watch-party rooms and synchronized playback state.', CURRENT_TIMESTAMP),
  ('CLUB_INSIGHTS', 'Club-level activity and taste analytics.', CURRENT_TIMESTAMP),
  ('CALENDAR_HEATMAP', 'Calendar activity visualization.', CURRENT_TIMESTAMP),
  ('CALENDAR_INTEGRATION', 'External calendar event export and synchronization.', CURRENT_TIMESTAMP),
  ('DATA_IMPORT_EXPORT', 'Portable account data imports and exports.', CURRENT_TIMESTAMP),
  ('HOME_WIDGETS', 'Native home-screen widgets.', CURRENT_TIMESTAMP),
  ('SOUNDTRACKS', 'Soundtrack discovery and provider links.', CURRENT_TIMESTAMP),
  ('SCENE_IDENTIFICATION', 'Image-assisted scene identification.', CURRENT_TIMESTAMP),
  ('PREDICTION_LEAGUE', 'Social awards prediction leagues.', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
