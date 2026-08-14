CREATE TYPE "MusicProvider" AS ENUM ('APPLE_MUSIC');

CREATE TABLE "soundtrack_saves" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "mediaId" UUID NOT NULL,
    "provider" "MusicProvider" NOT NULL DEFAULT 'APPLE_MUSIC',
    "providerAlbumId" VARCHAR(128) NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "artistName" VARCHAR(200) NOT NULL,
    "artworkUrl" VARCHAR(2048),
    "providerUrl" VARCHAR(2048) NOT NULL,
    "releaseDate" DATE,
    "trackCount" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),
    CONSTRAINT "soundtrack_saves_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "soundtrack_saves_userId_mediaId_provider_providerAlbumId_key"
ON "soundtrack_saves"("userId", "mediaId", "provider", "providerAlbumId");
CREATE INDEX "soundtrack_saves_userId_createdAt_id_idx"
ON "soundtrack_saves"("userId", "createdAt" DESC, "id" DESC);
CREATE INDEX "soundtrack_saves_mediaId_createdAt_idx"
ON "soundtrack_saves"("mediaId", "createdAt" DESC);
CREATE INDEX "soundtrack_saves_deletedAt_idx" ON "soundtrack_saves"("deletedAt");

ALTER TABLE "soundtrack_saves" ADD CONSTRAINT "soundtrack_saves_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "soundtrack_saves" ADD CONSTRAINT "soundtrack_saves_mediaId_fkey"
FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE "feature_flags"
SET "enabled" = TRUE,
    "rolloutPercentage" = 100,
    "environments" = ARRAY['development'],
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'SOUNDTRACKS';
