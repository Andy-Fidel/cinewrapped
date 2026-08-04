# Advanced grounded intelligence

Phase 9 adds natural-language discovery, conversational refinement, review drafting, mood-based discovery, and enhanced Movie DNA. The implementation deliberately keeps factual ranking separate from generated presentation.

## Provider boundary

`AiProvider` is the typed generation port. The current `GroundedAiProvider` is a development-safe adapter: it transforms only member-supplied review notes and known title facts, reports `source=LOCAL_GROUNDED`, and never claims to be a remote model. A future hosted model can implement the same port after privacy, cost, moderation, and evaluation review.

Catalog results continue to come from TMDB. The local interpreter converts supported wording into explicit TMDB discover filters for media type, mood-linked genre, language, release year, runtime, minimum rating, popularity, region, and streaming provider. The response returns the complete interpretation so the member can see what was applied.

Ending sentiment and detailed content sensitivities are not reliably present in the provider contract. They are returned as unsupported constraints and are never silently treated as satisfied.

## Routes

- `POST /ai/discovery` — interprets one natural-language request and returns grounded catalog results.
- `POST /ai/recommendations/conversation` — carries up to twelve bounded turns and refines the current request.
- `POST /ai/reviews/assist` — produces a style-specific draft for a title already in the member's activity.
- `GET /ai/movie-dna` — returns evidence-counted traits and an explainable label.

All routes require a verified session and recommendation opt-in. Mutating assistant routes are rate limited by member and feature. Inputs are length-bounded, conversation history is not persisted, and credentials or private account fields are not sent to the provider adapter.

## Review approval

Assistant output is never published by the endpoint. Mobile inserts the draft into the editable review field, displays its source, and requires an explicit approval checkbox before the existing review mutation can publish it. Editing an assisted draft clears the approval.

## Movie DNA

Movie DNA uses completed or rewatching history, known media metadata, watch counts, and member-added emotional tags. Each visible trait includes an evidence count. Low-sample profiles use `Developing Taste`; unsupported or missing signals are omitted. Version `grounded-dna-v1` makes the interpretation contract auditable.

## Current limitations

- The local adapter does not paraphrase with a hosted language model.
- Conversation context is request-scoped and held only by the client.
- Provider watch availability can change and must be verified on the title page.
- Provider-popularity thresholds are transparent heuristics, not value judgments.
