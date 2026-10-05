# Statistics and wraps fixes

Implemented 4 October 2026 on the existing Vercel Hobby API/web projects and Supabase Free. No new service, paid plan, or runtime dependency was added.

## Correctness and domain decisions

TV episode completions now create dated `Viewing` occurrences atomically with progress updates. Editing a completed episode changes its current occurrence; undo soft-deletes that occurrence. Recompletion records another occurrence. A series progress row serializes concurrent episode mutations before aggregate progress is recalculated. Client operation IDs and optimistic versions protect retries and conflicting writes.

For statistics, episode occurrences take precedence over generic TV-title logs for the same title and member-local day. This avoids counting a completed series log and its episodes twice. Unique titles still count series once. Explicit duration wins; a missing duration uses the title runtime only for a completed, non-episode viewing. Incomplete sessions with unknown duration contribute zero known minutes.

The migration recovers one latest dated occurrence per completed legacy episode. Historical `watchCount` is not used to fabricate missing dates. Older undated rewatches cannot be reconstructed. The production preflight found no completed episode rows needing backfill; an idempotent backfill regression covers legacy data in the isolated test database.

Current streaks use PostgreSQL calendar dates in the member's IANA time zone. Selected-year longest streaks use only that year's activity. The heatmap now loads bounded selected-year records, rather than all history with full relations. Empty heatmaps show insufficient evidence, and Movie DNA is labeled all time. These are correctness and architectural changes; no latency improvement is claimed without measurement.

## Snapshot and failure model

Snapshot identity includes owner, wrap type, absolute period boundaries, time zone, input version and revision. Ordinary creation reuses the latest completed snapshot. Explicit refresh saves a new revision while preserving earlier revisions. A unique index resolves simultaneous revision allocation. In-place replacement was rejected because it changes an existing saved/shared snapshot. Reusing inputVersion as a revision was rejected because inputVersion identifies the calculation contract. Separate revisions add retained rows and require archive paging, but preserve stable snapshot IDs.

A generation UUID owns terminal state transitions. Each update predicates on owner-selected wrap ID, generation UUID, GENERATING state and non-deletion. Late failure cannot overwrite another attempt's success. A GENERATING attempt can be reclaimed after five minutes. Failed and pending historical periods can be retried using their stored scope. Generation reads activity and ratings in one repeatable-read transaction. No queue or worker was introduced: current bounded work does not require one. Reconsider this if measured execution time approaches the generation lease or platform limit.

The UI provides archive paging, loading/errors, historical retry and bounded polling (three-second checks for up to two minutes). After polling ends, Check status restarts observation; an expired attempt exposes Retry generation. Completed archive entries display their revision and snapshot timestamp. Viewing/rating/episode/import/offline updates invalidate live insights; saved completed snapshots remain immutable. Home recomputes its rolling-week request on refetch and refreshes statistics on screen focus and pull-to-refresh.

## Presentation

The synthetic story generator was removed. Legacy story IDs route to the authenticated wrap reader. Missing metrics, years, directors and taste tags are omitted rather than fabricated. Weekly/monthly/yearly/custom metadata and inclusive display dates use the saved time zone. JSON preserves period boundaries, time zone and revision. Stories start in reading mode with an explicit Play/Pause button.

## Validation and limits

- API: 130 tests passed against an isolated localhost `_test` PostgreSQL database, including ownership, current-versus-saved snapshots, time-zone identity, completion/replay/date edits/undo, TV deduplication, unknown partial duration, selected-year streaks, spring and autumn DST, paging, historical recovery, generation lease takeover, late-failure races and legacy backfill idempotency.
- App: 112 tests passed, including factual semantic rendering, all wrap type mappings, zero/missing metrics, saved-zone inclusive dates, and live-query invalidation.
- API client: eight tests passed, including collection cursors, authentication, missing metadata, no-content responses and native browser fetch binding.
- Validation: 30 tests passed. PWA: eight checks passed.
- API/app type checks, schema validation and lint passed. Existing unrelated lint warnings remain in import/push-provider and old test code. Web, iOS and Android exports passed.
- Browser verification used real app screens/query hooks and the shared HTTP client with controlled local authentication/HTTP fixtures: archive next page and error recovery, failed-wrap opening/retry, refreshed revision, current-period creation with polling, factual intro and reading controls. Database behavior was verified separately with real services and PostgreSQL. This does not claim a signed-in production journey or physical-device share-sheet verification.
- Public expiring wrap links remain intentionally unavailable; this release does not change that feature.

## Deployment and recovery

Apply the additive migration before deploying the new API. Keep the legacy unique index during that first stage. After the new API is ready, drop the legacy identity index. Add the episode-reference index for foreign-key maintenance. All three migrations were applied to Supabase and recorded in Prisma history with their source-file checksums:

1. `20261004211641_statistics_wrap_fixes`
2. `20261004212652_finish_statistics_wrap_identity`
3. `20261004224626_index_episode_viewing_reference`

API deployment `dpl_4J6jQHfu5ssXHhtgNuTzzQ6P3twc` reached READY at `https://cinewrapped-api.vercel.app`. Its liveness and database readiness returned 200; anonymous statistics returned 401. The initial web release `dpl_5GDtFGizsQCiWQiwndZTb3C7GysN` reached READY at `https://cinewrapped.vercel.app`; JSON metadata deployment `dpl_CEK2t8RHrejd7zi13cfZMkwhPCCK` and final Home-refresh deployment `dpl_ASVEg5dDkDAVJMZpM3W5TH3APYiq` also reached READY on the same alias.

RLS remains enabled on viewings/wraps, with no anon/authenticated table grants. The episode FK index removed the newly introduced unindexed-reference notice. Remaining database notices are pre-existing, including [leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection); no paid upgrade was requested.

For a web regression, roll back the web while retaining the expanded-identity API and additive schema. Do not blindly roll back to an API that depends on the removed legacy unique index: duplicate revisions/time zones make that identity incompatible. An API rollback must use a compatible build or a reviewed data migration. Retain saved revisions and activity during recovery.
