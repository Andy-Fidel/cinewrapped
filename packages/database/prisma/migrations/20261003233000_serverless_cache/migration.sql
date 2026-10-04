CREATE SCHEMA IF NOT EXISTS cinewrapped_internal;
REVOKE ALL ON SCHEMA cinewrapped_internal FROM PUBLIC;

CREATE TABLE cinewrapped_internal.rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL CHECK (count > 0),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX rate_limits_expiry_idx ON cinewrapped_internal.rate_limits (expires_at);

CREATE TABLE cinewrapped_internal.cache_entries (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX cache_entries_expiry_idx ON cinewrapped_internal.cache_entries (expires_at);
REVOKE ALL ON ALL TABLES IN SCHEMA cinewrapped_internal FROM PUBLIC;
