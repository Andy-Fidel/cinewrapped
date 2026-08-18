CREATE TABLE "search_history" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "query" VARCHAR(120) NOT NULL,
    "normalizedQuery" VARCHAR(120) NOT NULL,
    "filtersJson" JSONB NOT NULL DEFAULT '{}',
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "searchCount" INTEGER NOT NULL DEFAULT 1,
    "lastSearchedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "search_history_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "search_history_result_count_check" CHECK ("resultCount" >= 0),
    CONSTRAINT "search_history_search_count_check" CHECK ("searchCount" >= 1)
);

CREATE UNIQUE INDEX "search_history_userId_normalizedQuery_key"
ON "search_history"("userId", "normalizedQuery");

CREATE INDEX "search_history_userId_lastSearchedAt_id_idx"
ON "search_history"("userId", "lastSearchedAt" DESC, "id" DESC);

CREATE INDEX "search_history_lastSearchedAt_normalizedQuery_idx"
ON "search_history"("lastSearchedAt" DESC, "normalizedQuery");

ALTER TABLE "search_history"
ADD CONSTRAINT "search_history_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
