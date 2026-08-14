CREATE TYPE "SceneIdentificationStatus" AS ENUM ('MATCHED', 'UNCERTAIN', 'NO_MATCH');
CREATE TYPE "SceneIdentificationFeedback" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');

CREATE TABLE "scene_identifications" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "matchedMediaId" UUID,
    "status" "SceneIdentificationStatus" NOT NULL,
    "feedback" "SceneIdentificationFeedback" NOT NULL DEFAULT 'PENDING',
    "confidence" INTEGER NOT NULL,
    "sceneDescription" VARCHAR(1000) NOT NULL,
    "candidatesJson" JSONB NOT NULL DEFAULT '[]',
    "model" VARCHAR(80) NOT NULL,
    "processingMs" INTEGER NOT NULL,
    "confirmedAt" TIMESTAMPTZ(3),
    "rejectedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),
    CONSTRAINT "scene_identifications_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "scene_identifications_confidence_check" CHECK ("confidence" BETWEEN 0 AND 100),
    CONSTRAINT "scene_identifications_processing_ms_check" CHECK ("processingMs" >= 0)
);

CREATE INDEX "scene_identifications_userId_createdAt_id_idx"
ON "scene_identifications"("userId", "createdAt" DESC, "id" DESC);
CREATE INDEX "scene_identifications_matchedMediaId_createdAt_idx"
ON "scene_identifications"("matchedMediaId", "createdAt" DESC);
CREATE INDEX "scene_identifications_deletedAt_idx" ON "scene_identifications"("deletedAt");

ALTER TABLE "scene_identifications" ADD CONSTRAINT "scene_identifications_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "scene_identifications" ADD CONSTRAINT "scene_identifications_matchedMediaId_fkey"
FOREIGN KEY ("matchedMediaId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "feature_flags"
SET "enabled" = TRUE,
    "rolloutPercentage" = 100,
    "environments" = ARRAY['development'],
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'SCENE_IDENTIFICATION';
