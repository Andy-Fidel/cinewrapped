# Statistics and Wraps

Phase 6 turns a member's private viewing history into deterministic statistics and reviewable weekly, monthly, and yearly stories. Every displayed value is computed from CineWrapped records; no model invents observations or personality claims.

## Statistics model

Statistics periods are half-open intervals: `periodStart` is inclusive and `periodEnd` is exclusive. Both are ISO timestamps, and the requested IANA timezone controls calendar-day streaks, monthly buckets, and generated wrap boundaries.

The summary includes:

- viewing and unique-title counts;
- duration from the logged viewing duration, falling back to normalized title runtime;
- movie/TV counts, rewatches, and active days;
- longest consecutive local-calendar-day streak;
- normalized average rating for titles viewed during the period; and
- top titles and genres with transparent occurrence counts.

Taste statistics report observed genre, original-language, release-decade, and runtime-bucket distributions. Labels such as “top” mean only the largest count in the selected sample. The API returns the sample size with every taste response.

Statistics requests are limited to five years and 10,000 viewing records. Requests above the row boundary fail rather than returning silently truncated totals.

## Wrap generation

`POST /wraps` accepts `WEEKLY`, `MONTHLY`, or `YEARLY`, an IANA timezone, and an input version. Without explicit boundaries, the server derives the current local calendar week (Monday–Sunday), month, or year. Supplying boundaries is supported for deterministic regeneration and testing.

The unique key is member, type, period, and input version. Repeating a completed request returns the existing wrap. New and failed requests are regenerated synchronously in Phase 6 and finish as `COMPLETED` or `FAILED`.

Each completed wrap stores versioned JSON snapshots:

- `statisticsJson`: the exact calculated summary;
- `highlightsJson`: the factual headline, top title, top genre, and total hours; and
- `storySlidesJson`: renderer-neutral slide definitions.

Persisting snapshots keeps an archived wrap stable when later activity or scoring rules change.

## Story renderer and share cards

Slides contain explicit content roles (`INTRO`, `TOTALS`, `FAVORITE_GENRE`, `TOP_TITLE`, `RATINGS`, and `OUTRO`), semantic accents, optional media artwork, and accessible text. The mobile viewer provides visible Previous and Next controls and announces the current slide position; it does not require hidden tap gestures.

Sharing requires `privacyAcknowledged: true`. The API produces a short-lived share-card payload with the selected slide's title, subtitle, primary statistic, accent, deep link, web fallback, and expiry metadata. The mobile client renders the card in-app and passes its factual text to the operating-system share sheet. Phase 6 does not expose an unauthenticated public wrap viewer or store third-party recipients.

## API routes

| Capability               | Route                             |
| ------------------------ | --------------------------------- |
| Summary                  | `GET /statistics/summary`         |
| Monthly trend            | `GET /statistics/monthly`         |
| Taste distribution       | `GET /statistics/taste`           |
| Archive and generation   | `GET/POST /wraps`                 |
| Wrap detail and deletion | `GET/DELETE /wraps/{wrapId}`      |
| Share card               | `POST /wraps/{wrapId}/share-link` |

All statistics and archive routes derive ownership from the verified authentication subject. Foreign wrap identifiers return the same not-found response as missing records.

## Current boundaries

- Generation runs inside the API request. The worker/outbox transition remains a later scaling step.
- Duration can be underestimated when neither viewing duration nor normalized runtime is available.
- Episode-level completion is not yet converted into standalone runtime totals; this phase aggregates `Viewing` records.
- Public share-link resolution, server-rendered raster images, scheduled wrap generation, comparisons, and collaborative insights remain later work.
