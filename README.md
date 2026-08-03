# CineWrapped

CineWrapped is a cross-platform social movie and television tracker focused on personal history, explainable recommendations, friendships, statistics, and weekly/monthly/yearly wraps.

The project is being built in the ordered phases defined by the master build prompt. Phases 1–3 provide identity, discovery, and tracking. Phase 4 adds explainable recommendations, Phase 5 adds privacy-aware social features, and Phase 6 adds deterministic statistics and wraps. Phase 7 adds achievements, challenges, streaks, privacy-safe leaderboards, and a movie passport.

## Workspace

```text
apps/
  mobile/       Expo and Expo Router
  api/          NestJS/Fastify modular-monolith entry point
  admin/        Next.js App Router administration surface
  worker/       NestJS background-worker entry point
packages/
  analytics/    Typed privacy-safe product events
  api-client/   Authenticated envelope-aware HTTP client
  config/       Zod environment validation
  database/     Prisma schema and client boundary
  eslint-config/
  shared-types/
  typescript-config/
  ui-tokens/    Generated from the design-system source
  validation/
```

## Prerequisites

- Node.js 22.14 or newer
- pnpm 11.9 or newer
- Docker with Compose for PostgreSQL, Redis, Mailpit, and optional MinIO

## Start locally

```bash
cp .env.example .env
pnpm install
docker compose up -d postgres redis mailpit
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Optional local object storage:

```bash
docker compose --profile storage up -d minio
```

See [Local development](docs/deployment/LOCAL_DEVELOPMENT.md) for service URLs and troubleshooting.
Configure the identity providers and avatar bucket using [Supabase setup](docs/deployment/SUPABASE_SETUP.md) before testing authentication.

## Verification

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm db:validate
pnpm build
```

## Documentation

- [Architecture](docs/architecture/ARCHITECTURE.md)
- [Database design](docs/database/DATABASE_SCHEMA.md)
- [API contract](docs/api/API_DOCUMENTATION.md)
- [Mobile design](docs/mobile/MOBILE_DESIGN_SPEC.md)
- [Media provider and caching](docs/media/MEDIA_PROVIDER.md)
- [Tracking and library](docs/library/TRACKING_AND_LIBRARY.md)
- [Deterministic recommendations](docs/recommendations/RECOMMENDATIONS.md)
- [Social features and privacy policy](docs/social/SOCIAL_FEATURES.md)
- [Statistics and wraps](docs/insights/STATISTICS_AND_WRAPS.md)
- [Gamification](docs/gamification/GAMIFICATION.md)
- [Design system](docs/design/DESIGN_SYSTEM.md)
- [Implementation checklist](docs/IMPLEMENTATION_CHECKLIST.md)
- [Security policy](SECURITY.md)

Secrets must never be committed. Public Expo variables are visible in the mobile bundle and may contain only public configuration.
