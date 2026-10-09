# Library browsing and personal viewing goals

Library now loads beyond the first 50 titles. It supports debounced, case-insensitive title search, combined status/movie/TV filters, and recent/oldest/title sorting. Pages use stable keyset ordering with an ID tie-breaker; cursors are scoped to owner, filters and sorting. Search treats SQL wildcard characters literally. Failed later pages preserve loaded items and offer retry. Counts describe loaded entries rather than claiming a full-library total. Concurrent edits can change ordering between pages; refresh to obtain the current result.

Calendar → Viewing History → Edit viewing goals saves recurring annual and monthly targets through existing account preferences. Targets accept whole numbers from 1 to 10,000; blank disables a goal. Existing accounts start without targets. Counts include logged viewings, rewatches and TV episodes through today in the profile timezone. Calendar days determine pacing, including leap years and daylight-saving transitions. Goals repeat each period; historical target snapshots are not stored. Preference updates retain the existing last-save-wins behavior.

## Data and release order

The Supabase CLI generated `20261008193549_viewing_goals`. The checked-in Prisma migration adds two nullable preference columns and range constraints. Existing row-level security and server-side ownership remain in force. The migration was tested by applying all 19 migrations to a fresh local PostgreSQL database. Production migration history records the checked-in SQL checksum.

Release order: additive database migration, API, web. Rollback the web and API deployments if needed while retaining the additive columns and stored goals. No new service, dependency, paid plan, cache, queue or scheduled task is required.

## Verification

- API suite: 142 tests passed before the final constraint test; focused suite then passed all 13 tests on the freshly migrated database. Coverage includes all four pagination orders, tied ordering keys, 63 entries, combined filters, search beyond page one, literal wildcard search, invalid cursors, authentication, account isolation, goal save/reload/clear, invalid API input and database constraints.
- Mobile suite: 119 tests and 8 PWA checks passed. Goal tests include year boundaries, leap years and daylight-saving dates.
- API/mobile TypeScript checks and API build passed. Lint reported no errors; existing unrelated warnings remain.
- Compiled web browser tests exercised Library and Calendar at 320×568, 568×320, 768×1024 and 1440×900: 8 route/geometry checks passed. Each viewport also passed pagination, search, combined filters, goal validation/save/reload/clear. Browser API/auth responses were intercepted fixtures; real HTTP and PostgreSQL persistence were verified by integration tests.
- Supabase security advisor retained existing backend-only RLS/no-policy informational findings and the pre-existing [leaked-password protection warning](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). This release does not change authentication configuration.

Production database verification found both nullable goal columns, both range constraints, RLS enabled, and the matching Prisma migration checksum. The security advisor findings were unchanged after migration. API deployment `dpl_FXFDE5oQ8PCWmDKQHd5hWTCsx7br` reached READY on `https://cinewrapped-api.vercel.app`; live and readiness endpoints returned 200, while anonymous library and preferences requests returned 401.

Web deployment `dpl_Ee5G9bCDmBnfxhRhXU6PCYHXw72M` reached READY on `https://cinewrapped.vercel.app`. Library, Calendar, the manifest and service worker returned 200; the served JavaScript included both goal controls, persisted goal fields and title sort modes. No real signed-in production account was used for mutation testing. Source was deployed from the working tree based on `ad20800dcd0843dbb00f0cd01599e73e65c46afe`; changes remain uncommitted.
