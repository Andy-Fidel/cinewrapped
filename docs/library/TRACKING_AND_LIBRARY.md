# Tracking and Library

Phase 3 implements authenticated personal tracking for movies and television. PostgreSQL is authoritative; every query derives ownership from the verified Supabase subject rather than a client-provided user identifier.

## Domain behavior

- `WatchHistory` stores the member's current status and aggregate progress for one title.
- `Viewing` stores individual viewing occurrences so rewatches, statistics, and future wraps are not lost when current status changes.
- `EpisodeWatchHistory` stores per-episode progress and updates aggregate series progress.
- `Watchlist` supports one protected default list plus additional private or shareable lists.
- `Rating` supports five-star, ten-point, and like/dislike representations through a normalized 0–100 score.
- `Review` supports drafts, publishing, spoiler labels, visibility, version conflicts, and recoverable soft deletion.

All mutable records use integer versions. Existing records require `expectedVersion`; stale writes return `409` without overwriting another device's change. Viewing events use a stable `clientOperationId` UUID so a retried request does not create a duplicate viewing.

## Implemented API

| Method             | Route                                                      | Purpose                                                              |
| ------------------ | ---------------------------------------------------------- | -------------------------------------------------------------------- |
| `GET`              | `/library`                                                 | Cursor-paginated personal library with status and media-type filters |
| `GET`              | `/library/media/{mediaId}`                                 | Composed status, watchlist, rating, and latest-review state          |
| `PUT`              | `/library/media/{mediaId}/status`                          | Create or version-update current status and progress                 |
| `DELETE`           | `/library/media/{mediaId}`                                 | Remove current history and its viewing occurrences                   |
| `POST`             | `/library/media/{mediaId}/viewings`                        | Idempotently log a viewing or rewatch                                |
| `GET`              | `/library/media/{mediaId}/seasons/{seasonNumber}/episodes` | Sync and return episode metadata plus personal progress              |
| `PUT`              | `/library/episodes/{episodeId}/progress`                   | Create or version-update episode progress                            |
| `GET/POST`         | `/watchlists`                                              | List or create personal watchlists                                   |
| `GET/PATCH/DELETE` | `/watchlists/{watchlistId}`                                | Read, version-update, or soft-delete an owned list                   |
| `POST`             | `/watchlists/{watchlistId}/items`                          | Add or update a list item                                            |
| `DELETE`           | `/watchlists/{watchlistId}/items/{mediaId}`                | Remove a title from a list                                           |
| `POST`             | `/watchlist/items`                                         | Quick-add a title to the protected default watchlist                 |
| `PUT/DELETE`       | `/media/{mediaId}/rating`                                  | Version-upsert or soft-delete a personal rating                      |
| `POST`             | `/media/{mediaId}/reviews`                                 | Create a draft or published review                                   |
| `PATCH/DELETE`     | `/reviews/{reviewId}`                                      | Version-update or soft-delete an owned review                        |

## Episode synchronization

Season summaries arrive with media details in Phase 2. Phase 3 fetches a TMDB season only when its episode list is first opened, validates the response with Zod, caches it in Redis for six hours, and upserts episodes by stable provider identifier. Existing episode history is never removed during metadata refresh.

Series progress uses the provider-reported season episode counts as its denominator and caps aggregate progress at 100%. A series becomes completed only after every reported episode is complete.

## Mobile experience

- The Library tab filters current history by status and links back to title details.
- Title details expose status, default-watchlist, viewing, rating, and review controls.
- Season rows open a virtualized episode list with accessible completion checkboxes.
- TanStack Query invalidates tracking, library, and watchlist projections after successful mutations.

The mobile client currently loads the first 50 library entries. The API exposes opaque keyset cursors for later infinite scrolling and returns version conflicts safely; a dedicated offline SQLite mutation outbox remains a later implementation item from the architecture plan.
