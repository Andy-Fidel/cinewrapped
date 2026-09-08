# Render launch preparation

Prepared 2026-09-07 and deployed to Render on 2026-09-08.

## Proposed budget and services

- `cinewrapped-api`: Render `0.5c-512mb`, $7/month compute. Activated in My Workspace on 2026-09-08.
- `cinewrapped-web`: static Expo web export, no compute charge; workspace bandwidth/build limits still apply.
- `cinewrapped-cache`: existing free Key Value instance, ephemeral cache only. Cache restarts clear cached responses and rate counters; paid AI calls fail closed while cache is unreachable. Do not use this instance for durable jobs.
- Reuse the existing Supabase database, Auth and Storage. Their quotas, backups, SMTP, API usage, and OpenAI charges are separate from the $7 Render service.
- No worker or admin web service is provisioned by this budget Blueprint. The existing worker has no business-job handlers, so deploying it would not enable missing features.

A $7 API instance alone does not make the entire system production-ready. Confirm the overall budget and database backup/recovery arrangements before inviting real users. Paid persistent Redis and a worker would increase the budget.

Sources: https://render.com/pricing, https://render.com/docs/compute-plans, https://render.com/docs/free

## What this release enables

The existing API and web app include authentication/onboarding, discovery, tracking, reviews, recommendations, social features, statistics/wraps, gamification, clubs, and the grounded AI assistant.

The completed feature set was released at 100% in production for:

- `MOVIE_JOURNAL`
- `CALENDAR_INTEGRATION`
- `SOUNDTRACKS`
- `SCENE_IDENTIFICATION`

For a new environment, run this once in the API Render shell after validating storage and the scene-identification provider:

```sh
./node_modules/.bin/tsx packages/database/prisma/release-features.ts
```

This transaction enables 100% production/staging rollout for `MOVIE_JOURNAL`, `CALENDAR_INTEGRATION`, `SOUNDTRACKS`, and `SCENE_IDENTIFICATION`. It preserves per-user overrides. It is intentionally not run on every deployment: later operator disables must survive restarts. Verify with an authenticated `GET /api/v1/feature-flags` and test each feature.

Other advanced flags are not blanket-enabled. Watch-party synchronization, prediction leagues, club analytics, native OS widgets, and queued import/export processing do not have complete implementations. Existing in-app widgets, calendar visualizations, client CSV import, and on-demand wraps are distinct from those planned services. The assistant currently uses a local grounded adapter; scene identification uses the configured OpenAI API.

Remote push delivery is also incomplete: the current API stores tokens/preferences and exposes an inbox, but no delivery worker is implemented. Android Expo Go and web cannot register native push tokens; those paths now avoid importing the unsupported native module. An installed native build and a delivery implementation are required before promising push delivery.

## Deployment configuration

`render.yaml` retains the existing repository/branch and service names. Both API and website have automatic deployment off for a controlled release. Confirm live service ownership and actual hostnames before applying. A suffixed Render hostname or custom domain requires updating both `CORS_ORIGINS` and the web API URL.

Live preflight against **My Workspace** (`tea-d5khp07pm1nc7384eu30`) on 2026-09-07 found:

- `cinewrapped-api` already exists at `https://cinewrapped-api.onrender.com`, uses the expected repository, branch, Dockerfile, Frankfurt region, and readiness path. It now runs on `0.5c-512mb`; automatic deploys are off.
- `cinewrapped-cache` is available on the free, non-persistent plan in Frankfurt.
- No Render PostgreSQL instance exists; production data is expected to remain in Supabase.
- The application deploy (`361ed39`) remains live. Before the upgrade, the public liveness probe took about 55 seconds to wake the free instance across two attempts. After the compute-plan deployment (`dep-dafq3t2d0e5s73dgnulg`), liveness and database readiness returned HTTP 200 in 0.72 and 0.92 seconds respectively.
- The prior 24 hours contained no error/fatal logs. Performance warnings ranged from roughly 0.5 to 3.8 seconds, especially for trending media, recommendations, statistics, and media details.

The production release uses commit `2322176b8c87e4336fb84b5c79c1db3ff6fd58c4`. The API and static website deployments completed successfully. The public website is `https://cinewrapped-web.onrender.com`; its login and callback routes return HTTP 200 and render in a browser. API liveness and database readiness both return HTTP 200.

Automatic deploy is disabled, so pushing the release branch will not start an uncontrolled API deployment.

The API uses `PORT` supplied by Render and listens on `0.0.0.0`. Readiness queries PostgreSQL; liveness only checks the running process. Migrations and reference-data seeding run in `preDeployCommand`; container startup only launches the API.

The web export uses Expo's `single` output with a `/*` → `/index.html` rewrite, so refreshing dynamic media/profile/club URLs and auth callbacks opens the app. This is an authenticated SPA, without per-route static SEO.

### Environment values

Set server-only values on the API service (never on the static site):

- `DATABASE_URL`: production PostgreSQL connection with TLS and a connection limit appropriate to its pool.
- Optional `DIRECT_DATABASE_URL`: direct or session-pooler migration connection, if `DATABASE_URL` uses a transaction pooler. Add this separately in Render if needed.
- `SUPABASE_URL`, `SUPABASE_JWT_ISSUER`, `SUPABASE_JWT_AUDIENCE`, `SUPABASE_JWKS_URL`, `SUPABASE_SECRET_KEY`.
- `TMDB_API_TOKEN`, `OPENAI_API_KEY`, and a verified `OPENAI_VISION_MODEL` available to that project.
- Preserve the existing `PUSH_TOKEN_ENCRYPTION_KEY` when updating a service; changing it makes previously encrypted tokens unreadable.

The cache's internal `REDIS_URL` is wired by the Blueprint. The website gets only `EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_SUPABASE_URL`, the public anon/publishable key in `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and `EXPO_PUBLIC_EAS_PROJECT_ID`. Changing public values requires rebuilding the website.

### Supabase setup

Follow `SUPABASE_SETUP.md` and review `infrastructure/supabase/private-storage.sql` against the correct project before applying storage policies. Journals and scene images require private, ownership-restricted buckets; avatars use the configured public avatar bucket. Confirm production SMTP/email verification and recovery delivery.

Set the Auth Site URL to the actual web origin. Add exact redirect allowlist entries:

- `https://cinewrapped-web.onrender.com/auth/callback` (replace with the actual host if different)
- `cinewrapped://auth/callback`
- Local callback URLs only if local development uses this Auth project.

Production now uses `https://cinewrapped-web.onrender.com` as the Auth Site URL and retains both the exact web callback and `cinewrapped://auth/callback` in the allowlist.

The Prisma tables are API-only. Migration `20260908061000_lock_down_supabase_data_api` enables RLS and revokes all table, sequence, and function privileges from the Supabase `anon` and `authenticated` roles. Storage access remains governed by the ownership policies in `infrastructure/supabase/private-storage.sql`. Verification found all 66 public application tables protected, zero browser-role table grants, and HTTP 401 for a direct publishable-key request to the application tables.

Browser OAuth now redirects back to its current origin; native auth retains the application scheme. Configure Google/Apple providers separately in Supabase. See https://supabase.com/docs/guides/auth/redirect-urls.

## Release sequence

1. Confirm Render workspace, budget, target service and production environment. Back up the production database.
2. Run `pnpm check`, Expo Doctor, and a frozen-lockfile Docker build. Test the image against an isolated database before production migrations.
3. Authenticate Render CLI (`render login`) and run `render blueprints validate render.yaml` against the confirmed workspace. Public-schema validation does not check account-specific service conflicts.
4. Review the complete changes, including the poster/Lottie assets already in the workspace. Commit and push the chosen release commit; no push has been performed by this preparation.
5. Apply the Blueprint to the existing services and review the charges before applying. Supply secret values in Render. Deploy API first, verify readiness, then deploy web.
6. Check signup, email confirmation, password recovery, OAuth, onboarding, search, watchlist save, and page refresh on a dynamic route in desktop/mobile browsers.
7. Verify private storage access and scene identification, run the one-time feature release command, and check its flag response and each newly enabled screen.
8. Inspect errors, memory/CPU, database connections and provider quotas. Test cold restarts. Keep a previous release available for application rollback; database migration rollback requires a separately reviewed plan.

## Outstanding release gates

- Supabase is currently on the Free plan. Leaked-password protection requires Pro, so the security advisor retains that warning. Confirm the database backup/recovery plan and production SMTP delivery before inviting users.
- Live provider checks still require an authenticated test account: Google/Apple OAuth, OpenAI scene identification, TMDB access, email confirmation, and password recovery.
- Real browser authentication round trips and installed-device testing.
- Background-job and push delivery implementation if those are included in the requested launch scope.
- The bundled Disney promotional poster is third-party artwork; no distribution license was supplied in this workspace. Resolve asset rights for a public release or replace it with owned/licensed artwork.
