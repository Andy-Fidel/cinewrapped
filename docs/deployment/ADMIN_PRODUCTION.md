# Admin production runbook

The CineWrapped admin portal is a separate Next.js service backed by the production API. It does not contain mock records or direct database access.

## Security model

- Administrators sign in through Supabase Auth with email and password.
- A verified TOTP factor is mandatory. The API rejects every admin request unless the JWT assurance level is `aal2`.
- Roles come from active `user_role_assignments` records. The browser cannot select or elevate a role.
- The API applies least-privilege permissions for `SUPER_ADMINISTRATOR`, `CONTENT_MODERATOR`, `COMMUNITY_MODERATOR`, `SUPPORT_AGENT`, and `ANALYST`.
- Status, role, feature-flag, and report-resolution changes require a reason and create an `audit_logs` record.
- Suspending or banning an account revokes its registered application sessions. The global API guard rejects suspended, banned, and deleted accounts.
- The admin service sends CSP, HSTS, frame-denial, referrer, content-type, permissions, and cross-origin isolation headers. Search indexing is disabled.

The production surface includes the dashboard, reports queue, user status and role management, feature flags, and audit logs. Routes for unfinished mock-only tools redirect to the dashboard and are absent from navigation.

## Initial administrator

The first administrator must already have a confirmed CineWrapped account. After the database migration and before testing the portal, open the API Render shell and run:

```sh
ALLOW_INITIAL_ADMIN_GRANT=true \
ADMIN_EMAIL='the-owner@example.com' \
DATABASE_URL="$DATABASE_URL" \
./node_modules/.bin/tsx packages/database/prisma/grant-initial-admin.ts
```

The script looks up one active, non-deleted account by exact email, grants `SUPER_ADMINISTRATOR` idempotently, and records the bootstrap in the audit ledger. It fails closed unless `ALLOW_INITIAL_ADMIN_GRANT=true` is supplied. Remove the shell variables when the command finishes. Later role changes must use the portal.

On first admin sign-in, scan the displayed QR code with an authenticator application and enter the six-digit code. Store the authenticator recovery material according to the operator access policy.

## Render service

`render.admin.yaml` defines `cinewrapped-admin` as a Frankfurt `0.5c-512mb` Docker web service with automatic deploys disabled and `/api/health` as its health check. This is a second paid Render service and adds **$7/month** at the prepared plan, separate from the existing $7/month API.

Set these build-time public values:

- `NEXT_PUBLIC_API_BASE_URL=https://cinewrapped-api.onrender.com/api/v1`
- `NEXT_PUBLIC_SUPABASE_URL=https://qptbvrfrelkqoesaulyp.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the project's publishable/anon key

Do not place `SUPABASE_SECRET_KEY`, database credentials, or provider secrets on the admin service. Because the three `NEXT_PUBLIC_*` values are compiled into the browser bundle, changing them requires a rebuild.

## Release order

1. Back up the production database and confirm the additional Render charge.
2. Apply the database migration with the API pre-deploy command.
3. Deploy the API change and verify `/api/v1/health/live` and `/api/v1/health/ready`.
4. Run the guarded initial-admin command for the approved existing account.
5. Create the service from `render.admin.yaml`, enter the two Supabase public values, and deploy the reviewed commit.
6. Verify `/api/health`, security headers, password sign-in, first-time TOTP enrollment, a second sign-in with TOTP, role-based navigation, one audited low-impact feature-flag change, and sign-out.
7. Confirm API logs contain no authentication, authorization, database, or CORS errors. Keep automatic deploys disabled until the release process is stable.

If the admin deployment fails, roll the admin service back to its previous image or suspend it. If the API fails after deployment, roll back the API while leaving the additive user-status columns in place; the prior API ignores them. Do not reverse the database migration by dropping the enum or columns until retained status data has been reviewed and exported.
