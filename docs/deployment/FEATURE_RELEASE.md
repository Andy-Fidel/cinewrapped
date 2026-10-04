# Data transfer, social push and offline viewing release

Implemented on 4 October 2026 using the existing Vercel Hobby API/web projects and Supabase Free. No new provider, paid service, runtime dependency or database migration was introduced.

## User flows

- **Letterboxd import:** Settings → Preferences → Import from Letterboxd. Paste CSV, inspect the preview, then start an import. The server validates up to 1,000 rows / 500 KB, creates an owned durable job, and processes at most five rows per scheduled invocation. Progress and unmatched/ambiguous titles remain available after closing the modal or restarting the app. Cancel stops remaining rows between batches; saved records remain.
- **Account export:** Settings → Preferences → Download account export. Authenticated pages contain the signed-in user's profile, preferences, library, viewings, episode progress, ratings, reviews, journal/attachment metadata, calendar, lists, social relationships/interactions, clubs/authored club content, notifications, wraps, search history, soundtracks and scene-identification records. Web downloads JSON; native builds use the file share sheet and remove their temporary export file afterward. Credentials, push tokens and original attachment binaries are excluded. This is a page-by-page export, not a transactionally consistent snapshot: edits to existing records during export can appear.
- **Social push:** Friend requests/acceptance, new followers, comments and reactions create inbox notifications and per-device outbox jobs in the same transaction as the action. Delivery requires explicit social consent and a registered native device. Consent, ownership, token rotation, blocks and account deletion are checked before sending. Expo tickets are persisted; receipts are checked after 15 minutes. Invalid tokens are disabled. Tapping a notification verifies ownership with the API before following a validated internal route.
- **Offline viewings:** Log a viewing on a loaded title page. The viewing is persisted locally before the request, with a stable operation UUID. The app retries on launch, foreground, reconnection and a bounded timer, removes only acknowledged entries, and displays pending/failed entries. Rejected entries can be retried or discarded explicitly. The queue is scoped to the user and cleared on explicit sign-out/account change. Existing status, rating, review and episode edits still require a connection; this release does not queue them.

## Correctness and recovery

Each import row and its checkpoint commit together. Stable identifiers scoped to the owner and file contents prevent duplicate viewings/reviews when retrying or re-importing the same parsed file. Existing ratings and tracking status are preserved; imported reviews are private. Only exact movie title/year candidates are persisted. Viewing dates come from explicit Watched Date columns, not the date a rating was logged, and preserve the owner’s calendar day. Unmatched/ambiguous rows are reported rather than guessed. Different exports with reordered/changed content are distinct sources; this is not general reconciliation across all Letterboxd exports.

Import jobs use the existing durable outbox and API scheduler. One active import is allowed per owner. Failures retry up to the configured ten attempts. An exhausted import can be cancelled and restarted with the same file; already saved records are reused. Imports require the API's serverless handler and are not supported by the standalone Redis worker. Due jobs are ordered by availability so a repeatedly requeued import yields to other due work.

A five-minute terminated invocation can be reclaimed after a ten-minute lease. The scheduler processes one outbox event per minute, so large imports and push backlogs can take time. Successful imported-job payload copies are removed after seven days; successful notification job envelopes after thirty days. Account erasure also purges import payload copies. The user's imported library records are retained until the user removes them or erases their account.

Push delivery is at least once. Expo has no idempotent send operation, so a failure after acceptance but before persisting a ticket can produce a duplicate notification. A stored ticket is checked rather than sent again. Exhausted push failures remain visible in the outbox for investigation. `PUBLISHED` indicates processing finished or delivery was safely skipped; it is not proof that a person saw a push. No automated test sends real pushes.

The native offline queue uses encrypted SecureStore chunks with two fixed slots and a final pointer commit. A failed replacement retains the previous committed value. Web uses versioned localStorage keys and Web Locks to serialize tabs. Storage failure is reported as failure to save rather than success. The queue holds at most 200 viewings; automatic retries stop after ten failures until the user retries. Viewing replay uses the database's durable owner/operation unique key instead of the HTTP response cache, so a lost response cannot leave replay permanently in progress.

## Deployed verification — 4 October 2026

- API deployment: `dpl_4XZm5RRPcK6a7uxp91VcntVmdohM`; web: `dpl_4SPnVRiiit2xAm4pZVjMc9dqt7Xu`. Both finished their production builds and were aliased to the existing CineWrapped URLs.
- 49 regression test files / 198 tests passed, including the local PostgreSQL and HTTP checks. Type checks passed; lint had no errors; formatting and `git diff --check` passed.
- Production API readiness returned 200. Unauthenticated export, import-status and scheduled-job requests returned 401. The web preferences deep link returned 200.
- A harmless production `system.healthcheck` event reached `PUBLISHED` at 11:49 UTC after one attempt with no error, verifying the final scheduler → Vercel → PostgreSQL path. Both named Cron schedules remain active.
- The Vercel workspace was rechecked as Hobby. Existing Supabase Free resources were reused; no paid integration or native build was submitted.
- Chrome automation returned `Detached while handling command` / `Debugger unattached`, so this release does not claim a successful signed-in browser journey. Native push delivery and admin MFA remain unverified with real credentials/devices.

## Verification and operational boundaries

Release tests use a separate local PostgreSQL database ending in `_test`. They cover HTTP authentication/input validation, forged-owner isolation, transactional rollback/checkpoint recovery, concurrent duplicate viewing delivery, duplicate import records, private reviews, export collection queries, friend-request/notification atomicity, offline account changes/storage failures and Expo ticket/receipt contracts. Providers use fixtures; real identity, metadata and push services are not called by tests.

API and Expo web production builds/type checks and affected-file lint/format checks are required before deployment. After deployment, check API readiness, rejection of unauthenticated export/import/job routes, SPA deep links and active Supabase Cron jobs. Use the previous Vercel deployment for rollback; keep paid Render services suspended.

A successful real-account browser journey, admin MFA, installed iOS/Android delivery and push credential setup remain manual release checks. Native users need an updated build targeting the Vercel API. Calendar/club reminders, offline editing of existing records, attachment-binary export and general cross-file import reconciliation remain follow-ups.
