create type "UserStatus" as enum ('ACTIVE', 'WARNED', 'SUSPENDED', 'BANNED');

alter table "users"
  add column "status" "UserStatus" not null default 'ACTIVE',
  add column "statusReason" varchar(500),
  add column "statusUpdatedAt" timestamptz(3);

create index "users_status_updatedAt_idx"
  on "users"("status", "updatedAt" desc);
