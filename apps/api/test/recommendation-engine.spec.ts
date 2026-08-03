import { describe, expect, it } from 'vitest';

import {
  rankRecommendations,
  type RankingTaste,
} from '../src/recommendations/recommendation-engine.js';

const taste: RankingTaste = {
  genreWeights: { drama: 1, comedy: 0.3 },
  genreNames: { drama: 'Drama', comedy: 'Comedy' },
  dislikedGenreIds: ['horror'],
  preferredLanguages: ['en'],
  preferredDecades: [2020],
  runtimeMinimum: 80,
  runtimeMaximum: 150,
  mainstreamPreferencePercent: 40,
  savedGenreIds: ['drama'],
  dismissedGenreIds: [],
};

describe('deterministic recommendation engine', () => {
  it('ranks matching titles deterministically and explains the leading signal', () => {
    const result = rankRecommendations(taste, [
      {
        id: 'b',
        genreIds: ['comedy'],
        originalLanguage: 'fr',
        releaseYear: 2011,
        runtimeMinutes: 95,
        averageProviderRating: 6,
        providerPopularity: 80,
      },
      {
        id: 'a',
        genreIds: ['drama'],
        originalLanguage: 'en',
        releaseYear: 2024,
        runtimeMinutes: 120,
        averageProviderRating: 8,
        providerPopularity: 10,
      },
    ]);

    expect(result[0]).toMatchObject({
      mediaId: 'a',
      recommendationType: 'HIDDEN_GEM',
      reasonCodes: expect.arrayContaining(['GENRE_AFFINITY', 'POSITIVE_FEEDBACK']),
    });
    expect(result[0]?.explanation).toContain('Drama');
  });

  it('excludes explicitly disliked genres', () => {
    expect(
      rankRecommendations(taste, [
        {
          id: 'horror-title',
          genreIds: ['horror', 'drama'],
          originalLanguage: 'en',
          releaseYear: 2024,
          runtimeMinutes: 100,
          averageProviderRating: 9,
          providerPopularity: 100,
        },
      ]),
    ).toEqual([]);
  });

  it('applies bounded negative feedback without permanently excluding the genre', () => {
    const candidate = {
      id: 'drama-title',
      genreIds: ['drama'],
      originalLanguage: 'en',
      releaseYear: 2024,
      runtimeMinutes: 100,
      averageProviderRating: 8,
      providerPopularity: 100,
    };
    const baseline = rankRecommendations(taste, [candidate])[0];
    const adjusted = rankRecommendations(
      { ...taste, savedGenreIds: [], dismissedGenreIds: ['drama'] },
      [candidate],
    )[0];

    expect(adjusted).toBeDefined();
    expect(adjusted?.score).toBeLessThan(baseline?.score ?? 0);
  });
});
