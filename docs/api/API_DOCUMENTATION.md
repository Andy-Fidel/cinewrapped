# CineWrapped API Contract

**Status:** Task 3 baseline  
**API version:** `v1`  
**Protocol:** HTTPS REST with JSON  
**Machine-readable contract:** [`openapi.yaml`](./openapi.yaml)

## 1. Scope

This contract covers the MVP journeys defined in the master build prompt: account bootstrap and session management, onboarding, media discovery, watch tracking, ratings and reviews, recommendations, follows and friendships, social activity, comments and reactions, statistics, wraps, notifications, privacy, uploads, export, and deletion.

Supabase Auth owns credential registration, login, email verification, password reset, Google/Apple OAuth exchange, refresh rotation, and identity-session issuance. CineWrapped accepts the resulting bearer token, maps its immutable subject to an internal user UUID, and owns all product authorization and application data.

Task 3 defines the contract only. Controllers, generated clients, persistence adapters, and OpenAPI runtime setup are created during Tasks 5–6.

## 2. Conventions

### 2.1 Base URLs and media types

| Environment | Base URL pattern                                 |
| ----------- | ------------------------------------------------ |
| Local       | `http://localhost:4000/api/v1`                   |
| Staging     | `https://api.staging.cinewrapped.example/api/v1` |
| Production  | `https://api.cinewrapped.example/api/v1`         |

Requests and responses use `application/json; charset=utf-8`. Timestamps are RFC 3339 UTC values. Calendar-only values use `YYYY-MM-DD`. Country codes use uppercase ISO 3166-1 alpha-2. Language tags use BCP 47. IDs are UUIDs except provider IDs, client operation IDs, idempotency keys, and usernames.

### 2.2 Authentication

Protected operations require:

```http
Authorization: Bearer <supabase-access-token>
```

The API verifies signature, issuer, audience, algorithm, and expiry, then derives the actor from the token subject. A body or path `userId` never establishes ownership.

Anonymous access is limited to health checks and public media discovery. Public profile and review reads may be anonymously enabled later, but the MVP contract requires authentication so block, spoiler, market, age, and privacy policies can be evaluated consistently.

### 2.3 Request correlation

Clients may send `X-Request-ID` using a UUID or ULID. Invalid or missing values are replaced. Every response includes the accepted `X-Request-ID`, and the same value appears in the body metadata.

### 2.4 Idempotency

Important mutations accept:

```http
Idempotency-Key: <16-128 printable ASCII characters>
```

The key is scoped to authenticated user, method, route template, and request hash. Reuse with the same request returns the stored response. Reuse with a different request returns `409 IDEMPOTENCY_KEY_REUSED`. Records are retained for at least 24 hours.

Required for:

- Account export and deletion requests
- Onboarding completion
- Creating viewing and rewatch events
- Creating watchlists, reviews, friendships, comments, shares, and wraps
- Registering uploads and push devices

Offline-capable additive mutations also include a stable `clientOperationId` UUID. This survives beyond the HTTP idempotency retention window.

### 2.5 Optimistic concurrency

Mutable owned resources expose an integer `version`. Update requests include `expectedVersion`. A stale write returns `409 VERSION_CONFLICT` with the safe current representation in `error.details.current` when policy allows. Review drafts may also return `REVIEW_MERGE_REQUIRED` so the client can retain both versions.

### 2.6 Response envelope

Success:

```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "01J..."
  }
}
```

Collection success:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "requestId": "01J...",
    "page": {
      "nextCursor": "opaque-or-null",
      "hasMore": false,
      "limit": 20
    }
  }
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "WATCH_HISTORY_NOT_FOUND",
    "message": "The requested watch-history entry was not found.",
    "details": null,
    "requestId": "01J..."
  }
}
```

User-facing messages are safe and stable enough for fallback display. Clients branch on `code`, never message text.

### 2.7 Pagination, filtering, and sorting

Cursor pagination is used for member-facing collections:

| Parameter | Rules                                                                                  |
| --------- | -------------------------------------------------------------------------------------- |
| `limit`   | Default 20; minimum 1; maximum 50                                                      |
| `cursor`  | Opaque base64url token bound to route, actor, filter hash, sort, and final sort values |
| `sort`    | Route-specific allow-list; unsupported values return `INVALID_SORT`                    |

Cursors are not database IDs and must not be constructed by clients. Changing filters invalidates a cursor. Invalid, expired, or mismatched cursors return `400 INVALID_CURSOR`.

Admin table pagination will use `page` and `pageSize` in the later admin contract. It is not part of this MVP member API.

### 2.8 Sparse expansion

The API uses purpose-built representations rather than arbitrary field selection. A bounded `include` parameter is allowed only where listed, for example `include=credits,streamingAvailability`. Unknown expansions return `INVALID_INCLUDE`. This prevents accidental data exposure and unbounded ORM graphs.

### 2.9 Rate-limit headers

Responses may include:

```text
RateLimit-Limit
RateLimit-Remaining
RateLimit-Reset
Retry-After
```

Limits are action-specific. Authentication and identity abuse controls also apply at Supabase.

## 3. Endpoint catalog

Legend: **A** = authenticated member, **O** = resource owner, **R** = relationship/visibility policy, **I** = idempotency key required.

### 3.1 System and identity bridge

| Method   | Path                           | Access | Request                      | Response            |
| -------- | ------------------------------ | -----: | ---------------------------- | ------------------- |
| `GET`    | `/health/live`                 | Public | —                            | `HealthResponse`    |
| `GET`    | `/health/ready`                | Public | —                            | `ReadinessResponse` |
| `POST`   | `/auth/bootstrap`              |   A, I | `BootstrapRequest`           | `BootstrapResponse` |
| `GET`    | `/auth/sessions`               |      A | Cursor query                 | `SessionSummary[]`  |
| `DELETE` | `/auth/sessions/{sessionId}`   |      A | —                            | `NoContent`         |
| `POST`   | `/auth/sessions/revoke-others` |   A, I | `RevokeOtherSessionsRequest` | `RevocationSummary` |

`/auth/bootstrap` idempotently provisions the application user and private defaults after the first verified identity session. It does not create credentials.

### 3.2 Current member, onboarding, privacy, and account lifecycle

| Method   | Path                            |               Access | Request                     | Response          |
| -------- | ------------------------------- | -------------------: | --------------------------- | ----------------- |
| `GET`    | `/users/me`                     |                 A, O | —                           | `CurrentUser`     |
| `PATCH`  | `/users/me`                     |                 A, O | `UpdateProfileRequest`      | `CurrentUser`     |
| `GET`    | `/users/me/preferences`         |                 A, O | —                           | `UserPreferences` |
| `PATCH`  | `/users/me/preferences`         |                 A, O | `UpdatePreferencesRequest`  | `UserPreferences` |
| `GET`    | `/users/me/privacy`             |                 A, O | —                           | `PrivacySettings` |
| `PATCH`  | `/users/me/privacy`             |                 A, O | `UpdatePrivacyRequest`      | `PrivacySettings` |
| `GET`    | `/users/me/onboarding`          |                 A, O | —                           | `OnboardingState` |
| `PATCH`  | `/users/me/onboarding`          |                 A, O | `UpdateOnboardingRequest`   | `OnboardingState` |
| `POST`   | `/users/me/onboarding/complete` |              A, O, I | `CompleteOnboardingRequest` | `CurrentUser`     |
| `POST`   | `/users/me/avatar-upload`       |              A, O, I | `CreateAvatarUploadRequest` | `UploadIntent`    |
| `POST`   | `/users/me/export`              | A, O, I, recent auth | `CreateExportRequest`       | `ExportJob`       |
| `GET`    | `/users/me/export/{exportId}`   |                 A, O | —                           | `ExportJob`       |
| `DELETE` | `/users/me`                     | A, O, I, recent auth | `DeleteAccountRequest`      | `DeletionRequest` |

Onboarding remains incomplete until username/display name, at least five genre preferences, at least five favorite titles, streaming-service choices, runtime/language/decade preferences, and required consent acknowledgements validate atomically.

### 3.3 User discovery and profiles

| Method | Path                              | Access | Request                  | Response               |
| ------ | --------------------------------- | -----: | ------------------------ | ---------------------- |
| `GET`  | `/users`                          |      A | `query`, cursor, `limit` | `UserSummary[]`        |
| `GET`  | `/users/{username}`               |   A, R | —                        | `PublicProfile`        |
| `GET`  | `/users/{username}/activity`      |   A, R | cursor, `limit`, filters | `FeedActivity[]`       |
| `GET`  | `/users/{username}/reviews`       |   A, R | cursor, `limit`          | `ReviewSummary[]`      |
| `GET`  | `/users/{username}/followers`     |   A, R | cursor, `limit`          | `UserSummary[]`        |
| `GET`  | `/users/{username}/following`     |   A, R | cursor, `limit`          | `UserSummary[]`        |
| `GET`  | `/users/{username}/compatibility` |   A, R | —                        | `CompatibilitySummary` |

Compatibility is an approximate entertainment-preference measure and the response includes a non-scientific disclaimer.

### 3.4 Reference data and media discovery

| Method | Path                                                               | Access | Request                 | Response                |
| ------ | ------------------------------------------------------------------ | -----: | ----------------------- | ----------------------- |
| `GET`  | `/genres`                                                          |      A | `mediaType`, `language` | `Genre[]`               |
| `GET`  | `/streaming-providers`                                             |      A | `countryCode`           | `StreamingProvider[]`   |
| `GET`  | `/search/media`                                                    |      A | `MediaSearchQuery`      | `MediaSummary[]`        |
| `GET`  | `/media/trending`                                                  |      A | `TrendingQuery`         | `MediaSummary[]`        |
| `GET`  | `/media/{mediaId}`                                                 |      A | `include`               | `MediaDetails`          |
| `GET`  | `/media/{mediaId}/credits`                                         |      A | cursor, `limit`, `type` | `Credit[]`              |
| `GET`  | `/media/{mediaId}/streaming-availability`                          |      A | `countryCode`           | `StreamingAvailability` |
| `GET`  | `/media/{mediaId}/similar`                                         |      A | cursor, `limit`         | `MediaSummary[]`        |
| `GET`  | `/media/{mediaId}/seasons/{seasonNumber}`                          |      A | —                       | `SeasonDetails`         |
| `GET`  | `/media/{mediaId}/seasons/{seasonNumber}/episodes/{episodeNumber}` |      A | —                       | `EpisodeDetails`        |

Search requires a trimmed query of 2–100 characters, is debounced by the client, and is rate-limited by the API. Provider IDs and secrets never appear in privileged configuration form; external media IDs may be returned as descriptive metadata.

Phase 2 applies a fail-open Redis limit of 30 media searches per authenticated identity per minute. Cache outages do not block discovery, while a healthy Redis deployment returns the standard `RATE_LIMITED` envelope after the limit.

Phase 3's shipped route mapping is recorded in [`../library/TRACKING_AND_LIBRARY.md`](../library/TRACKING_AND_LIBRARY.md). The tables below retain the broader MVP contract; routes not listed in the Phase 3 implementation document remain planned rather than silently implied as deployed.

### 3.5 Watch history and episode progress

| Method   | Path                                            |  Access | Request                                | Response              |
| -------- | ----------------------------------------------- | ------: | -------------------------------------- | --------------------- |
| `GET`    | `/watch-history`                                |    A, O | cursor, `limit`, `status`, `mediaType` | `WatchHistoryEntry[]` |
| `GET`    | `/watch-history/{mediaId}`                      |    A, O | —                                      | `WatchHistoryEntry`   |
| `PUT`    | `/watch-history/{mediaId}`                      |    A, O | `UpsertWatchHistoryRequest`            | `WatchHistoryEntry`   |
| `DELETE` | `/watch-history/{mediaId}`                      |    A, O | `expectedVersion`                      | `NoContent`           |
| `GET`    | `/watch-history/{mediaId}/viewings`             |    A, O | cursor, `limit`                        | `Viewing[]`           |
| `POST`   | `/watch-history/{mediaId}/viewings`             | A, O, I | `CreateViewingRequest`                 | `Viewing`             |
| `PATCH`  | `/viewings/{viewingId}`                         |    A, O | `UpdateViewingRequest`                 | `Viewing`             |
| `DELETE` | `/viewings/{viewingId}`                         |    A, O | `expectedVersion`                      | `NoContent`           |
| `GET`    | `/watch-history/{mediaId}/episodes`             |    A, O | cursor, `limit`, `seasonNumber`        | `EpisodeProgress[]`   |
| `PUT`    | `/watch-history/{mediaId}/episodes/{episodeId}` |    A, O | `UpsertEpisodeProgressRequest`         | `EpisodeProgress`     |

`PUT /watch-history/{mediaId}` updates current state only. A completion that represents an actual viewing uses `POST /viewings` so retries cannot create duplicate rewatches. The service updates watch count and current status in the same transaction.

### 3.6 Watchlists

| Method   | Path                                       |  Access | Request                      | Response             |
| -------- | ------------------------------------------ | ------: | ---------------------------- | -------------------- |
| `GET`    | `/watchlists`                              |    A, O | cursor, `limit`              | `WatchlistSummary[]` |
| `POST`   | `/watchlists`                              | A, O, I | `CreateWatchlistRequest`     | `Watchlist`          |
| `GET`    | `/watchlists/{watchlistId}`                |    A, R | cursor, `limit`              | `Watchlist`          |
| `PATCH`  | `/watchlists/{watchlistId}`                |    A, O | `UpdateWatchlistRequest`     | `Watchlist`          |
| `DELETE` | `/watchlists/{watchlistId}`                |    A, O | `expectedVersion`            | `NoContent`          |
| `POST`   | `/watchlists/{watchlistId}/items`          | A, R, I | `AddWatchlistItemRequest`    | `WatchlistItem`      |
| `PATCH`  | `/watchlists/{watchlistId}/items/{itemId}` |    A, R | `UpdateWatchlistItemRequest` | `WatchlistItem`      |
| `DELETE` | `/watchlists/{watchlistId}/items/{itemId}` |    A, R | —                            | `NoContent`          |

Collaborative authorization is reserved in policy but collaborative voting is post-MVP. Default watchlists cannot be deleted; they may be cleared or renamed only within policy.

### 3.7 Ratings and reviews

| Method   | Path                          |  Access | Request                             | Response          |
| -------- | ----------------------------- | ------: | ----------------------------------- | ----------------- |
| `GET`    | `/media/{mediaId}/rating`     |    A, O | —                                   | `Rating` or `204` |
| `PUT`    | `/media/{mediaId}/rating`     |    A, O | `UpsertRatingRequest`               | `Rating`          |
| `DELETE` | `/media/{mediaId}/rating`     |    A, O | `expectedVersion`                   | `NoContent`       |
| `GET`    | `/media/{mediaId}/reviews`    |    A, R | cursor, `limit`, `sort`, `spoilers` | `ReviewSummary[]` |
| `POST`   | `/media/{mediaId}/reviews`    | A, O, I | `CreateReviewRequest`               | `Review`          |
| `GET`    | `/reviews/{reviewId}`         |    A, R | —                                   | `Review`          |
| `PATCH`  | `/reviews/{reviewId}`         |    A, O | `UpdateReviewRequest`               | `Review`          |
| `POST`   | `/reviews/{reviewId}/publish` | A, O, I | `PublishReviewRequest`              | `Review`          |
| `DELETE` | `/reviews/{reviewId}`         |    A, O | `expectedVersion`                   | `NoContent`       |

The API stores numeric ratings normalized to 0–100. A member's configured display system does not change historical meaning. Spoiler bodies are returned with `bodyHidden=true` and omitted from summaries until the viewer explicitly requests allowed spoiler content.

### 3.8 Recommendations

| Method | Path                                           |  Access | Request                                  | Response           |
| ------ | ---------------------------------------------- | ------: | ---------------------------------------- | ------------------ |
| `GET`  | `/recommendations`                             |    A, O | cursor, `limit`, `type`, context filters | `Recommendation[]` |
| `POST` | `/recommendations/{recommendationId}/feedback` | A, O, I | `RecommendationFeedbackRequest`          | `Recommendation`   |

Feedback types are `VIEWED`, `SAVED`, `DISMISSED`, and `SELECTED`. `SAVED` also adds the media to the default watchlist in the same transaction when absent. Explanations and reason codes are always returned with the model/configuration version.

Phase 4 additionally ships `GET /recommendations/taste-profile` and rate-limited `POST /recommendations/refresh`. The scoring inputs, fixed weights, confidence thresholds, exclusions, and current limitations are documented in [`../recommendations/RECOMMENDATIONS.md`](../recommendations/RECOMMENDATIONS.md).

### 3.9 Follows, friendships, shares, and feed

| Method   | Path                          | Access | Request                    | Response         |
| -------- | ----------------------------- | -----: | -------------------------- | ---------------- |
| `PUT`    | `/follows/{userId}`           |   A, R | —                          | `FollowState`    |
| `DELETE` | `/follows/{userId}`           |   A, R | —                          | `NoContent`      |
| `GET`    | `/friendships`                |   A, O | optional `status`          | `Friendship[]`   |
| `POST`   | `/friendships`                |   A, I | `CreateFriendshipRequest`  | `Friendship`     |
| `PATCH`  | `/friendships/{friendshipId}` |   A, R | `RespondFriendshipRequest` | `Friendship`     |
| `DELETE` | `/friendships/{friendshipId}` |   A, R | —                          | `NoContent`      |
| `GET`    | `/feed`                       |   A, R | cursor, `limit`            | `FeedActivity[]` |
| `POST`   | `/media/{mediaId}/shares`     |   A, R | —                          | `ShareReceipt`   |
| `PUT`    | `/blocks/{userId}`            |      A | optional reason            | `BlockState`     |
| `DELETE` | `/blocks/{userId}`            |      A | —                          | `NoContent`      |
| `PUT`    | `/mutes/{userId}`             |      A | —                          | `MuteState`      |
| `DELETE` | `/mutes/{userId}`             |      A | —                          | `NoContent`      |

Blocking atomically terminates active follow/friendship relationships and suppresses feed, search, comments, reactions, shares, and notifications in both directions.

### 3.10 Comments and reactions

| Method   | Path                                                |  Access | Request                | Response          |
| -------- | --------------------------------------------------- | ------: | ---------------------- | ----------------- |
| `GET`    | `/social/comments/{parentType}/{parentId}`          |    A, R | —                      | `Comment[]`       |
| `POST`   | `/social/comments/{parentType}/{parentId}`          | A, R, I | `CreateCommentRequest` | `Comment`         |
| `DELETE` | `/social/comments/item/{commentId}`                 |     A,O | —                      | `NoContent`       |
| `PUT`    | `/reactions/{targetType}/{targetId}/{reactionType}` |    A, R | —                      | `ReactionSummary` |
| `DELETE` | `/reactions/{targetType}/{targetId}/{reactionType}` |    A, O | —                      | `ReactionSummary` |

The `parentType` segment is constrained to `REVIEW` and `FEED_ACTIVITY`. The service resolves the typed target and applies block and visibility policy before every read or write.

Phase 5 implementation details and current boundaries are documented in [`../social/SOCIAL_FEATURES.md`](../social/SOCIAL_FEATURES.md).

### 3.11 Statistics and wraps

| Method   | Path                         |    Access | Request                                | Response              |
| -------- | ---------------------------- | --------: | -------------------------------------- | --------------------- |
| `GET`    | `/statistics/summary`        |      A, O | `periodStart`, `periodEnd`, `timezone` | `StatisticsSummary`   |
| `GET`    | `/statistics/monthly`        |      A, O | `year`, `timezone`                     | `MonthlyWatchCount[]` |
| `GET`    | `/statistics/taste`          |      A, O | period query                           | `TasteStatistics`     |
| `GET`    | `/wraps`                     |      A, O | cursor, `limit`, `type`, `status`      | `WrapSummary[]`       |
| `POST`   | `/wraps`                     |   A, O, I | `CreateWrapRequest`                    | `Wrap`                |
| `GET`    | `/wraps/{wrapId}`            | A, O or R | —                                      | `Wrap`                |
| `POST`   | `/wraps/{wrapId}/share-link` |   A, O, I | `CreateWrapShareRequest`               | `ShareLink`           |
| `DELETE` | `/wraps/{wrapId}`            |      A, O | —                                      | `NoContent`           |

Phase 6 generates wraps synchronously and returns `201 Created`; duplicate requests for the same user/type/period/input version return the existing completed wrap. Statistics and slides are data-driven, snapshotted, and versioned. Sharing returns a factual card payload after explicit privacy acknowledgement; public unauthenticated wrap resolution is not yet exposed.

Calculation rules, timezone semantics, renderer content, limits, and current boundaries are documented in [`../insights/STATISTICS_AND_WRAPS.md`](../insights/STATISTICS_AND_WRAPS.md).

### 3.12 Notifications and devices

| Method   | Path                              |  Access | Request                               | Response         |
| -------- | --------------------------------- | ------: | ------------------------------------- | ---------------- |
| `GET`    | `/notifications`                  |    A, O | cursor, `limit`, `unreadOnly`, `type` | `Notification[]` |
| `GET`    | `/notifications/unread-count`     |    A, O | —                                     | `UnreadCount`    |
| `PATCH`  | `/notifications/{notificationId}` |    A, O | `UpdateNotificationRequest`           | `Notification`   |
| `POST`   | `/notifications/read-all`         | A, O, I | `ReadAllNotificationsRequest`         | `UnreadCount`    |
| `POST`   | `/devices`                        | A, O, I | `RegisterDeviceRequest`               | `Device`         |
| `DELETE` | `/devices/{deviceId}`             |    A, O | —                                     | `NoContent`      |

Push tokens are encrypted server-side and never returned after registration. Responses expose only a token fingerprint for troubleshooting.

## 4. Request DTO catalog

All objects reject unknown properties unless explicitly documented. Strings are trimmed before validation; blank optional strings normalize to `null`.

### 4.1 Identity and profile DTOs

| DTO                         | Fields and validation                                                                                                                                                                                                                                     |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BootstrapRequest`          | `timezone` BCP 47 time-zone name; `locale` BCP 47; optional `installationId` 1–255                                                                                                                                                                        |
| `UpdateProfileRequest`      | `expectedVersion`; optional `username` 3–30 normalized pattern; `displayName` 1–80; `bio` max 500; `countryCode`; `preferredLanguage`; `timezone`; `dateOfBirth`; `profileVisibility`                                                                     |
| `UpdatePreferencesRequest`  | `preferredGenreIds`, `dislikedGenreIds` unique UUID arrays; languages/countries/decades; runtime min/max; rating system; content types; spoiler mode; mature-content flag; theme; streaming country; autoplay; reduce motion; mainstream percentage 0–100 |
| `UpdatePrivacyRequest`      | Per-surface visibility values and activity-sharing booleans; omitted fields unchanged                                                                                                                                                                     |
| `UpdateOnboardingRequest`   | `step` plus the step-specific validated data; cannot mark completion                                                                                                                                                                                      |
| `CompleteOnboardingRequest` | `acceptedPrivacyVersion`, `acceptedTermsVersion`, `expectedProfileVersion`                                                                                                                                                                                |
| `CreateAvatarUploadRequest` | `fileName`, allow-listed `mimeType`, `sizeBytes` up to configured maximum, SHA-256 checksum                                                                                                                                                               |
| `CreateExportRequest`       | `format` = `JSON` or `CSV_ZIP`; requested data categories                                                                                                                                                                                                 |
| `DeleteAccountRequest`      | literal confirmation, optional reason code, `revokeImmediately=true`                                                                                                                                                                                      |

### 4.2 Discovery DTOs

| DTO                | Fields and validation                                                                                                                                                                     |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MediaSearchQuery` | `query` 2–100; optional media type, genre UUIDs, year/decade, runtime range, languages, countries, provider UUIDs, provider rating minimum, friends-watched, unwatched-only, cursor/limit |
| `TrendingQuery`    | `mediaType`, `window` = `DAY` or `WEEK`, country/language, cursor/limit                                                                                                                   |

### 4.3 Tracking and library DTOs

| DTO                            | Fields and validation                                                                                                                                                       |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `UpsertWatchHistoryRequest`    | `status`; optional progress percent/seconds, start/completion/last-watch timestamps; `expectedVersion` when updating                                                        |
| `CreateViewingRequest`         | `clientOperationId`; watch/completion timestamps; duration; platform/location; notes max 5,000; companion user IDs; `isRewatch`; source restricted to client-allowed values |
| `UpdateViewingRequest`         | `expectedVersion` and editable viewing fields; cannot alter owner/media                                                                                                     |
| `UpsertEpisodeProgressRequest` | `clientOperationId`; completed; progress seconds; watched time; expected version                                                                                            |
| `CreateWatchlistRequest`       | name 1–120; description max 1,000; visibility; collaboration flag; optional cover URL                                                                                       |
| `UpdateWatchlistRequest`       | `expectedVersion` plus mutable create fields; cannot set a second default list                                                                                              |
| `AddWatchlistItemRequest`      | `mediaId`, optional position and note max 500                                                                                                                               |
| `UpdateWatchlistItemRequest`   | optional position/note plus watchlist `expectedVersion`                                                                                                                     |
| `UpsertRatingRequest`          | `mode`; either numeric `ratingValue` with scale 5/10 or boolean `liked`; unique emotional tags; expected version                                                            |
| `CreateReviewRequest`          | optional title max 160; body 1–20,000; spoiler flag; visibility; status must be `DRAFT`                                                                                     |
| `UpdateReviewRequest`          | `expectedVersion`; editable title/body/spoiler/visibility; status changes use action endpoint                                                                               |
| `PublishReviewRequest`         | `expectedVersion`, acknowledgement when spoilers are marked, optional `publishedAt` bounded to current time                                                                 |

### 4.4 Social, insight, and delivery DTOs

| DTO                             | Fields and validation                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------ |
| `RecommendationFeedbackRequest` | `feedbackType`; optional destination watchlist for save; recommendation ID comes from path |
| `CreateFriendshipRequest`       | `addresseeUserId`; optional message max 280; cannot target self or blocked user            |
| `RespondFriendshipRequest`      | `action` = `ACCEPT` or `DECLINE`; only pending addressee may respond                       |
| `ShareMediaRequest`             | non-empty unique recipient user IDs, optional message max 500                              |
| `BlockUserRequest`              | optional reason code; free-form private note is not accepted                               |
| `CreateCommentRequest`          | body 1–5,000; spoiler flag; optional parent comment UUID                                   |
| `UpdateCommentRequest`          | body and spoiler flag; expected update timestamp or version when introduced                |
| `CreateWrapRequest`             | type; explicit period only for `CUSTOM`; timezone; input version defaults to current       |
| `CreateWrapShareRequest`        | expiry minutes within allow-list; approved slide/card; explicit visibility acknowledgment  |
| `UpdateNotificationRequest`     | `read` boolean only                                                                        |
| `ReadAllNotificationsRequest`   | optional `through` timestamp to avoid racing newer notifications                           |
| `RegisterDeviceRequest`         | installation ID; platform; Expo push token; locale/timezone; token never echoed            |

## 5. Response DTO catalog

### 5.1 Representation rules

- Public/profile representations never expose email, auth subject, birth date, device data, precise viewing location, export state, or private preferences.
- Media summaries contain card-level fields; details contain overview, trailers, genres, dates, runtime, status, and approved expansions.
- Spoiler-protected summaries omit body content and set `bodyHidden=true`.
- Deleted content returns a tombstone representation only where thread continuity requires it.
- `viewerState` fields are computed for the authenticated actor and are never cached across users.
- Counters are projections and include `asOf` when eventual consistency may be visible.

### 5.2 Principal responses

| DTO                 | Core fields                                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `CurrentUser`       | UUID, username/display name, avatar, bio, country/language/timezone, profile visibility, onboarding and consent state, version, timestamps |
| `PublicProfile`     | Public identity, biography, permitted statistics/favorites, relationship state, viewer permissions                                         |
| `UserPreferences`   | Taste, display, streaming, notification, accessibility, and recommendation preferences                                                     |
| `PrivacySettings`   | Visibility and activity-sharing controls                                                                                                   |
| `OnboardingState`   | Current step, completed steps, validation gaps, completion state                                                                           |
| `MediaSummary`      | UUID, media type, title, year, poster, genres, runtime, provider rating, viewer state                                                      |
| `MediaDetails`      | Summary plus overview, original title/language, countries, release date/status, backdrop/trailer, optional credits and availability        |
| `WatchHistoryEntry` | Media summary, status/progress/count, timestamps, version                                                                                  |
| `Viewing`           | UUID, media reference, occurrence details, companion summaries allowed to viewer, version/timestamps                                       |
| `EpisodeProgress`   | Episode summary, completed/progress/count, version/timestamps                                                                              |
| `Watchlist`         | Owner summary, metadata, visibility, version, paginated items, viewer permissions                                                          |
| `Rating`            | Display input, normalized 0–100 score, tags, version/timestamps                                                                            |
| `Review`            | Author/media, content or spoiler cover, visibility/status, counts, viewer reaction/permissions, version/timestamps                         |
| `Recommendation`    | Media summary, score, type, explanation, reason codes, model version, expiry, viewer feedback state                                        |
| `Friendship`        | UUID, requester/addressee summaries, status and response timestamps, viewer actions                                                        |
| `FeedActivity`      | Actor, typed entity summary, media, occurred time, viewer permissions/reactions/comments                                                   |
| `StatisticsSummary` | Period, titles, episodes, minutes/hours, average rating, rewatches, as-of timestamp                                                        |
| `TasteStatistics`   | Genres, actors, directors, languages, countries, runtime/decade distributions with sample sizes                                            |
| `Wrap`              | Type/period/timezone/status, structured statistics/highlights/slides, failure-safe state, share eligibility                                |
| `Notification`      | Type, safe actor/entity summary, title/body/deep link, read/created time                                                                   |

## 6. Error catalog

### 6.1 HTTP mapping

|  HTTP | Meaning                                                              |
| ----: | -------------------------------------------------------------------- |
| `400` | Malformed query, cursor, transition, or unsupported option           |
| `401` | Missing, invalid, expired, or revoked identity token                 |
| `403` | Authenticated but not permitted; includes recent-auth requirements   |
| `404` | Resource absent or intentionally concealed by privacy/block policy   |
| `409` | Version, uniqueness, state-machine, idempotency, or offline conflict |
| `410` | Export/share artifact expired or resource permanently erased         |
| `413` | Upload metadata exceeds configured maximum                           |
| `415` | Unsupported media type                                               |
| `422` | Structurally valid JSON fails field/domain validation                |
| `429` | Rate limit exceeded                                                  |
| `502` | Required provider returned an invalid response                       |
| `503` | Required dependency unavailable; retry may succeed                   |

### 6.2 Stable codes

| Category              | Codes                                                                                                                                                                                                       |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Request               | `INVALID_REQUEST`, `VALIDATION_FAILED`, `INVALID_CURSOR`, `INVALID_SORT`, `INVALID_INCLUDE`, `IDEMPOTENCY_KEY_REQUIRED`, `IDEMPOTENCY_KEY_REUSED`, `VERSION_CONFLICT`                                       |
| Authentication        | `AUTHENTICATION_REQUIRED`, `TOKEN_INVALID`, `TOKEN_EXPIRED`, `SESSION_REVOKED`, `RECENT_AUTH_REQUIRED`, `EMAIL_NOT_VERIFIED`                                                                                |
| User/profile          | `USER_NOT_FOUND`, `USERNAME_TAKEN`, `USERNAME_RESERVED`, `ONBOARDING_INCOMPLETE`, `ONBOARDING_REQUIREMENTS_NOT_MET`, `ACCOUNT_DELETION_PENDING`                                                             |
| Media/provider        | `MEDIA_NOT_FOUND`, `SEASON_NOT_FOUND`, `EPISODE_NOT_FOUND`, `MEDIA_PROVIDER_UNAVAILABLE`, `MEDIA_PROVIDER_RATE_LIMITED`, `STREAMING_MARKET_UNSUPPORTED`                                                     |
| Tracking              | `WATCH_HISTORY_NOT_FOUND`, `INVALID_WATCH_STATUS_TRANSITION`, `VIEWING_NOT_FOUND`, `VIEWING_OPERATION_DUPLICATE`, `EPISODE_PROGRESS_NOT_FOUND`, `OFFLINE_CONFLICT`                                          |
| Watchlists            | `WATCHLIST_NOT_FOUND`, `WATCHLIST_ITEM_NOT_FOUND`, `WATCHLIST_ITEM_EXISTS`, `DEFAULT_WATCHLIST_REQUIRED`, `WATCHLIST_POSITION_CONFLICT`                                                                     |
| Ratings/reviews       | `RATING_NOT_FOUND`, `RATING_MODE_INVALID`, `REVIEW_NOT_FOUND`, `REVIEW_ALREADY_PUBLISHED`, `REVIEW_MERGE_REQUIRED`, `SPOILER_ACKNOWLEDGEMENT_REQUIRED`                                                      |
| Social/safety         | `FOLLOW_NOT_FOUND`, `FRIENDSHIP_NOT_FOUND`, `FRIENDSHIP_EXISTS`, `FRIENDSHIP_INVALID_STATE`, `SELF_RELATIONSHIP_FORBIDDEN`, `USER_BLOCKED`, `TARGET_NOT_VISIBLE`, `COMMENT_NOT_FOUND`, `REACTION_NOT_FOUND` |
| Recommendations/wraps | `RECOMMENDATIONS_DISABLED`, `RECOMMENDATION_NOT_FOUND`, `RECOMMENDATION_EXPIRED`, `WRAP_NOT_FOUND`, `WRAP_ALREADY_EXISTS`, `WRAP_PERIOD_INVALID`, `WRAP_NOT_READY`, `WRAP_SHARE_FORBIDDEN`                  |
| Notification/device   | `NOTIFICATION_NOT_FOUND`, `DEVICE_NOT_FOUND`, `PUSH_TOKEN_INVALID`                                                                                                                                          |
| Upload/export         | `UPLOAD_TYPE_UNSUPPORTED`, `UPLOAD_TOO_LARGE`, `UPLOAD_CHECKSUM_INVALID`, `EXPORT_NOT_FOUND`, `EXPORT_EXPIRED`                                                                                              |
| Platform              | `RATE_LIMITED`, `DEPENDENCY_UNAVAILABLE`, `INTERNAL_ERROR`                                                                                                                                                  |

Validation errors use `details.fields`, keyed by JSON Pointer, with safe machine-readable reason codes. Authorization failures do not reveal whether a concealed private resource exists.

## 7. Authorization rules

### 7.1 Policy inputs

Every object decision evaluates:

- Verified actor UUID and administrative scopes
- Action and resource ownership
- Resource and parent visibility
- Follow/friendship state
- Block and mute state
- Club membership when later enabled
- Age/adult-content preferences
- Spoiler preference and explicit reveal action
- Account/deletion status

### 7.2 Authorization matrix

| Resource/action                     |                                    Owner |                               Accepted friend/follower |                   Other member |                                      Moderator/admin |
| ----------------------------------- | ---------------------------------------: | -----------------------------------------------------: | -----------------------------: | ---------------------------------------------------: |
| Private profile/preferences/privacy |                                     Full |                                                   None |                           None |        No routine access; audited support scope only |
| Public profile                      |                                     Full |                                                   Read |            Read unless blocked |                           Read within assigned scope |
| Watch history                       |                                     Full |                      Read only when visibility permits |          Read only when public |     Moderation does not imply private history access |
| Watchlist                           |                                     Full | Read when permitted; mutate only approved collaborator |               Public read only |                     Moderate public content, audited |
| Rating/review                       |                       Full own lifecycle |              Read by visibility; interact if permitted |           Public read/interact |                     Hide/remove within role, audited |
| Viewing notes/location              |                                     Full |                    None unless explicitly shared field |                           None |                        No ordinary moderation access |
| Recommendation/taste statistics     |                                     Full |                                                   None |                           None |                                   No ordinary access |
| Feed activity                       |                       Retract own source |                           Read by visibility and graph |                    Public only |                           Moderate public projection |
| Friendship                          | Requester can cancel; addressee responds |                                      Participants read |                           None |                    Safety intervention only, audited |
| Comment/reaction                    |                          Own edit/delete |                        Create/read when target visible | Create/read when target public |                        Moderate within role, audited |
| Wrap                                |                     Full; explicit share |            Read only via allowed visibility/share link |                           Same |                  Moderate public share artifact only |
| Notification/device/export          |                            Full own only |                                                   None |                           None | Operational metadata only under scoped audited tools |
| Blocks                              |                            Full own only |                  Target cannot enumerate blocker state |                           None |              Safety investigation under scoped audit |

### 7.3 Object concealment

When revealing existence would leak private or blocked content, the API returns `404` rather than `403`. Ownership failures on a known current-user resource may return `403`. This distinction is part of policy tests, not controller discretion.

## 8. OpenAPI configuration

The machine-readable contract uses OpenAPI 3.1.0 with:

- One server per environment.
- `bearerAuth` HTTP security scheme with JWT bearer format.
- Reusable request ID, idempotency, cursor, and limit parameters.
- Reusable success, collection, error, and no-content responses.
- Stable `operationId` values used for typed client generation.
- Tags matching backend module boundaries.
- JSON Schema 2020-12 semantics through OpenAPI 3.1.
- Examples that contain no secrets or real user data.

Generation policy:

1. `openapi.yaml` is the reviewed design contract during Tasks 3–5.
2. NestJS decorators and Zod DTO schemas become the runtime source in implementation.
3. CI generates the runtime document and compares normalized paths, operations, schemas, security, and response codes with this baseline.
4. Breaking changes require a new API version or an explicitly approved compatibility window.
5. The TypeScript API client is generated from the validated contract and wrapped by feature-specific query hooks.

## 9. Contract security requirements

- OpenAPI examples and logs never include live bearer tokens, emails, push tokens, private notes, or provider keys.
- Uploads use short-lived, checksum-bound intents and allow-listed MIME types.
- Deep links use an application allow-list and cannot carry credentials.
- Enumeration-resistant `404` behavior applies to private and blocked objects.
- Public response schemas are separate from internal database entities.
- Errors never return stack traces, SQL details, provider secrets, or raw provider bodies.
- Mutation limits are stricter for comments, requests, shares, uploads, export, and deletion.
- Admin endpoints will live under `/admin` with MFA and separate scope definitions; they are not silently included in member endpoints.

## 10. Task 3 acceptance checklist

- [x] Versioned endpoint list
- [x] Request DTO definitions and validation rules
- [x] Response DTO definitions and privacy rules
- [x] Stable error catalog and HTTP mapping
- [x] Cursor pagination format
- [x] Object-level authorization matrix
- [x] OpenAPI 3.1 configuration and machine-readable contract

## 11. Phase 8 club routes

All routes require a verified Supabase bearer session. Private club reads return `CLUB_NOT_FOUND` unless the viewer is an active member. Mutations derive the actor from the token and never accept a user ID.

| Method | Route                                           | Authorization                   | Purpose                                                 |
| ------ | ----------------------------------------------- | ------------------------------- | ------------------------------------------------------- |
| GET    | `/clubs?scope=DISCOVER                          | MINE&q=&limit=`                 | Signed-in member                                        | Discover visible clubs or list memberships |
| POST   | `/clubs`                                        | Signed-in member                | Create a club and atomic owner membership               |
| GET    | `/clubs/{clubId}`                               | Public or active private member | Read members, discussions, polls, watchlist, and events |
| POST   | `/clubs/{clubId}/join`                          | Policy-dependent                | Join immediately or create a pending request            |
| PATCH  | `/clubs/{clubId}/members/{membershipId}`        | Owner/admin/moderator           | Approve or remove a non-owner membership                |
| POST   | `/clubs/{clubId}/posts`                         | Active member                   | Create a discussion; announcements require a manager    |
| POST   | `/clubs/{clubId}/polls`                         | Owner/admin/moderator           | Create a bounded poll                                   |
| PUT    | `/clubs/{clubId}/polls/{pollId}/vote`           | Active member                   | Toggle a validated option vote                          |
| POST   | `/clubs/{clubId}/watchlist/items`               | Active member                   | Suggest a normalized media title                        |
| PUT    | `/clubs/{clubId}/watchlist/items/{itemId}/vote` | Active member                   | Set or remove an up/down vote                           |
| POST   | `/clubs/{clubId}/events`                        | Owner/admin/moderator           | Schedule a timezone-labeled watch event                 |

Important errors include `CLUB_NOT_FOUND`, `CLUB_MEMBERSHIP_REQUIRED`, `CLUB_MANAGER_REQUIRED`, `CLUB_INVITE_REQUIRED`, `CLUB_POLL_CLOSED`, `CLUB_POLL_OPTION_INVALID`, and `CLUB_WATCHLIST_DUPLICATE`.
