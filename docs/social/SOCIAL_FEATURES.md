# Social Features

Phase 5 adds the first production social loop: member discovery, public/friend profiles, directional follows, mutual friendships, a visibility-filtered activity feed, comments, reactions, native media sharing, blocks, and mutes.

## Relationship policy

- A follow is directional and idempotent. Members cannot follow themselves.
- A friendship has one canonical database pair (`userAId < userBId`) plus explicit requester and addressee roles. Only the addressee can accept or decline a pending request.
- A mute is private and directional. It removes the muted member from the muter's feed without notifying or hiding the muter from the muted member.
- A block is bilateral for discovery and visibility. It removes follows in both directions, marks the canonical friendship blocked, and prevents either member from finding or interacting with the other.
- Blocked and privacy-ineligible resources return the same not-found response. This avoids leaking whether a hidden profile or target exists.

## Feed projection

`GET /feed` lazily projects newly eligible viewings, ratings, published reviews, and custom-list creation into `FeedActivity`. Projection creation honors the actor's per-activity sharing toggles and configured default visibility. Before serving a feed, existing projections are retracted, restored, or reclassified to match the actor's current sharing settings. Reads also re-evaluate audience membership, friendship state, blocks, and the viewer's mutes.

The viewer sees:

- their own eligible activity;
- public activity from followed members; and
- public or friend-visible activity from accepted friends.

The feed uses an opaque `(occurredAt, id)` cursor. Projection uniqueness prevents duplicates when a page is refreshed or rebuilt.

## Discussions and reactions

Comments and reactions currently support published reviews and feed activities. Comment reactions are also supported. Every write resolves the target and applies the same block and visibility policy used for reads. Top-level comment lists include reply counts; the API accepts one-level reply references even though the initial mobile surface displays top-level comments only.

Supported reactions are `LIKE`, `LOVE`, `LAUGH`, `WOW`, and `SAD`. Each reaction kind is idempotent per member and target.

## Sharing

`POST /media/{mediaId}/shares` validates the title and returns a `cinewrapped://media/{id}` deep link plus a web fallback. The mobile client hands the receipt to the native OS share sheet. Phase 5 does not deliver in-app direct messages or persist external recipients.

## API routes

| Capability             | Routes                                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| Discovery and profiles | `GET /users`, `GET /users/{username}`                                                           |
| Follows                | `PUT/DELETE /follows/{userId}`                                                                  |
| Friendships            | `GET/POST /friendships`, `PATCH/DELETE /friendships/{friendshipId}`                             |
| Feed                   | `GET /feed`                                                                                     |
| Comments               | `GET/POST /social/comments/{parentType}/{parentId}`, `DELETE /social/comments/item/{commentId}` |
| Reactions              | `PUT/DELETE /reactions/{targetType}/{targetId}/{reactionType}`                                  |
| Sharing                | `POST /media/{mediaId}/shares`                                                                  |
| Safety                 | `PUT/DELETE /blocks/{userId}`, `PUT/DELETE /mutes/{userId}`                                     |

## Current boundaries

- The activity projection is synchronized during feed reads; the planned outbox/worker projection remains a later scaling step.
- Member profile activity/review subpages, follower lists, compatibility, direct shares, comment editing, reply pagination, moderation reports, and real-time delivery remain later phases.
- Social mutations require online connectivity. Durable offline mutation queues are still deferred.
