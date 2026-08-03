-- CreateEnum
CREATE TYPE "ClubVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "ClubMembershipType" AS ENUM ('OPEN', 'APPROVAL', 'INVITE_ONLY');

-- CreateEnum
CREATE TYPE "ClubRole" AS ENUM ('OWNER', 'ADMIN', 'MODERATOR', 'MEMBER');

-- CreateEnum
CREATE TYPE "ClubMemberStatus" AS ENUM ('PENDING', 'ACTIVE', 'REMOVED');

-- CreateEnum
CREATE TYPE "ClubPostType" AS ENUM ('DISCUSSION', 'ANNOUNCEMENT');

-- CreateEnum
CREATE TYPE "ClubPollStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "ClubWatchEventStatus" AS ENUM ('SCHEDULED', 'CANCELLED', 'COMPLETED');

-- CreateTable
CREATE TABLE "clubs" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "description" VARCHAR(2000) NOT NULL,
    "coverImageUrl" VARCHAR(2048),
    "visibility" "ClubVisibility" NOT NULL DEFAULT 'PUBLIC',
    "membershipType" "ClubMembershipType" NOT NULL DEFAULT 'OPEN',
    "category" VARCHAR(80),
    "memberCount" INTEGER NOT NULL DEFAULT 1,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "clubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_members" (
    "id" UUID NOT NULL,
    "clubId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "ClubRole" NOT NULL DEFAULT 'MEMBER',
    "status" "ClubMemberStatus" NOT NULL DEFAULT 'PENDING',
    "joinedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "club_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_posts" (
    "id" UUID NOT NULL,
    "clubId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "postType" "ClubPostType" NOT NULL DEFAULT 'DISCUSSION',
    "title" VARCHAR(160),
    "body" VARCHAR(10000) NOT NULL,
    "containsSpoilers" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "club_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_polls" (
    "id" UUID NOT NULL,
    "clubId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "question" VARCHAR(500) NOT NULL,
    "allowMultiple" BOOLEAN NOT NULL DEFAULT false,
    "status" "ClubPollStatus" NOT NULL DEFAULT 'OPEN',
    "closesAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "club_polls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_poll_options" (
    "id" UUID NOT NULL,
    "pollId" UUID NOT NULL,
    "label" VARCHAR(200) NOT NULL,
    "mediaId" UUID,
    "position" INTEGER NOT NULL,

    CONSTRAINT "club_poll_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_poll_votes" (
    "pollId" UUID NOT NULL,
    "optionId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_poll_votes_pkey" PRIMARY KEY ("pollId","optionId","userId")
);

-- CreateTable
CREATE TABLE "club_watchlist_items" (
    "id" UUID NOT NULL,
    "clubId" UUID NOT NULL,
    "mediaId" UUID NOT NULL,
    "suggestedById" UUID NOT NULL,
    "note" VARCHAR(500),
    "selectedAt" TIMESTAMPTZ(3),
    "archivedAt" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "club_watchlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_watchlist_votes" (
    "itemId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "club_watchlist_votes_pkey" PRIMARY KEY ("itemId","userId")
);

-- CreateTable
CREATE TABLE "club_watch_events" (
    "id" UUID NOT NULL,
    "clubId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "mediaId" UUID,
    "title" VARCHAR(160) NOT NULL,
    "description" VARCHAR(2000),
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "timezone" VARCHAR(64) NOT NULL,
    "locationUrl" VARCHAR(2048),
    "status" "ClubWatchEventStatus" NOT NULL DEFAULT 'SCHEDULED',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "club_watch_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clubs_slug_key" ON "clubs"("slug");

-- CreateIndex
CREATE INDEX "clubs_visibility_createdAt_id_idx" ON "clubs"("visibility", "createdAt" DESC, "id");

-- CreateIndex
CREATE INDEX "clubs_ownerId_updatedAt_idx" ON "clubs"("ownerId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "clubs_deletedAt_idx" ON "clubs"("deletedAt");

-- CreateIndex
CREATE INDEX "club_members_userId_status_updatedAt_idx" ON "club_members"("userId", "status", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "club_members_clubId_status_role_idx" ON "club_members"("clubId", "status", "role");

-- CreateIndex
CREATE UNIQUE INDEX "club_members_clubId_userId_key" ON "club_members"("clubId", "userId");

-- CreateIndex
CREATE INDEX "club_posts_clubId_createdAt_id_idx" ON "club_posts"("clubId", "createdAt" DESC, "id");

-- CreateIndex
CREATE INDEX "club_posts_authorId_createdAt_idx" ON "club_posts"("authorId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "club_posts_deletedAt_idx" ON "club_posts"("deletedAt");

-- CreateIndex
CREATE INDEX "club_polls_clubId_status_createdAt_idx" ON "club_polls"("clubId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "club_poll_options_mediaId_idx" ON "club_poll_options"("mediaId");

-- CreateIndex
CREATE UNIQUE INDEX "club_poll_options_pollId_position_key" ON "club_poll_options"("pollId", "position");

-- CreateIndex
CREATE INDEX "club_poll_votes_userId_createdAt_idx" ON "club_poll_votes"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "club_poll_votes_optionId_idx" ON "club_poll_votes"("optionId");

-- CreateIndex
CREATE INDEX "club_watchlist_items_clubId_archivedAt_createdAt_idx" ON "club_watchlist_items"("clubId", "archivedAt", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "club_watchlist_items_mediaId_idx" ON "club_watchlist_items"("mediaId");

-- CreateIndex
CREATE UNIQUE INDEX "club_watchlist_items_clubId_mediaId_key" ON "club_watchlist_items"("clubId", "mediaId");

-- CreateIndex
CREATE INDEX "club_watchlist_votes_userId_updatedAt_idx" ON "club_watchlist_votes"("userId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "club_watch_events_clubId_startsAt_id_idx" ON "club_watch_events"("clubId", "startsAt", "id");

-- CreateIndex
CREATE INDEX "club_watch_events_createdById_startsAt_idx" ON "club_watch_events"("createdById", "startsAt");

-- CreateIndex
CREATE INDEX "club_watch_events_deletedAt_idx" ON "club_watch_events"("deletedAt");

-- AddForeignKey
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_members" ADD CONSTRAINT "club_members_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_members" ADD CONSTRAINT "club_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_posts" ADD CONSTRAINT "club_posts_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_posts" ADD CONSTRAINT "club_posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_polls" ADD CONSTRAINT "club_polls_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_polls" ADD CONSTRAINT "club_polls_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_poll_options" ADD CONSTRAINT "club_poll_options_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "club_polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_poll_options" ADD CONSTRAINT "club_poll_options_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_poll_votes" ADD CONSTRAINT "club_poll_votes_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "club_polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_poll_votes" ADD CONSTRAINT "club_poll_votes_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "club_poll_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_poll_votes" ADD CONSTRAINT "club_poll_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_watchlist_items" ADD CONSTRAINT "club_watchlist_items_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_watchlist_items" ADD CONSTRAINT "club_watchlist_items_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_watchlist_items" ADD CONSTRAINT "club_watchlist_items_suggestedById_fkey" FOREIGN KEY ("suggestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_watchlist_votes" ADD CONSTRAINT "club_watchlist_votes_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "club_watchlist_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_watchlist_votes" ADD CONSTRAINT "club_watchlist_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_watch_events" ADD CONSTRAINT "club_watch_events_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_watch_events" ADD CONSTRAINT "club_watch_events_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_watch_events" ADD CONSTRAINT "club_watch_events_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Domain constraints that Prisma cannot express directly.
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_slug_normalized_check" CHECK ("slug" = lower("slug") AND "slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_member_count_check" CHECK ("memberCount" >= 0);
ALTER TABLE "club_poll_options" ADD CONSTRAINT "club_poll_options_position_check" CHECK ("position" >= 0);
ALTER TABLE "club_watchlist_votes" ADD CONSTRAINT "club_watchlist_votes_value_check" CHECK ("value" IN (-1, 1));
CREATE UNIQUE INDEX "club_members_one_active_owner_idx" ON "club_members"("clubId") WHERE "role" = 'OWNER' AND "status" = 'ACTIVE';
