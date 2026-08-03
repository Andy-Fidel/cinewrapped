import { describe, expect, it } from 'vitest';

import {
  createCommentSchema,
  createClubPollSchema,
  createClubSchema,
  createFriendshipSchema,
  createWrapSchema,
  createWrapShareSchema,
  countryCodeSchema,
  normalizeUsername,
  recommendationFeedbackSchema,
  updatePrivacySchema,
  updatePreferencesSchema,
  updateReviewSchema,
  upsertRatingSchema,
  usernameSchema,
} from './index.js';

describe('shared validation', () => {
  it('normalizes valid usernames', () => {
    expect(normalizeUsername('  Film_Friend  ')).toBe('film_friend');
  });

  it('rejects lowercase country codes', () => {
    expect(() => countryCodeSchema.parse('gh')).toThrow();
  });

  it('rejects reserved usernames', () => {
    expect(() => usernameSchema.parse('support')).toThrow(/reserved/u);
  });

  it('requires at least five favorites when the collection is replaced', () => {
    expect(() => updatePreferencesSchema.parse({ favoriteMediaIds: [] })).toThrow();
  });

  it('rejects overlapping preferred and disliked genres', () => {
    const id = '4d54ff6c-3601-4fa5-8463-b2ad2e55da60';
    expect(() =>
      updatePreferencesSchema.parse({ preferredGenreIds: [id], dislikedGenreIds: [id] }),
    ).toThrow(/both preferred and disliked/u);
  });

  it('rejects ratings whose value exceeds the selected scale', () => {
    expect(() => upsertRatingSchema.parse({ ratingValue: 7, ratingScale: 5 })).toThrow(
      /cannot exceed/u,
    );
  });

  it('requires optimistic versioning when a review is edited', () => {
    expect(() => updateReviewSchema.parse({ body: 'Updated review' })).toThrow();
  });

  it('rejects unknown recommendation feedback actions', () => {
    expect(() => recommendationFeedbackSchema.parse({ feedbackType: 'HIDE_FOREVER' })).toThrow();
  });

  it('requires a valid member ID for friend requests', () => {
    expect(() => createFriendshipSchema.parse({ addresseeUserId: 'not-a-uuid' })).toThrow();
  });

  it('limits social comments and accepts explicit spoiler metadata', () => {
    expect(createCommentSchema.parse({ body: 'Great ending.', containsSpoilers: true })).toEqual({
      body: 'Great ending.',
      containsSpoilers: true,
    });
    expect(() => createCommentSchema.parse({ body: 'x'.repeat(5001) })).toThrow();
  });

  it('requires paired wrap boundaries and supported wrap types', () => {
    expect(() =>
      createWrapSchema.parse({
        type: 'MONTHLY',
        timezone: 'Africa/Accra',
        periodStart: '2026-08-01T00:00:00.000Z',
      }),
    ).toThrow(/supplied together/u);
    expect(() => createWrapSchema.parse({ type: 'CUSTOM', timezone: 'UTC' })).toThrow();
  });

  it('requires explicit privacy acknowledgement for wrap sharing', () => {
    expect(() =>
      createWrapShareSchema.parse({ expiresInMinutes: 60, privacyAcknowledged: false }),
    ).toThrow();
  });

  it('accepts explicit leaderboard and passport visibility controls', () => {
    expect(
      updatePrivacySchema.parse({
        leaderboardVisibility: 'FRIENDS',
        passportVisibility: 'PRIVATE',
      }),
    ).toEqual({ leaderboardVisibility: 'FRIENDS', passportVisibility: 'PRIVATE' });
    expect(() => updatePrivacySchema.parse({ leaderboardVisibility: 'FOLLOWERS' })).toThrow();
  });

  it('normalizes club slugs and requires unique poll options', () => {
    expect(
      createClubSchema.parse({
        name: 'Accra Film Club',
        slug: 'ACCRA-FILM-CLUB',
        description: 'A club for local film fans.',
      }).slug,
    ).toBe('accra-film-club');
    expect(() =>
      createClubPollSchema.parse({
        question: 'What should we watch?',
        options: [{ label: 'Arrival' }, { label: 'arrival' }],
      }),
    ).toThrow(/unique/u);
  });
});
