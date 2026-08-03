# Gamification

Phase 7 turns logged activity into transparent progress without inventing viewing behavior or exposing private data.

## Product behavior

- Achievements are deterministic definitions with a metric and integer target. Progress is synchronized when the dashboard is requested; unlocks are idempotent.
- Challenges have fixed UTC windows, metrics, targets, and point awards. A member must join while a challenge is active before progress is tracked.
- Streaks count distinct local calendar dates in the member's IANA timezone. The current streak remains active when the latest viewing is today or yesterday; the longest streak spans the full retained history.
- Leaderboards rank points, viewing count, or current streak. The API includes the viewer, public participants, and accepted friends whose visibility is `FRIENDS`; bilateral blocks are excluded.
- The movie passport derives country, language, and decade exploration from normalized media metadata attached to logged viewings. Passport and leaderboard visibility default to `PRIVATE`.

## API

| Method  | Route                                  | Purpose                                                               |
| ------- | -------------------------------------- | --------------------------------------------------------------------- |
| `GET`   | `/api/v1/gamification`                 | Dashboard with points, achievements, challenges, streak, and passport |
| `POST`  | `/api/v1/challenges/:challengeId/join` | Join an active challenge                                              |
| `GET`   | `/api/v1/leaderboards?metric=POINTS`   | Privacy-filtered ranking                                              |
| `GET`   | `/api/v1/passport`                     | Current member's movie passport                                       |
| `PATCH` | `/api/v1/users/me/privacy`             | Set leaderboard and passport visibility                               |

## Operational notes

Seeded definitions are safe to rerun because stable codes are upserted. New achievement definitions should use a supported metric (`VIEWINGS`, `UNIQUE_TITLES`, `MINUTES_WATCHED`, `REWATCHES`, `RATINGS`, `REVIEWS`, `STREAK_DAYS`, or `COUNTRIES`) and a positive integer target. Challenge changes should preserve historical rows rather than repurposing an existing code.

The projection currently caps a member history at 10,000 viewings and a leaderboard sample at 50,000 viewings. These explicit limits prevent unbounded request-time work; a future scale phase can replace them with event-driven counters.
