# Vercel migration on free plans

## Status

Deployed on 4 October 2026 to Andy-Fidel Samuel's verified Vercel Hobby workspace. Supabase remains on Free. Keep the paid Render API, admin, and worker suspended.

- Web: https://cinewrapped.vercel.app
- Admin: https://cinewrapped-admin.vercel.app
- API: https://cinewrapped-api.vercel.app/api/v1

The private cache migration and the previously pending account-erasure migration were applied successfully through Prisma. Supabase `pg_cron` and `pg_net` are enabled, scheduler credentials are stored in Vault, and both the outbox and hourly cache-cleanup schedules are active. Supabase Auth uses the new web Site URL and exact `/auth/callback` redirect; the native callback remains allowed.

Scheduler delivery was verified end to end: a `system.healthcheck` outbox event reached `PUBLISHED` after one attempt, with no error, and `pg_net` recorded HTTP 201 without a timeout. Subsequent idle scheduler checks succeeded without making an HTTP request.

Production checks passed: API database readiness, admin health, unauthenticated job/user-route rejection, web callback deep links, and CORS preflight from the web app. Both sign-in pages rendered in a browser, and invalid web credentials were rejected. Successful user login, authenticated catalog flows, and admin MFA still require verification with a real account. Installed native binaries need a new build because they contain the old API URL; both EAS profiles and the local Expo environment now use the Vercel endpoint. No native build was submitted.

Validation completed: 99 API, worker, and configuration tests passed; affected code passed type checks and linting; Expo web export and the admin production build passed. The new SQL migration, counter increments and expiry reset, JSON cache round trip, and denial of anonymous/authenticated schema access passed against the existing Supabase database inside a transaction. All integration-test changes were rolled back.

The next feature release adds real resumable Letterboxd imports, downloadable account JSON, social push delivery/receipts and durable offline viewing logs. See [feature release and recovery notes](FEATURE_RELEASE.md) for scope, tests and remaining native/manual checks.

## Architecture decision

The current low-traffic app needs a web frontend, an admin portal, an authenticated API, shared caches and AI quotas, and a recoverable account-erasure workflow. Hosting must use free plans. Existing Supabase owns Postgres, authentication, and storage; the migration keeps those boundaries and data.

Deploy three Vercel Hobby projects from the same repository: `apps/mobile` (static Expo web), `apps/admin` (Next.js), and `apps/api` (NestJS). Enable access to workspace files outside each project's root. Use Node 22.x and the committed pnpm lockfile. Each app has its own `vercel.json`.

Set `ENABLE_EXPERIMENTAL_COREPACK=1` for each project so all lifecycle scripts use the pinned pnpm version. The API builds its workspace dependencies directly and uses `outputDirectory=dist`; Vercel packages the compiled `dist/main.js` rather than recompiling TypeScript with a separate configuration. Prisma generation must run on every API build: restoring only the database package's `dist` from Turbo cache omits the generated client. `.vercelignore` explicitly excludes local environment files, dependency trees, build output, caches, and native build directories.

When `REDIS_URL` is absent, the API uses private Postgres tables for cache entries and atomic request counters. Limits are shared across function instances. AI operations continue to fail closed when counters cannot be read. Reads fall back to their provider on cache failure. Expired entries are ignored and removed hourly.

The worker also supports one-job invocations through `POST /api/v1/internal/jobs/run`. A server-only bearer secret protects this route independently of Supabase user authentication. Supabase Cron checks the existing durable outbox each minute and invokes Vercel only when work is due. It never invokes an idle worker. One job is claimed using row locks and `SKIP LOCKED`; success is acknowledged after processing; failures persist bounded retry state. A terminated invocation's lease can be reclaimed after ten minutes, exceeding the 300-second Vercel invocation limit.

This avoids a new database, queue provider, paid cron plan, or permanent worker process. The existing Redis/BullMQ mode remains available for local development and future persistent workers. Alternatives considered: retain the free Render cache (adds a cross-provider connection), add a Redis provider (another account and quota), or use Vercel Cron (Hobby only schedules daily). Reconsider dedicated workers if job volume grows or an account's erasure cannot complete within one invocation. Large account erasures need a checkpointed storage walk before scaling; this migration does not claim that unbounded storage trees fit within 300 seconds.

## Environment

API server-only variables: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_JWT_ISSUER`, `SUPABASE_JWT_AUDIENCE`, `SUPABASE_JWKS_URL`, `SUPABASE_SECRET_KEY`, `TMDB_API_TOKEN`, `OPENAI_API_KEY`, `PUSH_TOKEN_ENCRYPTION_KEY`, and `CRON_SECRET` (random, at least 32 characters). Preserve the production push-encryption key to keep existing encrypted tokens readable. Set `NODE_ENV=production`, `TRUST_PROXY=true`, `API_DOCS_ENABLED=false`, `PRISMA_CONNECTION_LIMIT=1`, `OUTBOX_MAX_ATTEMPTS=10`, and `CORS_ORIGINS` to the exact frontend and admin production origins. Do not set `REDIS_URL` for this deployment. Use the Supabase transaction-pooler connection string with Prisma's `pgbouncer=true&connection_limit=1`; do not use the local `.env` database URL. Keep a direct/session-pooler connection for migrations.

Web public variables: `EXPO_PUBLIC_API_BASE_URL` (API URL ending `/api/v1`), `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and `EXPO_PUBLIC_EAS_PROJECT_ID`.

Admin public variables: `NEXT_PUBLIC_API_BASE_URL` (ending `/api/v1`), `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Its CSP derives API and Supabase origins from these values. No server-only key belongs in a public variable.

Copy secrets directly from the existing production configuration into Vercel, without committing them or printing them in logs. The root `.env` contains local database and Redis addresses and is unsuitable for production.

## Rollout and verification

1. Authenticate Vercel CLI and verify the destination workspace uses Hobby. Create the three projects with the roots above. Do not add paid integrations or enable Pro.
2. Validate the migration on a test database, then apply `20261003233000_serverless_cache` to the production database through the established Prisma migration workflow. The new schema is private and grants no anonymous or authenticated-client access.
3. Deploy the API preview. Verify liveness/readiness, a 401 for an unauthorized scheduled-job request, existing authenticated flows, and shared quota enforcement. Do not execute account deletion as a smoke test.
4. Deploy the web and admin with the production API URL; configure exact CORS origins. Update Supabase's site URL and allowed authentication redirect URLs. Rebuild the Expo native client with its new API URL for installed mobile users.
5. Promote verified deployments. In Supabase, apply `infrastructure/scripts/enable-vercel-scheduler.sql`, store `cinewrapped_api_url` and `cinewrapped_cron_secret` in Vault, then execute `infrastructure/scripts/schedule-vercel-jobs.sql`. Monitor `cron.job_run_details`, `net._http_response`, Vercel runtime errors, and failed/exhausted `outbox_events`.
6. Verify login, catalog search, a protected API route, admin MFA, and SPA deep links in the deployed app. Keep Render services suspended throughout; use Vercel rollback for a failed release.

## Costs and recovery

Vercel Hobby and existing Supabase Free have usage caps. A free plan does not mean unlimited capacity; this work does not upgrade plans or authorize usage charges. Existing OpenAI API calls retain their separate provider costs. This migration moves hosting, not AI billing.

For a scheduler failure, inspect its HTTP response and secret/URL configuration, then retry pending events through the authenticated endpoint. The endpoint processes at most one event. Investigate exhausted attempts before resetting them. Disable the named Cron job before returning to the persistent BullMQ worker so both delivery modes never consume the same outbox concurrently.

References: [NestJS on Vercel](https://vercel.com/docs/frameworks/backend/nestjs), [Expo web hosting](https://docs.expo.dev/guides/publishing-websites/), [Supabase scheduled HTTP calls](https://supabase.com/docs/guides/functions/schedule-functions), [Vercel Hobby cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing).
