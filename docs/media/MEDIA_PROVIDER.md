# Media Provider and Caching

Phase 2 implements TMDB behind the `MediaProvider` interface. Mobile clients use only CineWrapped UUIDs and authenticated API routes; the TMDB bearer token never enters an Expo bundle.

## Supported operations

- Multi-type movie and television search
- Daily and weekly trending titles
- Movie and television details
- Cast and selected key crew
- Official or fallback YouTube trailer links
- Television season summaries
- Country-specific streaming availability grouped as subscription, free, ad-supported, rental, or purchase

Provider payloads are validated with Zod before normalization. Invalid payloads fail with a typed upstream-provider error and are not written to PostgreSQL.

## Cache policy

| Data                       |  Redis TTL | PostgreSQL behavior                                      |
| -------------------------- | ---------: | -------------------------------------------------------- |
| Search                     |  5 minutes | Normalized summaries are upserted                        |
| Trending                   | 10 minutes | Normalized summaries are upserted                        |
| Details, credits, trailers |    6 hours | Essential metadata, people, credits, and seasons persist |
| Streaming availability     |     1 hour | Country/provider/monetization rows expire after one hour |

Redis is a fail-open performance layer. Read or write failures do not replace a valid provider response with an application error. TMDB errors and schema failures still fail closed so corrupted or fabricated data cannot enter production paths.

## Refresh and integrity rules

- Search and trending summaries do not mark a title as fully synchronized.
- Opening a detail page fetches full metadata if details are missing or older than six hours.
- Credits are replaced as one normalized detail snapshot.
- Seasons use `(mediaId, seasonNumber)` upserts. Synchronization never deletes seasons because future episode-watch records depend on them.
- Availability is replaced only for the requested country and receives an explicit expiry.
- Provider attribution remains visible in the mobile detail experience.

TMDB availability is informational and may lag provider changes. CineWrapped does not claim that a provider listing guarantees playback, price, or regional entitlement.
