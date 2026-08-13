# Advanced Feature Foundation

This foundation is the release and infrastructure boundary for CineWrapped's optional features.
It intentionally ships with every advanced flag disabled.

## Feature flags

`GET /api/v1/feature-flags` evaluates flags for the authenticated Supabase subject. Evaluation is
server authoritative and follows this order:

1. A non-expired user override wins.
2. A disabled definition or an environment mismatch returns disabled.
3. An enabled definition uses a deterministic user bucket and `rolloutPercentage`.

The mobile provider defaults every key to disabled when signed out, loading, or unable to fetch.
New screens should use `FeatureGate` at their route boundary and enforce the same flag in the API
service before accepting writes. UI gating is not authorization.

Example rollout:

```sql
update feature_flags
set enabled = true,
    "rolloutPercentage" = 10,
    environments = array['production'],
    "updatedAt" = current_timestamp
where key = 'MOVIE_JOURNAL';
```

## Private files

All advanced-feature buckets are private. The authenticated user's Supabase UUID is the first
folder component. Downloads use expiring signed URLs. Storage policies live in
`infrastructure/supabase/private-storage.sql`; they do not modify Supabase-managed schemas or
Realtime internals.

## Background work

Domain writes and their outbox event must commit in the same PostgreSQL transaction. The worker
claims outbox rows with `FOR UPDATE SKIP LOCKED`, publishes a stable job ID to BullMQ, and marks the
row published only after Redis acknowledges it. Consumer failures retry with exponential backoff;
exhausted jobs are retained in a dead-letter queue for inspection.

No advanced feature may be enabled until its API authorization tests, worker retry path, private
storage behavior, and mobile unavailable state have passed.
