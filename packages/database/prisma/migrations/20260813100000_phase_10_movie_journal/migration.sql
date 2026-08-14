-- CreateEnum
CREATE TYPE "JournalEntryStatus" AS ENUM ('DRAFT', 'COMPLETED');

-- CreateEnum
CREATE TYPE "JournalAttachmentType" AS ENUM ('TICKET', 'PERSONAL_PHOTO');

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "mediaId" UUID NOT NULL,
    "viewingId" UUID,
    "status" "JournalEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "title" VARCHAR(160),
    "notes" TEXT,
    "viewingLocation" VARCHAR(200),
    "companionNames" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "memorableQuotes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "moodBefore" VARCHAR(40),
    "moodAfter" VARCHAR(40),
    "watchedAt" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_attachments" (
    "id" UUID NOT NULL,
    "journalEntryId" UUID NOT NULL,
    "attachmentType" "JournalAttachmentType" NOT NULL,
    "storageBucket" VARCHAR(80) NOT NULL DEFAULT 'journal-attachments',
    "storagePath" VARCHAR(1024) NOT NULL,
    "fileName" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(120) NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_attachments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "journal_attachments_byte_size_check" CHECK ("byteSize" > 0 AND "byteSize" <= 10485760),
    CONSTRAINT "journal_attachments_bucket_check" CHECK ("storageBucket" = 'journal-attachments')
);

CREATE UNIQUE INDEX "journal_entries_viewingId_key" ON "journal_entries"("viewingId");
CREATE INDEX "journal_entries_userId_updatedAt_id_idx" ON "journal_entries"("userId", "updatedAt" DESC, "id" DESC);
CREATE INDEX "journal_entries_userId_status_updatedAt_idx" ON "journal_entries"("userId", "status", "updatedAt" DESC);
CREATE INDEX "journal_entries_userId_mediaId_updatedAt_idx" ON "journal_entries"("userId", "mediaId", "updatedAt" DESC);
CREATE INDEX "journal_entries_deletedAt_idx" ON "journal_entries"("deletedAt");
CREATE UNIQUE INDEX "journal_attachments_storagePath_key" ON "journal_attachments"("storagePath");
CREATE INDEX "journal_attachments_journalEntryId_createdAt_idx" ON "journal_attachments"("journalEntryId", "createdAt");

ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_mediaId_fkey"
  FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_viewingId_fkey"
  FOREIGN KEY ("viewingId") REFERENCES "viewings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "journal_attachments" ADD CONSTRAINT "journal_attachments_journalEntryId_fkey"
  FOREIGN KEY ("journalEntryId") REFERENCES "journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Journals are deliberately absent from feed activity tables and triggers.

-- Make the completed vertical slice available to local and automated testing only.
UPDATE "feature_flags"
SET "enabled" = true,
    "rolloutPercentage" = 100,
    "environments" = ARRAY['development', 'test'],
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'MOVIE_JOURNAL';
