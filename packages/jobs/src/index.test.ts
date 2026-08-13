import { describe, expect, it } from 'vitest';

import { isJobName } from './index.js';

describe('job contracts', () => {
  it('rejects unknown outbox event types', () => {
    expect(isJobName('data.export')).toBe(true);
    expect(isJobName('unregistered.event')).toBe(false);
  });
});
