# Phase 7 Checklist — Gamification

- [x] Achievement definitions, progress synchronization, points, and optional feed activity
- [x] Time-bounded opt-in challenges with deterministic progress and completion
- [x] Current and longest viewing streaks calculated in the member timezone
- [x] Points, viewing, and streak leaderboards with public/friend/private visibility
- [x] Bilateral block exclusion from leaderboard candidates
- [x] Country, language, and decade movie-passport projection
- [x] Private-by-default leaderboard and passport controls
- [x] Mobile achievements, challenges, streak, leaderboard, and passport experience
- [x] Seed data, migration, shared contracts, validation, OpenAPI, and tests

## Verification gate

- Database schema formats, validates, and generates a Prisma client.
- Shared packages, API, and mobile compile.
- API gamification behavior is covered by Vitest.
- Full workspace checks and the production dependency audit must pass before Phase 8 begins.
