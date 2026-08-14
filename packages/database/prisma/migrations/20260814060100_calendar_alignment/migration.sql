ALTER TABLE "calendar_events" DROP CONSTRAINT "calendar_events_mediaId_fkey";
ALTER TABLE "calendar_events" DROP CONSTRAINT "calendar_events_userId_fkey";
ALTER TABLE "calendar_events" ALTER COLUMN "id" DROP DEFAULT;

ALTER TABLE "calendar_events"
  ADD CONSTRAINT "calendar_events_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "calendar_events"
  ADD CONSTRAINT "calendar_events_mediaId_fkey"
  FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
