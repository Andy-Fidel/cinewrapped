# Movie Journal

Movie Journal is an owner-only record of a viewing memory. It is controlled by the
`MOVIE_JOURNAL` feature flag and is enabled at 100% only in `development` and `test` after the
phase migration. Production remains disabled until deployment verification is complete.

## Captured information

- Optional title and private notes
- Viewing location and date
- Names of people watched with
- User-entered memorable quotes
- Mood before and after watching
- Draft or completed status
- Ticket images/PDFs and personal photos

Entries belong to one user and one media title. They may optionally reference an owned viewing.
That reference is checked against both user and title to prevent cross-account or cross-title
association.

## Privacy and authorization

All journal API reads and writes filter by the authenticated Supabase subject and the internal
owner relation. A missing entry and another user's entry both return `JOURNAL_ENTRY_NOT_FOUND`.
Journal writes never create `FeedActivity` records, and no journal route is exposed through social
services.

Attachments are stored in the private `journal-attachments` Supabase bucket under
`<auth.uid()>/<random>.<extension>`. The API accepts attachment metadata only when the first folder
matches the JWT subject. Supabase RLS independently enforces the same ownership boundary. Display
uses five-minute signed URLs; persistent public URLs are never stored.

## API

- `GET /api/v1/journal` — cursor-paginated owner list with status, title, and text search
- `POST /api/v1/journal` — create a draft or completed entry
- `GET /api/v1/journal/:entryId` — retrieve one owned entry
- `PATCH /api/v1/journal/:entryId` — optimistic update using `expectedVersion`
- `DELETE /api/v1/journal/:entryId` — soft-delete and return attachment paths for storage cleanup
- `POST /api/v1/journal/:entryId/attachments` — register a successfully uploaded private object
- `DELETE /api/v1/journal/:entryId/attachments/:attachmentId` — remove attachment metadata

Completed entries require text/mood/location/companion/quote content or at least one attachment.
Drafts may remain empty so interrupted writing can be recovered in a later offline-sync phase.

## Release checks

Before enabling production rollout:

1. Apply the Prisma migration to the application PostgreSQL database.
2. Confirm `journal-attachments` remains private with SELECT, INSERT, UPDATE, and DELETE owner RLS.
3. Test create, edit, conflict, delete, upload, signed download, and cross-account denial.
4. Verify no journal text or attachment path appears in feed, analytics, audit metadata, or logs.
