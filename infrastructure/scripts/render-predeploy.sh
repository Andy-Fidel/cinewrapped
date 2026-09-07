#!/bin/sh
set -eu

# Run once per release, before Render swaps traffic to the new container.
# A session/direct database URL can be supplied when the app uses a transaction pooler.
DATABASE_URL="${DIRECT_DATABASE_URL:-$DATABASE_URL}" \
  ./packages/database/node_modules/.bin/prisma migrate deploy --schema packages/database/prisma/schema.prisma
./node_modules/.bin/tsx packages/database/prisma/seed.ts
