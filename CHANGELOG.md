# Changelog

All notable changes are documented here. The project follows semantic versioning once public releases begin.

## [Unreleased]

### Added

- Task 1 system architecture and decision log.
- Task 2 Prisma schema and database design.
- Task 3 versioned REST/OpenAPI contract.
- Task 4 mobile design specification and design-system tokens.
- Task 5 pnpm/Turborepo monorepo foundation with mobile, API, admin, worker, shared packages, local Docker services, and CI.
- Task 6 Supabase authentication, secure session registry, guarded Expo routes, ordered onboarding, atomic completion, TMDB catalog search, profile/privacy settings, and Phase 1 tests.
- Phase 2 discovery with debounced search, trending movies and shows, normalized details, cast and crew, trailers, regional streaming availability, Redis caching, and mobile discovery/detail surfaces.
- Phase 3 personal tracking with watch status, idempotent viewing history, episode progress, default and custom watchlists, ratings, reviews, optimistic concurrency, and the mobile Library flow.
- Phase 4 consent-gated deterministic recommendations with taste profiles, versioned scoring, explanations, feedback learning, save/dismiss actions, and the personalized mobile Home feed.
- Phase 5 privacy-aware member profiles, follows, friend requests, activity feed projection, comments, reactions, blocks, mutes, share receipts, and the mobile Social experience.
- Phase 6 timezone-aware statistics, monthly trends, taste distributions, versioned weekly/monthly/yearly wraps, factual story slides, share cards, and the mobile wrap archive/viewer.
- Phase 7 achievements, opt-in challenges, timezone-aware streaks, privacy-filtered leaderboards, movie-passport stamps, and mobile privacy controls.
- Phase 8 public/private clubs, membership approval and roles, discussions, polls, collaborative watchlists with voting, scheduled watch events, and mobile club experiences.
- Filled and outlined icons for every mobile bottom-tab destination.

### Security

- Updated `@fastify/static` to `10.1.2`; the high-severity production dependency audit passes.

### Fixed

- Apply the saved system, light, or dark appearance preference across mobile screens, navigation, and the status bar.
