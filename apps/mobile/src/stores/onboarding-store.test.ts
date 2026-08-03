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

  it('hydrates a profile only once even when the screen remounts', () => {
    const user = {
      id: 'user-1',
      username: 'user_generated',
      displayName: 'Andy',
      avatarUrl: null,
      version: 2,
    };
    useOnboardingStore.getState().hydrateProfile(user);
    const hydrated = useOnboardingStore.getState();
    expect(hydrated).toMatchObject({
      hydratedUserId: 'user-1',
      username: '',
      displayName: 'Andy',
      profileVersion: 2,
    });

    useOnboardingStore.getState().hydrateProfile({ ...user, displayName: 'Changed', version: 3 });
    expect(useOnboardingStore.getState()).toBe(hydrated);
  });
});
