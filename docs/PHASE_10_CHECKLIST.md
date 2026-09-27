# Phase 10 Checklist — Hardening and Launch

Phase 10 converts the implemented product into a release candidate. A feature being present is not
evidence that it is safe to enable. Every production feature flag remains disabled until its
authorization, failure-recovery, observability, and client-unavailable paths have passed.

## 1. Release baseline

- [ ] `pnpm check` passes from a clean checkout using the pinned Node and pnpm versions
- [ ] Production dependency audit has no unaccepted high-severity findings
- [ ] Prisma migrations apply to a fresh database and upgrade a production-like snapshot
- [x] Database integration tests run against an isolated PostgreSQL instance instead of being skipped
- [ ] API, worker, admin, Android, and iOS release artifacts are reproducible in CI
- [ ] Release version, commit SHA, migration version, and rollback artifact are recorded

## 2. Critical workflow verification

- [ ] Register, verify, onboard, sign in, restore session, recover password, and sign out
- [ ] Discover a title, track it, rate it, review it, and verify statistics update
- [ ] Recommendation opt-in, refresh, feedback, and opt-out
- [ ] Follow, friend, block, mute, report, and privacy-concealment boundaries
- [ ] Create and moderate a club without owner lockout
- [ ] Admin password, TOTP enrollment/challenge, authorization, audit log, and sign out
- [ ] Account export and deletion complete or recover safely after every external failure point
- [ ] At least one automated HTTP, admin-browser, and mobile-device critical journey runs in CI

## 3. Background work and recovery

- [ ] Every enabled outbox event has a registered, idempotent worker handler
- [ ] Unknown event types are quarantined with an actionable error and do not retry forever
- [ ] Publish failure, handler retry, stale lock recovery, and dead-letter behavior have integration tests
- [ ] Job payloads are versioned and validated before processing
- [ ] Queue concurrency, timeouts, retry limits, retention, and shutdown behavior are documented
- [ ] Operators can inspect and safely replay or cancel dead-lettered work
- [ ] Queue depth, oldest-job age, failure rate, and dead-letter count are monitored

## 4. Security and privacy

- [ ] Independent review covers authentication, authorization, object ownership, and admin boundaries
- [ ] Account deletion requires recent authentication and uses a resumable, idempotent workflow
- [ ] Storage erasure, identity deletion, relational purge, and retained audit data are documented and tested
- [ ] Upload MIME detection, size limits, private-bucket policy, signed URLs, and malware strategy are reviewed
- [ ] Rate limits cover authentication-adjacent, AI, search, upload, social, and destructive operations
- [ ] Logs, traces, analytics, and error reports exclude tokens, private content, and sensitive identifiers
- [ ] Secrets are rotated, least-privilege credentials are used, and no production secret enters a client bundle
- [ ] Privacy policy, terms, retention schedule, provider disclosures, and store privacy declarations match behavior

## 5. Reliability, backups, and deployment

- [ ] Production database backups and point-in-time recovery are enabled
- [ ] A restore into an isolated environment is timed, verified, and documented
- [ ] Redis loss and queue recovery behavior are tested; authoritative data remains in PostgreSQL
- [ ] Deploy order, migration procedure, health verification, rollback, and incident ownership are documented
- [ ] Liveness checks process health; readiness checks only dependencies required to serve safely
- [ ] External probes cover the public API, admin portal, authentication callback, and critical provider paths
- [ ] Provider timeouts, bounded retries, circuit-breaking behavior, and degraded client states are verified

## 6. Observability

- [ ] Structured logs include request/job correlation IDs, release, route/job name, outcome, and duration
- [ ] Error reporting is configured for API, worker, admin, and mobile with source maps and release tags
- [ ] Metrics cover request latency/error rate, database pool usage, slow queries, cache behavior, and job health
- [ ] Alerts have actionable thresholds, owners, runbook links, and deduplication
- [ ] Product analytics are consent-aware, privacy-safe, and limited to reviewed typed events
- [ ] Dashboards and alerts are exercised with controlled failures before beta

## 7. Performance and accessibility

- [ ] Load scenarios and data volumes are defined before performance claims are made
- [ ] API p50, p95, p99, throughput, error rate, database queries, CPU, and memory are measured
- [ ] Mobile cold start, session restore, scrolling, image memory, and poor-network behavior are measured
- [ ] Results, bottlenecks, changes, and before/after measurements are retained
- [ ] VoiceOver and TalkBack critical journeys pass on physical devices
- [ ] Font scaling, contrast, focus order, reduced motion, touch targets, keyboard use, and screen rotation are reviewed

## 8. Store readiness and beta

- [ ] App icons, screenshots, descriptions, support URL, privacy URL, review notes, and age/content ratings are final
- [ ] Signing credentials, bundle identifiers, entitlements, notification credentials, and universal links are verified
- [ ] Internal iOS and Android builds install, update, deep-link, receive notifications, and recover sessions
- [ ] A small closed-beta cohort, support channel, feedback taxonomy, and incident path are defined
- [ ] Beta success criteria include activation, retention, crash-free sessions, API errors, and deletion success
- [ ] Feature rollout starts conservatively and has explicit pause/rollback criteria
- [ ] Final go/no-go review records accepted risks, owners, and follow-up dates

## Release gate

Launch is allowed only when all release-blocking items above pass, no critical security or data-integrity
issue remains open, backup restoration has been demonstrated, and the release candidate has completed a
closed-beta soak period without breaching its agreed reliability thresholds.
