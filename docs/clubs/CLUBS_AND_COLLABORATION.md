# Clubs and Collaborative Features

Phase 8 adds a member-governed space for recurring film communities. PostgreSQL is authoritative for membership, roles, votes, and event times; the client never submits actor identity or aggregate vote totals.

## Membership and privacy

Public clubs appear in discovery. Private clubs are returned only to active members and otherwise use the same not-found response as a missing club. Open public clubs activate membership immediately, while public approval clubs remain pending until a manager accepts them. Private and invite-only clubs require an invitation and reject self-join requests.

Each club has exactly one active owner. Owners, administrators, and moderators manage membership, polls, announcements, and watch events. Active members can create discussions, suggest titles, and vote. Removed and pending members cannot mutate club content.

## Collaboration model

- Discussions preserve author, spoiler metadata, optimistic version, and soft deletion fields.
- Polls contain two to ten unique options, optional normalized media references, single/multiple-choice behavior, and an optional close time.
- Poll votes reference both poll and option; the service verifies the option belongs to the poll before writing.
- Watchlist suggestions reference normalized CineWrapped media. One signed vote per member is stored as `-1` or `1`; repeating the same vote removes it.
- Watch events store an absolute start instant plus its display timezone, optional media, description, and location URL.

## Current boundaries

Phase 8 uses pull-to-refresh/query invalidation rather than WebSockets. Recurring events, invitation delivery, cover-image uploads, threaded post comments, item archival/final-selection controls, and collaborative list ordering remain measured follow-ups. No fake real-time or provider integration is presented as complete.

## Security notes

Every route starts from the verified Supabase subject, resolves the CineWrapped user, and checks current membership. Parent-child identifiers are checked together to prevent cross-club poll, option, watchlist, or membership mutations. The owner record cannot be removed through the membership endpoint.
