import type { AdvancedFeatureKey } from '@cinewrapped/shared-types';
import { describe, expect, it } from 'vitest';

import { evaluateFeatureFlag, rolloutBucket } from '../src/feature-flags/feature-flags.service.js';

const key: AdvancedFeatureKey = 'MOVIE_JOURNAL';

describe('feature flag evaluation', () => {
  it('defaults closed when a definition is absent or disabled', () => {
    expect(evaluateFeatureFlag(undefined, 'user-1', 'production', key)).toEqual({
      enabled: false,
      source: 'DEFAULT',
    });
  });

  it('lets a current user override win over global state', () => {
    expect(
      evaluateFeatureFlag(
        {
          key,
          enabled: false,
          rolloutPercentage: 0,
          environments: [],
          overrides: [{ enabled: true }],
        },
        'user-1',
        'production',
        key,
      ),
    ).toEqual({ enabled: true, source: 'USER_OVERRIDE' });
  });

  it('uses a stable bucket for percentage rollouts', () => {
    expect(rolloutBucket('user-1', key)).toBe(rolloutBucket('user-1', key));
    expect(rolloutBucket('user-1', key)).toBeGreaterThanOrEqual(0);
    expect(rolloutBucket('user-1', key)).toBeLessThan(100);
  });

  it('limits rollouts to configured environments', () => {
    expect(
      evaluateFeatureFlag(
        { key, enabled: true, rolloutPercentage: 100, environments: ['staging'], overrides: [] },
        'user-1',
        'production',
        key,
      ),
    ).toEqual({ enabled: false, source: 'DEFAULT' });
  });
});
