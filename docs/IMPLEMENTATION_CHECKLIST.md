# CineWrapped Implementation Checklist

This checklist follows the mandatory execution order in the master build prompt. A task is marked complete only after its artifacts are reviewed and its required checks pass.

## Task 1 — Architecture plan

- [x] High-level architecture
- [x] Technology decisions
- [x] Module boundaries
- [x] Data-flow diagrams
- [x] Security model
- [x] Deployment model
- [x] Key technical risks
- [x] Tradeoffs
- [x] Architecture decision log

## Task 2 — Database design

- [x] Prisma schema
- [x] Entity relationship diagram
- [x] Index plan
- [x] Constraint plan
- [x] Soft-delete strategy
- [x] Audit strategy
- [x] Migration strategy

## Task 3 — API contract

- [x] Endpoint list
- [x] Request DTOs
- [x] Response DTOs
- [x] Error codes
- [x] Pagination format
- [x] Authorization matrix
- [x] OpenAPI configuration

## Task 4 — Mobile design specification

- [x] Navigation map
- [x] Screen inventory and descriptions
- [x] Loading, empty, and error states
- [x] Accessibility requirements
- [x] Component inventory
- [x] Design tokens

## Task 5 — Monorepo scaffold

- [x] pnpm and Turborepo
- [x] Mobile, API, admin, and worker apps
- [x] Shared packages
- [x] Docker Compose development services
- [x] ESLint, Prettier, and strict TypeScript
- [x] Environment validation
- [x] GitHub Actions
- [x] Typecheck, lint, and test verification

## Task 6 — Phase 1 authentication and onboarding

- [x] Authentication and secure session management
- [x] Profile setup
- [x] Preference selection
- [x] Favorite-title selection
- [x] Provider integration
- [x] Basic settings
- [x] Unit and integration tests
- [x] Typecheck, lint, and test verification
- [x] Documentation and phase handoff

## Phase 2 — Discovery and media details

- [x] Debounced movie and television search
- [x] Daily and weekly trending discovery
- [x] Normalized media details
- [x] Cast and key crew
- [x] Trailer links
- [x] Country-specific streaming availability
- [x] Redis provider-response caching
- [x] PostgreSQL metadata persistence and refresh policy
- [x] Mobile Discover tab and media-detail screen
- [x] Loading, empty, error, accessibility, and provider-attribution states
- [x] Unit and provider-contract tests
- [x] Typecheck, lint, test, schema, and production-build verification
- [x] Documentation and phase handoff

## Phase 3 — Tracking and library

- [x] Watch statuses and aggregate title progress
- [x] Idempotent viewing and rewatch history
- [x] On-demand episode metadata and episode progress
- [x] Default and custom watchlists
- [x] Five-star, ten-point, and like/dislike rating persistence
- [x] Draft/published reviews, spoiler labels, and visibility
- [x] Optimistic concurrency and owned-resource authorization
- [x] Cursor-paginated personal-library API
- [x] Mobile Library tab and title tracking controls
- [x] Mobile season and episode completion flow
- [x] Validation, service, and provider-contract tests
- [x] Typecheck, lint, test, schema, and production-build verification
- [x] Documentation and phase handoff

## Phase 4 — Recommendations

- [x] Consent-gated taste profile
- [x] Deterministic, versioned scoring engine
- [x] Genre, rating, language, decade, runtime, and popularity signals
- [x] Explicit disliked-genre exclusion
- [x] Stable reason codes and human-readable explanations
- [x] Feedback-driven positive and negative affinity adjustments
- [x] Idempotent viewed, selected, saved, and dismissed actions
- [x] Atomic default-watchlist save behavior
- [x] Cached recommendation batches and opaque cursor pagination
- [x] Manual refresh with per-member rate limiting
- [x] Personalized mobile Home feed and taste summary
- [x] Unit, service, authorization, and validation tests
- [x] Typecheck, lint, test, schema, and production-build verification
- [x] Documentation and phase handoff

## Phase 5 — Social Features

- [x] Privacy-aware member search and public/friend profiles
- [x] Idempotent directional follows
- [x] Canonical friend requests with addressee-only responses
- [x] Bilateral blocks and directional feed mutes
- [x] Visibility-filtered, cursor-paginated activity feed
- [x] Feed projection for viewings, ratings, reviews, and custom lists
- [x] Comments, replies, spoiler metadata, and ownership-safe deletion
- [x] Idempotent reactions with aggregate and viewer state
- [x] Validated deep-link share receipts and native mobile sharing
- [x] Mobile Social tab, member profiles, requests, feed, comments, and reactions
- [x] Service, authorization, and validation tests
- [x] Typecheck, lint, test, schema, and production-build verification
- [x] Documentation and phase handoff

## Phase 6 — Statistics and Wraps

- [x] Timezone-aware half-open statistics periods
- [x] Titles, viewings, duration, rewatches, ratings, and streak totals
- [x] Monthly viewing trend with accessible text summary
- [x] Genre, language, decade, and runtime taste distributions
- [x] Idempotent weekly, monthly, and yearly wrap generation
- [x] Versioned statistics, highlights, and story-slide snapshots
- [x] Renderer-neutral factual story slides
- [x] Consent-gated share-card payloads and native sharing
- [x] Owned, cursor-paginated wrap archive and soft deletion
- [x] Mobile statistics dashboard, archive, and story viewer
- [x] Arithmetic, timezone, idempotency, renderer, ownership, and validation tests
- [x] Typecheck, lint, test, schema, and production-build verification
- [x] Documentation and phase handoff

## Phase 7 — Gamification

- [x] Deterministic achievement definitions, progress, unlocks, and points
- [x] Time-bounded challenges with explicit participation and completion
- [x] Timezone-aware current and longest streaks
- [x] Points, viewings, and streak leaderboards
- [x] Public, friend, private, and bilateral-block leaderboard enforcement
- [x] Country, language, and decade movie passport
- [x] Private-by-default leaderboard and passport controls
- [x] Mobile gamification dashboard and settings experience
- [x] Migration, seed definitions, shared types, validation, OpenAPI, and tests
- [x] Full typecheck, lint, test, schema, build, and production-audit verification
- [x] Documentation and phase handoff

## Phase 8 — Clubs and Collaborative Features

- [x] Public and private clubs with open, approval, and invite-only membership policies
- [x] Owner, administrator, moderator, and member authorization boundaries
- [x] Member discussions and manager announcements
- [x] Single- and multi-select polls with bounded options and close times
- [x] Collaborative watchlist suggestions with one vote per member
- [x] Scheduled watch events with timezone and optional title/location metadata
- [x] Membership approval and removal without owner lockout
- [x] Mobile discovery, club creation, detail, discussion, poll, watchlist, and event flows
- [x] Migration, shared contracts, validation, OpenAPI decorators, and tests
- [x] Full typecheck, lint, test, schema, build, and production-audit verification
- [x] Documentation and phase handoff

## Phase 9 — Advanced AI Features

- [x] Auditable natural-language constraint interpretation
- [x] Mood, runtime, era, language, media type, popularity, and service discovery filters
- [x] Request-scoped conversational recommendation refinement
- [x] Typed AI provider boundary with an honest local grounded adapter
- [x] Short, detailed, funny, spoiler-free, and social-caption review drafts
- [x] Explicit assisted-draft labeling, editing, and approval before publication
- [x] Evidence-counted enhanced Movie DNA with confidence and versioning
- [x] Recommendation opt-in enforcement, bounded inputs, and rate limiting
- [x] Mobile discovery, assistant, review, and Movie DNA experiences
- [x] Unit, validation, typecheck, lint, test, schema, and build verification
- [x] Documentation and phase handoff
