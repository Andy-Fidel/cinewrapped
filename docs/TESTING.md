# Testing Strategy

Vitest covers shared contracts, API services and provider adapters, transient mobile state, and database migration smoke tests. Later phases add full HTTP Supertest suites, Playwright admin tests, and Maestro or Detox mobile journeys.

Current checks:

- Environment parsing and secret/configuration validation
- Shared username and country validation
- API-client envelope, bearer-token, and typed-error behavior
- API and worker readiness contracts
- Design-token generation and version integrity
- Prisma schema validation
- Authentication bootstrap and TMDB response normalization
- TMDB details, credits, trailer, season-summary, and monetization-group normalization
- TMDB episode normalization for on-demand season progress
- Personal-library ownership derivation and optimistic-version conflicts
- Viewing-event retry idempotency through stable client operation identifiers
- Rating-scale and review-version validation
- Deterministic recommendation ordering, disliked-genre exclusion, and explanation reasons
- Recommendation cold-start confidence, opt-out enforcement, and feedback ownership boundaries
- Recommendation feedback action validation
- Canonical friendship ordering, self-relationship rejection, and addressee-only responses
- Bilateral blocked-profile concealment before relationship or count data is queried
- Friend-request UUID and social-comment length/spoiler validation
- Statistics duration, unique-title, rating, genre, rewatch, active-day, and streak arithmetic
- IANA timezone rejection before viewing-history queries
- Completed-wrap idempotency and renderer output derived from stored facts
- Foreign-wrap concealment, paired period boundaries, supported wrap types, and sharing consent
- Gamification progress projection, achievement unlocking, current/longest streaks, passport country stamps, inactive-challenge rejection, and leaderboard privacy predicates
- Onboarding validation, ordered draft-state reset, and atomic completion invariants
- TypeScript compilation and production application builds
- High-severity production dependency audit

Run all checks with `pnpm check`. Tests must not call real identity, metadata, email, push, analytics, or AI providers. Provider integration tests use explicit development adapters or recorded contract fixtures outside production paths.

Run `pnpm audit --prod --audit-level high` separately because it requires registry access. The accepted residual moderate advisory and mitigation are recorded in the repository security policy.

The default suite has no external-service dependency. To verify the real PostgreSQL migration and seed, provision an isolated test database, apply the migration and seed, then run:

```bash
TEST_DATABASE_URL=postgresql://... pnpm --filter @cinewrapped/database test
```

Never point `TEST_DATABASE_URL` at a shared, staging, or production database.
