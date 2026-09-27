create type "AccountErasureStatus" as enum ('PENDING', 'PROCESSING', 'FAILED', 'COMPLETED');

create table "account_erasure_requests" (
  "id" uuid not null,
  "userId" uuid not null,
  "authSubject" varchar(255),
  "authSubjectHash" char(64) not null,
  "status" "AccountErasureStatus" not null default 'PENDING',
  "attemptCount" integer not null default 0,
  "lastErrorCode" varchar(100),
  "requestedAt" timestamptz(3) not null default current_timestamp,
  "startedAt" timestamptz(3),
  "completedAt" timestamptz(3),
  "updatedAt" timestamptz(3) not null,
  constraint "account_erasure_requests_pkey" primary key ("id")
);

create unique index "account_erasure_requests_userId_key"
  on "account_erasure_requests"("userId");
create unique index "account_erasure_requests_authSubject_key"
  on "account_erasure_requests"("authSubject");
create unique index "account_erasure_requests_authSubjectHash_key"
  on "account_erasure_requests"("authSubjectHash");
create index "account_erasure_requests_status_requestedAt_idx"
  on "account_erasure_requests"("status", "requestedAt");

alter table "account_erasure_requests" enable row level security;
revoke all privileges on table "account_erasure_requests" from anon, authenticated;
