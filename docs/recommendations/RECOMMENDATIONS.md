# Deterministic Recommendations

Phase 4 provides personalized movie and television recommendations without requiring an AI model. The same normalized inputs and model version always produce the same ordering and explanation reasons.

## Inputs and consent

Recommendation access requires `recommendationOptIn=true`. The service derives signals only from the authenticated member's application data:

- preferred and disliked genres;
- favorite titles;
- normalized ratings;
- completed watch history;
- preferred languages, decades, runtime range, and mainstream percentage;
- prior saved, selected, and dismissed recommendation feedback.

No profile is produced when recommendations are disabled. Credentials, review text, private notes, viewing locations, and social data are not ranking inputs in this phase.

## Taste profile

`GET /recommendations/taste-profile` returns the member's strongest genre affinities, explicit dislikes, configured language/decade/runtime preferences, signal counts, and confidence.

Confidence is a transparent data-coverage label:

- `LOW`: fewer than 5 behavioral signals;
- `MEDIUM`: 5–19 signals;
- `HIGH`: 20 or more signals.

The profile is computed from authoritative records on request and is not presented as a psychological assessment.

## Ranking model

Model version: `deterministic-v1`.

Candidate titles exclude anything already tracked, saved to a watchlist, dismissed during the previous 90 days, missing a poster, or containing an explicitly disliked genre. Up to 500 locally normalized catalog titles are scored and the best 100 are persisted for 24 hours.

The bounded 0–1 score combines:

| Signal                                      | Maximum contribution |
| ------------------------------------------- | -------------------: |
| Genre affinity                              |                 0.34 |
| Provider audience rating                    |                 0.18 |
| Popularity, scaled by mainstream preference |            0.06–0.18 |
| Preferred language                          |                 0.08 |
| Preferred decade                            |                 0.07 |
| Preferred runtime                           |                 0.06 |
| Saved/selected genre feedback               |                 0.11 |
| Hidden-gem adjustment                       |           up to 0.08 |
| Dismissed-genre feedback                    |                −0.20 |

Every result includes stable reason codes and a plain-language explanation. Examples include `GENRE_AFFINITY`, `HIGHLY_RATED`, `LANGUAGE_MATCH`, `RUNTIME_MATCH`, `POSITIVE_FEEDBACK`, and `HIDDEN_GEM`. Scores are recommendation-ranking values, not guarantees of enjoyment.

## Generation and pagination

`GET /recommendations` lazily creates a batch when no active recommendations remain. `POST /recommendations/refresh` explicitly replaces the active batch and is limited to five requests per member per hour. Cross-instance generation uses a one-second deterministic batch timestamp plus database uniqueness and `skipDuplicates` to prevent ordinary duplicate batches.

Results use opaque score/id keyset cursors. Optional filters support recommendation type and maximum runtime.

## Feedback loop

`POST /recommendations/{recommendationId}/feedback` accepts:

- `VIEWED`: records that the recommendation was displayed;
- `SELECTED`: records intentional interest;
- `SAVED`: atomically adds the title to the member's default watchlist;
- `DISMISSED`: removes the item from the active feed and applies a bounded negative genre signal to later batches.

Feedback is idempotent per recommendation and action. Ownership is derived from the verified identity; members cannot submit feedback to another member's recommendation.

## Operational limitations

The candidate pool is the normalized local media catalog, so recommendation breadth grows as discovery imports titles. Phase 4 does not use friend behavior, mood input, embeddings, collaborative filtering, or generated prose. Those recommendation types remain reserved for later reviewed implementations.
