# Local Development

## Prerequisites

- Node.js 22.14+
- pnpm 11.9+
- Docker with Compose

Copy `.env.example` to `.env` and replace placeholder values with development credentials. `.env` is ignored by Git.

## Infrastructure

```bash
docker compose up -d postgres redis mailpit
```

| Service        | Address                 |
| -------------- | ----------------------- |
| PostgreSQL     | `localhost:5432`        |
| Redis          | `localhost:6379`        |
| Mailpit SMTP   | `localhost:1025`        |
| Mailpit web UI | `http://localhost:8025` |

Optional MinIO:

```bash
docker compose --profile storage up -d minio
```

MinIO API uses `http://localhost:9000`; its console uses `http://localhost:9001`.

## Install and verify

```bash
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm check
```

`db:migrate` applies the versioned PostgreSQL schema. `db:seed` idempotently installs TMDB genre identifiers and the initial streaming-provider catalog; it never creates users or credentials. Prisma schema validation and client generation do not require a running database.

## Run applications

```bash
pnpm dev
```

Individual applications:

```bash
pnpm --filter @cinewrapped/api dev
pnpm --filter @cinewrapped/worker dev
pnpm --filter @cinewrapped/admin dev
pnpm --filter @cinewrapped/mobile dev
```

The Expo app loads `EXPO_PUBLIC_*` values from the workspace-root `.env` through
`apps/mobile/app.config.ts`. Keep the configured phone and development machine on the same network;
the mobile API base URL must use the machine's LAN address rather than `localhost`.

Default URLs:

- API: `http://localhost:4000/api/v1`
- API docs: `http://localhost:4000/api/docs`
- Admin: `http://localhost:3000`
- Expo dev server: shown by Expo CLI

## Environment validation

The API and worker parse all required environment values before opening network connections. Mobile/admin public parsers accept public build-time configuration only. A failed schema produces a startup error rather than silently using a dangerous production default.

## Media provider and cache

Set `TMDB_API_TOKEN` to a TMDB API read-access token. The token remains server-side. Discovery requests use Redis for short-lived provider-response caching and PostgreSQL for normalized records. If Redis is briefly unavailable, requests fall through to TMDB and continue without persisting cache errors; PostgreSQL remains authoritative for application relationships.

## Data reset

Local volumes contain disposable development state. Stop the services before intentionally removing volumes. Because volume removal is destructive, it is not wrapped in an automatic project command; use Docker Compose explicitly after confirming the target project is `cinewrapped`.

## Common issues

- If Prisma cannot connect, verify `DATABASE_URL` and PostgreSQL health with `docker compose ps`.
- If jobs cannot start in later phases, verify Redis health and `REDIS_URL`.
- If discovery works slowly or TMDB usage rises, verify Redis connectivity and inspect the cache policy in `docs/media/MEDIA_PROVIDER.md`.
- If Expo cannot reach a localhost API from a physical device, set `EXPO_PUBLIC_API_BASE_URL` to the development machine's LAN address.
- If sign-in succeeds but bootstrap fails, confirm the API Supabase issuer, audience, and JWKS values all reference the same project used by the Expo public URL and anon key.
- If avatar upload fails, apply the bucket and owner-folder policies in `SUPABASE_SETUP.md`.
- If a generated token package is stale, run `pnpm --filter @cinewrapped/ui-tokens generate`.
