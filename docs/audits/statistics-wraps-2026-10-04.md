# Statistics & Wraps audit — October 4, 2026

## Result

**13 findings: 1 P1, 11 P2, 1 P3.** The most urgent issue is invented data in the normal wrap viewer. Additional problems affect TV coverage, watch time, wrap freshness and identity, concurrent generation, client refresh, streaks, and archive access/recovery.

This was an audit. No application fixes, migrations, or deployments were made. The identified fixes fit the existing application and free hosting plans.

## Scope and evidence

Traced viewing/episode/rating writes → statistics and Movie DNA queries → wrap generation/persistence → archive and story mapping → slide rendering and PNG/JSON export. Also checked the Home statistics preview, calendar heatmap, account cache clearing, API authorization, and relevant contracts.

- Existing focused suite: **12 tests passed** across InsightsService, time-zone year boundaries, story generation, and heatmap export.
- Additional diagnostic probes: **12 passed**. These assertions confirm observed behavior, including defects; they are not acceptance tests declaring that behavior correct.
- Seven probes used real PostgreSQL through the actual InsightsService/LibraryService, with two isolated test users, movie/TV fixtures, episode completion, ratings, viewing logs, wrap generation, and cursor pagination. Fixtures were deleted afterward. No production user data was written or inspected.
- Two deterministic service probes reproduced DST and concurrent-generation failures.
- Three React rendering/generator probes reproduced invented metrics, release years, and synthetic personalized stories. Native view primitives were adapted for semantic server rendering; this was not a physical-device or full browser session.
- Anonymous production `GET /api/v1/statistics/summary` returned **401**.
- Diagnostic sources/results were retained under `/private/tmp/cinewrapped-statistics-wraps-audit-*`; temporary test files were removed from the application test suites.
- Full signed-in browser navigation and native story interaction were not exercised. UI query/state findings below are established from source tracing.

## Findings

### SW-01 — P1: Normal wraps invent “142 FILMS LOGGED” and a release year

**Locations:** `apps/mobile/src/components/story-presentation/story-slide-renderer.tsx:136`, `apps/mobile/app/wraps/[wrapId].tsx:41`, `apps/api/src/insights/insights.service.ts:733`.

Every generated INTRO intentionally has `statValue: null`. The screen maps every slide without a poster to `HERO_STATS`, leaves its metric absent, and the renderer substitutes `142` and `FILMS LOGGED`. This happens even for a member with no viewings. The semantic rendering probe reproduced it with the real renderer.

The same renderer substitutes release year `2026` at line 269. The normal wrap adapter never supplies a release year because the wrap media contract contains only ID/title/poster, so a historical top film with a poster is presented as a 2026 release.

**Impact:** The ordinary, supposedly factual wrap viewer shows fabricated facts. Its intro can also disagree with the exported PNG, which correctly omits an absent metric.

**Fix:** Render a narrative layout or omit the metric block when no metric exists. Omit missing release metadata or carry verified metadata through the contract. Keep demo values out of production renderers. Add tests for empty activity, intro slides, missing metadata, and a known historical title.

### SW-02 — P2: The separate story route personalizes hard-coded sample data

**Locations:** `apps/mobile/app/stories/[presentationId].tsx:19`, `apps/mobile/src/components/story-presentation/story-generator.ts:32`.

The route ignores `presentationId` and calls the generator with only user identity and a year. It never requests activity or a stored presentation. Defaults invent 142 films, 318 hours, a 28-day streak, “TOP 2% CINEPHILE,” a 4.2-star average, favorite films, a director, and a journal quote/date. The resulting slides say they are derived from logs and display “Verified Wrap.” Some text remains hard-coded to 2026 even when the requested year is 2025.

**Reproduction:** Calling the same generator with only a new member's identity and `year: 2025` produced the fabricated metrics, Oppenheimer ranking, and `2026 RECAP COMPLETED`. The authenticated route can present and export this result. No in-app navigation link to this route was found, which reduces ordinary exposure but does not make the route a development-only fixture.

**Fix:** Resolve an owned stored presentation or redirect to the real wrap flow. If sample stories are retained, isolate them behind an explicit demo experience without personal or verified claims.

### SW-03 — P2: Completed TV episodes are absent from statistics and wraps

**Locations:** `apps/api/src/library/library.service.ts:526`, `apps/api/src/library/library.service.ts:1010`, `apps/api/src/insights/insights.service.ts:683`.

Episode completion writes `EpisodeWatchHistory` and aggregate `WatchHistory`. It creates no `Viewing`. Statistics, monthly trends, taste, heatmaps, and generated wraps read only `Viewing`.

**Database reproduction:** Complete the single 45-minute episode of a test series using `updateEpisodeProgress`. The episode is completed and the series reaches completed status, but the period reports `viewingCount: 0`, `tvViewings: 0`, and `totalMinutes: 0`.

**Fix:** Establish an explicit episode activity model and count its dated occurrences and durations. Preserve idempotency and define deduplication when a user also logs a whole-series viewing. Simply summing aggregate series progress would lose rewatch dates and can double-count.

### SW-04 — P2: An incomplete viewing can be credited with the entire film runtime

**Location:** `apps/api/src/insights/insights.service.ts:704`.

`minutes()` falls back to the media runtime whenever an explicit duration is absent, without considering whether the viewing was completed. The write contract permits `completed: false` and no duration.

**Database reproduction:** Log an incomplete viewing of a 120-minute film with no duration. Statistics report 120 minutes watched. Monthly totals, heatmaps, and wrap hours use the same helper.

**Fix:** Use recorded duration for partial sessions. Only infer full runtime for completed sessions, and make estimates/unknown duration explicit where appropriate. Test incomplete, zero-duration, completed, and unknown-runtime records.

### SW-05 — P2: Current-period wraps have no refresh path after activity changes

**Locations:** `apps/api/src/insights/insights.service.ts:401`, `apps/mobile/app/insights/index.tsx:189`.

A completed wrap is returned indefinitely for the same user/type/period/inputVersion. The UI generates the current calendar period, always sends `inputVersion: 1`, and offers no refresh/revision or delete control. Generating early in the month/year therefore freezes the result exposed by subsequent clicks.

**Database reproduction:** Generate a two-viewing monthly wrap, log a third viewing, then generate again. Live statistics report three; the returned wrap retains its ID and two-viewing snapshot.

**Qualification:** Snapshot reuse is explicitly documented and tested in the existing API contract. The defect is the current-period user workflow lacking a way to request updated data, not an accidental violation of the server's documented duplicate-request behavior.

**Fix:** Preserve immutable historical snapshots/idempotency while adding an explicit refresh or revision workflow for an open period, or clearly offer an “as of” saved snapshot and a separate current preview. Do not make every retried request regenerate automatically.

### SW-06 — P2: Wrap identity omits the requested time zone

**Locations:** `apps/api/src/insights/insights.service.ts:394`, `packages/database/prisma/schema.prisma:1661`.

The unique identity includes user, type, absolute boundaries, and inputVersion, but excludes time zone. Different zones can have the same year boundaries while assigning mid-year activity to different local dates.

**Database reproduction:** For 2026, New York and Lima both have year boundaries at `05:00Z`. Viewings at July 1 `04:30Z`, July 1 `05:30Z`, and July 2 `12:00Z` occupy two New York dates and three Lima dates. Generate New York first, then request Lima: the same wrap is returned with New York's zone and two active days, while live Lima statistics correctly report three.

**Fix:** Include calculation time zone in snapshot identity or reject a zone mismatch and require an explicit new revision. Align database uniqueness and API semantics.

### SW-07 — P2: A failed concurrent generation can overwrite a completed wrap

**Location:** `apps/api/src/insights/insights.service.ts:401`.

A request that finds a `GENERATING` row starts calculation again. Both requests write completion/failure by ID without an attempt token, status predicate, or version check. Separate devices normally use different HTTP idempotency keys, so the request-level interceptor does not serialize them.

**Deterministic reproduction:** Hold the first generation's statistics query, complete the second generation successfully, then fail the first query. The successful response says `COMPLETED`, but the stored row becomes `FAILED` with `GENERATION_FAILED`.

**Fix:** Claim an attempt atomically and condition terminal updates on that attempt/version. Return or observe an existing active attempt. Define bounded recovery for abandoned `GENERATING` rows; a new paid queue is not required to correct ownership of the state transition.

### SW-08 — P2: Viewing/rating writes do not refresh the statistics queries

**Locations:** `apps/mobile/src/components/tracking-panel.tsx:90`, `apps/mobile/src/providers/offline-sync-provider.tsx:18`, `apps/mobile/app/insights/index.tsx:156`, `apps/mobile/app/(tabs)/index.tsx:46`.

The online refresh invalidates tracking/reviews/library/watchlists only. Offline sync invalidates `['insights']`, which matches none of `['statistics-summary']`, `['statistics-monthly']`, `['statistics-taste']`, `['statistics', ...]`, or `['movie-dna']`. These entries can remain fresh in the five-minute cache after a successful viewing or rating change; window-focus refetch is disabled globally.

The Home preview has an additional boundary problem: its rolling range ends at the initial mount time (`useMemo(..., [])`). Later viewing records remain outside that period even if the query is refetched. Home uses the device zone while Insights uses the profile zone.

**Fix:** Define consistent query-key families and invalidate affected live projections after viewing, episode, rating, import, deletion, and offline-sync writes. Advance Home's rolling period on refresh/focus and use the selected user time zone. Keep immutable saved wraps distinct from live calculations.

### SW-09 — P2: Current streak arithmetic breaks across daylight-saving changes

**Location:** `apps/api/src/insights/insights.service.ts:122`.

The code converts each instant to a member-local date but moves backward with server-local `Date.setDate()`. When the server is UTC and the member's zone changes offset, stepping back one server date can skip or repeat a member-local date.

**Reproduction:** Set now to `2026-03-09T04:30Z` (00:30 in New York). Activity on March 8 and March 9 gives `activeDaysCount: 2` and `longestStreakDays: 2`, but `currentStreakDays: 1`.

**Fix:** Step through local calendar date keys rather than subtracting server-local dates from instants. Cover spring/fall DST, yesterday-only activity, month/year boundaries, and zones different from the server.

### SW-10 — P2: Annual heatmaps and their share cards report an all-time longest streak

**Locations:** `apps/api/src/insights/insights.service.ts:302`, `apps/mobile/src/lib/heatmap-share.ts:77`.

Annual totals and day cells use `yearViewings`, but longest streak uses `allViewings`. The Year in Pixels export prints that value under the selected year without an all-time qualification.

**Database reproduction:** With activity only on two consecutive dates in 2026, request the 2025 heatmap. It reports zero viewings and zero active days, yet a two-day longest streak.

**Fix:** Calculate the annual longest streak from the year's records, or expose separately named annual and all-time fields. A current streak can intentionally be all-time/current, but must be clearly distinct from historical-year metrics.

### SW-11 — P2: The archive hides every wrap after the first 30

**Locations:** `apps/mobile/app/insights/index.tsx:177`, `packages/api-client/src/index.ts:108`, `apps/mobile/app/insights/index.tsx:443`.

The screen requests `wraps?limit=30` once and renders that array. `ApiClient.request()` discards pagination metadata, and there is no next-page or load-more action.

**Database evidence:** More than 30 test wraps return a non-null cursor, and the next API page returns additional nonduplicate records. Thus server pagination works, but the screen cannot access it. Weekly use can reach this limit within months.

**Fix:** Consume the collection envelope/cursor with an infinite query or load-more control. Preserve ordering and deduplication while navigating pages.

### SW-12 — P2: Failed or interrupted archive entries lack a usable recovery path

**Locations:** `apps/mobile/app/insights/index.tsx:86`, `apps/mobile/app/insights/index.tsx:177`, `apps/mobile/app/wraps/[wrapId].tsx:95`.

All non-completed cards are disabled. Generation controls can request only the current period, so a failed wrap from an older period cannot be retried from the UI. There is no polling or generation-state recovery in the detail query: a pending/failed detail without slides becomes “No wrap slides found.” The archive also omits its query error and loading states, so a failed list request leaves an unexplained empty section.

**Fix:** Show explicit loading/error/empty/generating/failed states, expose retry for an eligible stored period, and provide bounded refresh/recovery while generating. Do not show stale slides from a failed attempt as a completed result. Keep the recovery request tied to the original period/time zone/version.

### SW-13 — P3: Wrap period labels use annual and device-local assumptions

**Locations:** `apps/mobile/app/wraps/[wrapId].tsx:28`, `apps/mobile/app/wraps/[wrapId].tsx:72`, `apps/mobile/app/insights/index.tsx:125`.

Every wrap is mapped to `ANNUAL_WRAP` with “Year in Review” and annual branding, including weekly and monthly wraps. The year is derived in the device zone instead of the wrap zone. Archive dates use device-local formatting and show the exclusive `periodEnd` as though it were included (for example July 1–August 1 for a July wrap), while the API's intro correctly subtracts one millisecond for the inclusive displayed end.

**Fix:** Carry the actual wrap type and time zone into presentation metadata/JSON, derive the label from the saved period, and format inclusive display dates consistently.

## Other observations and limits

- Core movie-viewing arithmetic and normalized ratings passed the real database checks. Source queries scope activity to the authenticated owner and exclude soft-deleted viewing/rating rows. Period predicates use `[start, end)`.
- Owner-only wrap read/delete behavior passed local database tests. The global guard rejects missing authentication, deleted/restricted accounts, and revoked/unregistered sessions. The auth provider clears query caches when the account changes. No cross-user disclosure was found in the audited paths; this is not a blanket security certification.
- Public expiring wrap links still intentionally return `501 PUBLIC_WRAP_LINKS_UNAVAILABLE`. This was already documented after the previous sharing audit and is not a new finding. PNG/JSON export remains the supported route.
- Movie DNA uses lifetime completed/rewatching title signals rather than the selected statistics year. Labeling its scope explicitly would reduce ambiguity.
- Empty heatmaps still choose a default Friday/8 PM/evening persona despite having no observations. An “insufficient activity” state would communicate the evidence more accurately.
- The heatmap loads the entire viewing history with full media/genre relations, unlike the 10,000-row cap on period statistics. This is an unbounded-work risk. No production latency benchmark or bottleneck claim is made. Narrower projections, bounded aggregation, and reusing a single wrap input snapshot are **architectural optimizations requiring measurement**, not reasons to add caching or infrastructure now.
- The story auto-advances every five seconds and closes after the final slide. Holding a touch zone pauses it, but there is no persistent pause control or static reading mode. Check keyboard/screen-reader/reduced-motion behavior on actual target devices before calling this accessible.

## Recommended fix order

1. Remove invented renderer data and retire or explicitly isolate the synthetic story route (SW-01/02).
2. Define consistent activity/duration semantics and correct streak calculation/scope (SW-03/04/09/10).
3. Correct snapshot identity, current-period revision UX, and concurrent attempt ownership (SW-05/06/07).
4. Repair live-query refresh and archive paging/recovery (SW-08/11/12).
5. Correct period labels and close the evidence/interaction gaps (SW-13 and observations).

Regression verification should include zero activity, real TV episode completion, partial sessions, offline replay, account changes, identical-boundary time zones, both DST transitions, simultaneous generation, more than 30 wraps, and recovery of a failed historical period. Finish with authenticated browser and native-device checks of the complete create → view → export journey.

## Implementation status

SW-01 through SW-13 were implemented and validated on 4 October 2026. The findings above preserve the pre-fix audit evidence. See [Statistics and wraps release](../deployment/STATISTICS_WRAPS_FIXES.md) for final semantics, regression coverage, deployment and recovery details, and verification limits.
