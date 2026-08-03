import { beforeEach, describe, expect, it } from 'vitest';

import { useOnboardingStore } from './onboarding-store';

describe('onboarding store', () => {
  beforeEach(() => useOnboardingStore.getState().reset());

  it('keeps selections across ordered wizard steps and can reset safely', () => {
    useOnboardingStore.getState().patch({ step: 3, genreIds: ['genre-1'], profileVersion: 4 });
    expect(useOnboardingStore.getState()).toMatchObject({
      step: 3,
      genreIds: ['genre-1'],
      profileVersion: 4,
    });
    useOnboardingStore.getState().reset();
    expect(useOnboardingStore.getState()).toMatchObject({
      step: 0,
      genreIds: [],
      profileVersion: 1,
    });
  });
});
