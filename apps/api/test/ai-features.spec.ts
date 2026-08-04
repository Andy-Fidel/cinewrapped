import { describe, expect, it } from 'vitest';

import { interpretDiscoveryQuery } from '../src/ai/discovery-interpreter.js';
import { GroundedAiProvider } from '../src/ai/grounded-ai.provider.js';

describe('advanced grounded intelligence', () => {
  it('turns natural-language constraints into auditable catalog filters', () => {
    const result = interpretDiscoveryQuery(
      'Funny Korean movies under 100 minutes on Netflix after 2015',
    );

    expect(result).toMatchObject({
      mediaType: 'MOVIE',
      moods: ['FUNNY'],
      genres: ['Comedy'],
      originalLanguage: 'ko',
      runtimeMaximum: 100,
      releaseYearMinimum: 2016,
      streamingServices: ['Netflix'],
      unsupportedConstraints: [],
    });
  });

  it('calls out constraints the provider cannot verify instead of pretending to honor them', () => {
    const result = interpretDiscoveryQuery('Romantic films that do not have sad endings');

    expect(result.endingPreference).toBe('NOT_SAD');
    expect(result.unsupportedConstraints).toContain('Ending preference is not provider-verified');
  });

  it('creates review drafts only from supplied notes and title facts', async () => {
    const result = await new GroundedAiProvider().reviewDraft({
      title: 'Example Film',
      releaseYear: 2024,
      notes: 'The performances felt honest',
      style: 'SOCIAL_CAPTION',
      containsSpoilers: false,
    });

    expect(result.draft).toContain('Example Film (2024)');
    expect(result.draft).toContain('The performances felt honest.');
    expect(result).toMatchObject({ source: 'LOCAL_GROUNDED', requiresApproval: true });
  });
});
