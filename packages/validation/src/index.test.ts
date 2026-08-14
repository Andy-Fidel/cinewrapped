import { describe, expect, it } from 'vitest';

import {
  createCalendarEventSchema,
  createJournalEntrySchema,
  registerJournalAttachmentSchema,
  createCommentSchema,
  createClubPollSchema,
  createClubSchema,
  createFriendshipSchema,
  createWrapSchema,
  createWrapShareSchema,
  countryCodeSchema,
  normalizeUsername,
  recommendationFeedbackSchema,
  intelligentDiscoverySchema,
  identifySceneSchema,
  reviewAssistantSchema,
  saveSoundtrackSchema,
  sceneIdentificationFeedbackSchema,
  updatePrivacySchema,
  updatePreferencesSchema,
  updateReviewSchema,
  upsertRatingSchema,
  usernameSchema,
} from './index.js';

describe('shared validation', () => {
  it('bounds intelligent discovery and review-assistant inputs', () => {
    expect(
      intelligentDiscoverySchema.parse({ query: 'cozy family movie', countryCode: 'GH' }),
    ).toMatchObject({ language: 'en-US', countryCode: 'GH' });
    expect(() =>
      reviewAssistantSchema.parse({
        mediaId: 'not-a-uuid',
        notes: 'good',
        style: 'SHORT',
      }),
    ).toThrow();
  });
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

  it('normalizes journal drafts and rejects a foreign attachment path shape', () => {
    expect(
      createJournalEntrySchema.parse({
        mediaId: '4d54ff6c-3601-4fa5-8463-b2ad2e55da60',
        notes: 'A private memory.',
      }),
    ).toMatchObject({ status: 'DRAFT', companionNames: [], memorableQuotes: [] });
    expect(() =>
      registerJournalAttachmentSchema.parse({
        attachmentType: 'PERSONAL_PHOTO',
        storagePath: '../photo.jpg',
        fileName: 'photo.jpg',
        mimeType: 'image/jpeg',
        byteSize: 1_024,
      }),
    ).toThrow();
  });

  it('normalizes calendar plans and bounds reminders', () => {
    expect(
      createCalendarEventSchema.parse({
        title: 'Friday movie night',
        startsAt: '2026-08-14T20:00:00.000Z',
        timezone: 'Africa/Accra',
      }),
    ).toMatchObject({ eventType: 'WATCH_PLAN', durationMinutes: 120, reminderMinutes: [60] });
    expect(() =>
      createCalendarEventSchema.parse({
        title: 'Too many reminders',
        startsAt: '2026-08-14T20:00:00.000Z',
        timezone: 'UTC',
        reminderMinutes: [1, 2, 3, 4, 5, 6],
      }),
    ).toThrow();
  });

  it('accepts Apple soundtrack metadata and rejects untrusted provider links', () => {
    const soundtrack = {
      provider: 'APPLE_MUSIC' as const,
      providerAlbumId: '123456',
      title: 'Arrival (Original Motion Picture Soundtrack)',
      artistName: 'Jóhann Jóhannsson',
      artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/600x600bb.jpg',
      providerUrl: 'https://music.apple.com/us/album/arrival/123456',
      releaseDate: '2016-11-11',
      trackCount: 20,
    };
    expect(saveSoundtrackSchema.parse(soundtrack)).toEqual(soundtrack);
    expect(() =>
      saveSoundtrackSchema.parse({ ...soundtrack, providerUrl: 'https://example.com/listen' }),
    ).toThrow(/Apple Music/u);
  });

  it('requires explicit consent and a supported private scene image', () => {
    const input = {
      storagePath: '4d54ff6c-3601-4fa5-8463-b2ad2e55da60/7c45bfcf-6d87-4afd-b51d-ae4196438e31.jpg',
      signedImageUrl:
        'https://example.supabase.co/storage/v1/object/sign/scene-identification/image?token=1234567890123456',
      mimeType: 'image/jpeg' as const,
      byteSize: 2_048,
      privacyAcknowledged: true as const,
    };
    expect(identifySceneSchema.parse(input)).toMatchObject({
      language: 'en-US',
      countryCode: 'US',
      privacyAcknowledged: true,
    });
    expect(() => identifySceneSchema.parse({ ...input, privacyAcknowledged: false })).toThrow();
    expect(() => identifySceneSchema.parse({ ...input, mimeType: 'image/heic' })).toThrow();
  });

  it('requires a selected title when a scene match is confirmed', () => {
    expect(() => sceneIdentificationFeedbackSchema.parse({ action: 'CONFIRM' })).toThrow(
      /Choose the confirmed title/u,
    );
    expect(sceneIdentificationFeedbackSchema.parse({ action: 'REJECT' })).toEqual({
      action: 'REJECT',
    });
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
