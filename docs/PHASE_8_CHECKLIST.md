# Phase 8 Checklist — Clubs and Collaborative Features

- [x] Public/private club discovery and details
- [x] Open, approval, and invite-only membership policies
- [x] Owner/admin/moderator/member roles
- [x] Pending-member approval and safe removal
- [x] Discussions and manager announcements
- [x] Poll creation, closing semantics, and member voting
- [x] Collaborative watchlist suggestions and reversible group votes
- [x] Scheduled timezone-aware watch events
- [x] Mobile club discovery, creation, details, and interaction flows
- [x] Migration constraints, shared contracts, validation, and tests

## Verification gate

- Prisma schema formats, validates, generates, and migrates without destructive changes.
- Private club existence is concealed from non-members.
- All write paths require active membership; management paths require an elevated role.
- Poll options and watchlist items are verified as belonging to their parent club resource.
- Full workspace checks and the production dependency audit pass before Phase 9 begins.
